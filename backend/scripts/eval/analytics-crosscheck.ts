// Eval 3 (docs/m3-plan.md §7.3): AnalyticsService against hand-written SQL.
//   DATABASE_URL=...eduline_test npx ts-node --transpile-only scripts/eval/analytics-crosscheck.ts [--students 30] [--seed 11]
// Seeds one course with VMLU quizzes and simulated students (finished, part way,
// dropped, suspended, late), then compares every number the dashboard returns.
import './test-env';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/database/prisma.service';
import { AnalyticsService } from '../../src/modules/analytics/analytics.service';
import { CourseStudentsQueryDto } from '../../src/modules/enrollments/dto/enrollment.dto';
import { enroll, makeCourse, makeQuiz, makeUser, resetDatabase } from '../../test/helpers/app';
import { vmluBySubject } from '../../test/helpers/vmlu';
import { arg, mulberry32, Report } from './lib';

const N = Number(arg('students', '30'));
const rand = mulberry32(Number(arg('seed', '11')));
const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
const days = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
    abortOnError: false,
  });
  const prisma = app.get(PrismaService);
  const analytics = app.get(AnalyticsService);
  await resetDatabase(prisma);

  const admin = await makeUser(prisma, 'Admin');
  const instructor = await makeUser(prisma, 'Instructor');
  const { course, lessons } = await makeCourse(prisma, instructor, [
    'Video',
    'Text',
    'Quiz',
    'Quiz',
    'Assignment',
    'Document',
  ]);
  const subjects = [...vmluBySubject('dev').entries()];
  const quizzes = [
    await makeQuiz(prisma, course.id, lessons[2].id, subjects[0][1], 80),
    await makeQuiz(prisma, course.id, lessons[3].id, subjects[1][1], 60),
  ];
  const assignment = await prisma.assignment.create({
    data: {
      courseId: course.id,
      lessonId: lessons[4].id,
      title: 'Script',
      instructions: 'x',
      dueAt: days(3),
    },
  });

  for (let i = 0; i < N; i++) {
    const s = await makeUser(prisma);
    const kind = pick(['finisher', 'partial', 'partial', 'dropped', 'suspended', 'idle']);
    await enroll(
      prisma,
      s,
      course.id,
      kind === 'finisher'
        ? 'Completed'
        : kind === 'dropped'
          ? 'Dropped'
          : kind === 'suspended'
            ? 'Suspended'
            : 'Active',
    );
    if (kind === 'idle' || kind === 'dropped') continue;
    const done = kind === 'finisher' ? lessons : lessons.filter(() => rand() < 0.5);
    for (const l of done) {
      const when = days(Math.floor(rand() * 14));
      await prisma.lessonProgress.create({
        data: {
          userId: s.id,
          lessonId: l.id,
          courseId: course.id,
          percent: 100,
          completedAt: when,
          updatedAt: when,
        },
      });
    }
    for (const q of quizzes) {
      for (let a = Math.floor(rand() * 3); a > 0; a--) {
        const total = q.questions.length * 10;
        const score = Math.floor(rand() * (q.questions.length + 1)) * 10;
        await prisma.quizAttempt.create({
          data: {
            quizId: q.id,
            userId: s.id,
            status: 'Submitted',
            submittedAt: days(Math.floor(rand() * 14)),
            score,
            maxScore: total,
            passed: score * 100 >= q.passingScorePercentage * total,
          },
        });
      }
      if (rand() < 0.2) await prisma.quizAttempt.create({ data: { quizId: q.id, userId: s.id } }); // unfinished
    }
    if (rand() < 0.6) {
      const late = rand() < 0.3;
      await prisma.submission.create({
        data: {
          assignmentId: assignment.id,
          userId: s.id,
          fileKey: 'k',
          fileName: 'a.py',
          sizeBytes: 1,
          mimeType: 'text/x-python',
          isLate: late,
          status: rand() < 0.5 ? 'Graded' : 'Submitted',
          submittedAt: days(Math.floor(rand() * 14)),
        },
      });
    }
  }

  const user = { id: admin.id, accountType: 'Admin' as const, sessionId: 'eval' };
  await analytics.overview(user, course.id); // warm up the connection
  const t0 = performance.now();
  const api = await analytics.overview(user, course.id);
  const ms = performance.now() - t0;
  const report = new Report();
  const cid = course.id;

  // ── Course totals ──
  const sqlStatus = await prisma.$queryRaw<
    { status: string; n: bigint }[]
  >`SELECT status::text, count(*) n FROM enrollments WHERE course_id = ${cid} GROUP BY status`;
  const want = {
    Active: 0,
    Completed: 0,
    Suspended: 0,
    Dropped: 0,
    ...Object.fromEntries(sqlStatus.map((r) => [r.status, Number(r.n)])),
  };
  report.add(
    'enrollments by status',
    JSON.stringify(api.enrollmentsByStatus) ===
      JSON.stringify({
        Active: want.Active,
        Completed: want.Completed,
        Suspended: want.Suspended,
        Dropped: want.Dropped,
      }),
    JSON.stringify(api.enrollmentsByStatus),
  );

  const [avg] = await prisma.$queryRaw<{ v: unknown }[]>`
    SELECT round(avg(CASE WHEN e.status = 'Completed' THEN 100 ELSE floor(100.0 * coalesce(d.n, 0) / t.n) END)) v
    FROM enrollments e
    CROSS JOIN (SELECT count(*) n FROM lessons WHERE course_id = ${cid}) t
    LEFT JOIN (SELECT user_id, count(*) n FROM lesson_progress WHERE course_id = ${cid} AND completed_at IS NOT NULL GROUP BY user_id) d ON d.user_id = e.user_id
    WHERE e.course_id = ${cid} AND e.status IN ('Active', 'Completed')`;
  report.add(
    'average progress',
    api.averageProgressPercentage === num(avg.v),
    `api ${api.averageProgressPercentage}, sql ${num(avg.v)}`,
  );

  const [rate] = await prisma.$queryRaw<{ v: unknown }[]>`
    SELECT round(100.0 * count(*) FILTER (WHERE status = 'Completed') / nullif(count(*) FILTER (WHERE status IN ('Active', 'Completed')), 0)) v FROM enrollments WHERE course_id = ${cid}`;
  report.add(
    'completion rate',
    api.completionRatePercentage === num(rate.v),
    `api ${api.completionRatePercentage}, sql ${num(rate.v)}`,
  );

  const [active] = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(DISTINCT u) n FROM (
      SELECT user_id u FROM lesson_progress WHERE course_id = ${cid} AND updated_at >= now() - interval '7 days'
      UNION ALL SELECT a.user_id FROM quiz_attempts a JOIN quizzes q ON q.id = a.quiz_id WHERE q.course_id = ${cid} AND a.submitted_at >= now() - interval '7 days'
      UNION ALL SELECT s.user_id FROM submissions s JOIN assignments x ON x.id = s.assignment_id WHERE x.course_id = ${cid} AND s.submitted_at >= now() - interval '7 days'
    ) t`;
  report.add(
    'active students, last 7 days',
    api.activeStudentsLast7Days === Number(active.n),
    `api ${api.activeStudentsLast7Days}, sql ${Number(active.n)}`,
  );

  // ── Per quiz ──
  let quizOk = true;
  for (const q of api.quizzes) {
    const id = Number(q.quizId.replace('qz_', ''));
    const [r] = await prisma.$queryRaw<{ n: bigint; avg: unknown; pass: unknown }[]>`
      SELECT count(*) n, round(100.0 * sum(score) / nullif(sum(max_score), 0)) avg,
             round(100.0 * count(*) FILTER (WHERE passed) / nullif(count(*), 0)) pass
      FROM quiz_attempts WHERE quiz_id = ${id} AND status = 'Submitted'`;
    if (
      q.attempts !== Number(r.n) ||
      q.averageScorePercentage !== num(r.avg) ||
      q.passRatePercentage !== num(r.pass)
    ) {
      quizOk = false;
      console.log(
        `  quiz ${q.quizId}: api ${q.attempts}/${q.averageScorePercentage}/${q.passRatePercentage}, sql ${r.n}/${r.avg}/${r.pass}`,
      );
    }
  }
  report.add('per-quiz attempts, average, pass rate', quizOk, `${api.quizzes.length} quizzes`);

  // ── Per assignment ──
  const [as] = await prisma.$queryRaw<{ n: bigint; g: bigint; l: bigint }[]>`
    SELECT count(*) n, count(*) FILTER (WHERE status = 'Graded') g, count(*) FILTER (WHERE is_late) l FROM submissions WHERE assignment_id = ${assignment.id}`;
  const a = api.assignments[0];
  report.add(
    'per-assignment submitted, graded, late',
    a.submitted === Number(as.n) && a.graded === Number(as.g) && a.late === Number(as.l),
    `api ${a.submitted}/${a.graded}/${a.late}, sql ${as.n}/${as.g}/${as.l}`,
  );

  // ── Student list, every row ──
  const list = await analytics.students(
    user,
    course.id,
    Object.assign(new CourseStudentsQueryDto(), { page: 1, pageSize: 100 }),
  );
  const sqlRows = await prisma.$queryRaw<
    { user_id: string; progress: unknown; quiz: unknown; subs: bigint }[]
  >`
    SELECT e.user_id,
      CASE WHEN e.status = 'Completed' THEN 100 ELSE floor(100.0 * coalesce((SELECT count(*) FROM lesson_progress p WHERE p.user_id = e.user_id AND p.course_id = ${cid} AND p.completed_at IS NOT NULL), 0) / (SELECT count(*) FROM lessons WHERE course_id = ${cid})) END progress,
      (SELECT round(100.0 * sum(score) / nullif(sum(max_score), 0)) FROM quiz_attempts a JOIN quizzes q ON q.id = a.quiz_id WHERE a.user_id = e.user_id AND q.course_id = ${cid} AND a.status = 'Submitted') quiz,
      (SELECT count(*) FROM submissions s JOIN assignments x ON x.id = s.assignment_id WHERE s.user_id = e.user_id AND x.course_id = ${cid}) subs
    FROM enrollments e WHERE e.course_id = ${cid}`;
  const bySql = new Map(sqlRows.map((r) => [r.user_id, r]));
  let rowsOk = list.data.length === sqlRows.length;
  for (const row of list.data) {
    const r = bySql.get(row.student.id);
    if (
      !r ||
      row.progressPercentage !== num(r.progress) ||
      row.quizAvgScorePercentage !== num(r.quiz) ||
      row.submissionsCount !== Number(r.subs)
    ) {
      rowsOk = false;
      console.log(
        `  student ${row.student.username}: api ${row.progressPercentage}/${row.quizAvgScorePercentage}/${row.submissionsCount}, sql ${r?.progress}/${r?.quiz}/${r?.subs}`,
      );
    }
  }
  report.add('every student row', rowsOk, `${list.data.length} of ${sqlRows.length} rows`);
  report.add(
    'overview response time',
    ms < 200,
    `${ms.toFixed(0)} ms (limit 200 ms) with ${N} students and ${quizzes.length} quizzes`,
  );
  await app.close();
  report.finish();
}
void main();
