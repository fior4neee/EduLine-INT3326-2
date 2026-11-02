# Quiz Attempt and Submission: Concurrency Design (M1, Week 6)

Goal: during the load test (500 students submitting at the same time, several Cloud Run instances) every attempt is scored **exactly once**, nobody exceeds `maxAttempts`, and a double-click or retry never produces two different results.

Models used (`schema.prisma`): `Quiz`, `Question` (`options[]`, `correctOptionIndex`, `points`), `QuizAttempt` (`status`, `score`, `maxScore`, `passed`, `startedAt`, `expiresAt`, `submittedAt`), `AttemptAnswer` (unique `attemptId + questionId`).

Ownership: M2 owns the endpoints and transactions. M3 owns `ScoringService.score(questions, answers)`, a **pure function** with no database access, so it can be unit tested on its own.

## 1. Races to handle

| # | Race | What goes wrong without a guard |
|---|---|---|
| R1 | Double-click "Submit", two tabs, client retry after timeout | Attempt scored twice, `score` overwritten, `QUIZ_SUBMITTED` published twice |
| R2 | Two "Start quiz" requests at once | Two `InProgress` attempts; `maxAttempts` check passes twice |
| R3 | "Save answers" arrives after "Submit" | Answer changed after scoring |
| R4 | Answer saved after `expiresAt` | Extra time for students who call the API directly |
| R5 | Instance dies mid-submit | Half-written score |

## 2. Database rules

**One open attempt per student per quiz.** Prisma cannot express a partial unique index in `schema.prisma`, so add it as raw SQL in the migration file (`prisma migrate dev --create-only`, then edit):

```sql
CREATE UNIQUE INDEX quiz_attempts_one_open_per_user
  ON quiz_attempts (quiz_id, user_id)
  WHERE status = 'InProgress';
```

This is the only raw SQL. It lives in a reviewed migration, not in application code.

## 3. Endpoint behaviour

### Start: `POST /quizzes/:id/attempts`

1. `AccessPolicy.canParticipate(user, course)`, else 403.
2. If an `InProgress` attempt exists and is not expired → return it (**200**, resume). Starting is idempotent.
3. Count `Submitted` attempts; if `maxAttempts` is set and count ≥ `maxAttempts` → **422 `MAX_ATTEMPTS_REACHED`**.
4. Insert the attempt with `expiresAt = now + timeLimitMinutes` (null when untimed).
5. Unique violation (Prisma `P2002`) from the index above = a concurrent start won the race → read and return that attempt (**200**).

Because of the index, at most one attempt can be open, so the count in step 3 can be wrong by at most the one attempt being finished right now. That is acceptable for the MVP.

### Save answers: `PUT /attempts/:id/answers`

```ts
// Only touch an attempt that belongs to the caller, is still open, and is not past its deadline.
const open = await tx.quizAttempt.findFirst({
  where: { id, userId: user.id, status: 'InProgress',
           OR: [{ expiresAt: null }, { expiresAt: { gt: new Date(Date.now() - GRACE_MS) } }] },
});
if (!open) throw notFoundOrClosed(); // 404 if not theirs, 409 ATTEMPT_CLOSED otherwise
// upsert on the (attemptId, questionId) unique key → saving the same answer twice is harmless
```

- Validate `questionId` belongs to this quiz and `0 ≤ selectedOptionIndex < options.length`.
- `GRACE_MS` = 30 s for network delay.

### Submit: `POST /attempts/:id/submit`

The **conditional update is the lock**. In PostgreSQL an `UPDATE … WHERE status = 'InProgress'` takes a row lock; a second concurrent update waits, then re-checks the `WHERE` after the first commits, finds `Submitted`, and updates 0 rows. No `SELECT … FOR UPDATE` and no raw SQL needed.

```ts
return prisma.$transaction(async (tx) => {
  // 1. Claim the attempt. Only one request can move it out of InProgress.
  const claimed = await tx.quizAttempt.updateMany({
    where: { id, userId: user.id, status: 'InProgress' },
    data:  { status: 'Submitted', submittedAt: new Date() },
  });

  if (claimed.count === 0) {
    const existing = await tx.quizAttempt.findFirst({ where: { id, userId: user.id } });
    if (!existing) throw new NotFoundException();
    return toResult(existing);            // already submitted → same result, 200 (idempotent)
  }

  // 2. Score with the answers saved so far (M3, pure function).
  const attempt = await tx.quizAttempt.findUniqueOrThrow({
    where: { id },
    include: { quiz: { include: { questions: true } }, answers: true },
  });
  const quiz = attempt.quiz;
  const r = scoring.score(quiz.questions, attempt.answers); // { perAnswer[], score, maxScore }

  // 3. Write points per answer and the totals.
  for (const a of r.perAnswer) {
    await tx.attemptAnswer.update({ where: { id: a.id }, data: { pointsAwarded: a.points } });
  }
  return tx.quizAttempt.update({
    where: { id },
    data: { score: r.score, maxScore: r.maxScore,
            passed: r.score * 100 >= quiz.passingScorePercentage * r.maxScore }, // integer math
  });
}, { timeout: 5000 });
// After commit (not inside the transaction): publish QUIZ_SUBMITTED for M3 analytics.
```

Rules:
- Submitting after `expiresAt` is **allowed**: it finalizes with the answers saved before the deadline (R4 is blocked at save time).
- Unanswered questions score 0 and still count in `maxScore`.
- Keep the transaction short: no HTTP calls, no Pub/Sub publish, no email inside it. Holding a DB connection while waiting on the network is what kills throughput at 500 users.
- If the process dies before commit, PostgreSQL rolls back. The attempt is still `InProgress` and the student can submit again (R5).

### Expired attempts nobody submitted

No cron job. **Lazy finalize:** when a student starts a new attempt or opens results and an `InProgress` attempt is past `expiresAt + GRACE`, run the same submit transaction for it first.

## 4. How each race is handled

| Race | Guard |
|---|---|
| R1 double submit | Conditional `updateMany` → second call gets the stored result |
| R2 double start | Partial unique index + catch `P2002` |
| R3 save after submit | Save checks `status = 'InProgress'` |
| R4 late save | Save checks `expiresAt + GRACE` |
| R5 crash | Single transaction, rollback |

## 5. Tests (Jest + Supertest, against docker-compose Postgres)

| ID | Scenario | Expected |
|---|---|---|
| Q01 | Fire 10 parallel `submit` for one attempt (`Promise.all`) | All 200, identical `score`; `submittedAt` set once; 1 `QUIZ_SUBMITTED` event |
| Q02 | Fire 5 parallel `start` | All return the same attempt id; 1 row `InProgress` |
| Q03 | `maxAttempts = 2`, submit 2, start again | 422 `MAX_ATTEMPTS_REACHED` |
| Q04 | Save answer after submit | 409 `ATTEMPT_CLOSED` |
| Q05 | Timed quiz, save at `expiresAt + 31 s` | 409 |
| Q06 | Submit after expiry with 3/5 answers saved | 200, scored on 3 answers |
| Q07 | Student B submits student A's attempt | 404 |
| Q08 | `GET /quizzes/:id` as student | No `correctOptionIndex` in the JSON |
| Q09 | ScoringService unit: all correct / all wrong / empty / passing boundary 80% | Exact integers |

## 6. Load-test notes for week 9

- A submit is about 4–6 queries inside one transaction. The connection pool size per instance (see [capacity-and-load-test.md](capacity-and-load-test.md)) caps how many submits run at once per instance; the rest wait in Prisma's queue, which shows up as latency, not errors.
- Watch `P2034` (serialization/deadlock) and `P2024` (pool timeout) in logs during the test.
