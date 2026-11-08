// Eval 1 (docs/m3-plan.md §7.1): scoring on every VMLU subject.
//   npx ts-node --transpile-only scripts/eval/scoring-vmlu.ts [--split dev,valid] [--seed 42] [--reps 50]
// No database needed. Each subject becomes a quiz, five kinds of simulated student
// answer it, and ScoringService is compared with a reference that just counts right answers.
import { ScoringService } from '../../src/modules/scoring/scoring.service';
import { vmluBySubject } from '../../test/helpers/vmlu';
import { arg, mulberry32, Report } from './lib';

const splits = arg('split', 'dev,valid').split(',') as ('dev' | 'valid')[];
const seed = Number(arg('seed', '42'));
const reps = Number(arg('reps', '50'));
const POINTS = 10;
const PASS = 80;
const svc = new ScoringService();
const report = new Report();
const rand = mulberry32(seed);

for (const split of splits) {
  const subjects = vmluBySubject(split);
  let attempts = 0,
    scoreMatch = 0,
    passMatch = 0;
  let randomRight = 0,
    randomTotal = 0,
    expectedRight = 0;

  for (const qs of subjects.values()) {
    const questions = qs.map((q, i) => ({
      id: i + 1,
      correctOptionIndex: q.correctOptionIndex,
      points: POINTS,
    }));
    const n = questions.length;
    const wrong = (i: number) => (qs[i].correctOptionIndex + 1) % qs[i].options.length;
    const needed = Math.ceil((PASS * n) / 100); // fewest right answers that reach 80 %

    const students: { name: string; pick: (i: number) => number | null; right: number }[] = [
      { name: 'all right', pick: (i) => qs[i].correctOptionIndex, right: n },
      { name: 'all wrong', pick: wrong, right: 0 },
      { name: 'blank', pick: () => null, right: 0 },
      {
        name: 'at the threshold',
        pick: (i) => (i < needed ? qs[i].correctOptionIndex : wrong(i)),
        right: needed,
      },
      {
        name: 'one short',
        pick: (i) => (i < needed - 1 ? qs[i].correctOptionIndex : wrong(i)),
        right: needed - 1,
      },
    ];
    for (const s of students) {
      const answers = questions.map((q, i) => ({
        id: i + 1,
        questionId: q.id,
        selectedOptionIndex: s.pick(i),
      }));
      const r = svc.score(questions, answers);
      const refScore = s.right * POINTS;
      const refPassed = s.right * 5 >= n * 4; // 80 % written as 4/5, independent of the service
      attempts++;
      if (r.score === refScore && r.maxScore === n * POINTS) scoreMatch++;
      else
        console.log(
          `  score mismatch: ${s.name}, ${n} questions: got ${r.score}/${r.maxScore}, want ${refScore}/${n * POINTS}`,
        );
      if (svc.isPassed(r.score, r.maxScore, PASS) === refPassed) passMatch++;
      else console.log(`  passed mismatch: ${s.name}, ${n} questions`);
    }

    // A student who guesses: accuracy should sit near 1 / (number of options).
    for (let rep = 0; rep < reps; rep++) {
      const answers = questions.map((q, i) => ({
        id: i + 1,
        questionId: q.id,
        selectedOptionIndex: Math.floor(rand() * qs[i].options.length),
      }));
      randomRight += svc.score(questions, answers).score / POINTS;
      randomTotal += n;
    }
    expectedRight += qs.reduce((sum, q) => sum + 1 / q.options.length, 0) * reps;
  }

  const acc = (100 * randomRight) / randomTotal;
  const exp = (100 * expectedRight) / randomTotal;
  const total = [...subjects.values()].reduce((n, q) => n + q.length, 0);
  report.add(
    `${split} score`,
    scoreMatch === attempts,
    `${scoreMatch}/${attempts} match (${subjects.size} quizzes, ${total} questions)`,
  );
  report.add(`${split} passed`, passMatch === attempts, `${passMatch}/${attempts} match`);
  report.add(
    `${split} random student`,
    Math.abs(acc - exp) <= 3,
    `accuracy ${acc.toFixed(1)}% vs expected ${exp.toFixed(1)}% over ${reps} runs`,
  );
}
report.finish();
