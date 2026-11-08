// Eval 2 (docs/m3-plan.md §7.2): replay random heartbeat sequences into ProgressService.
//   DATABASE_URL=...eduline_test npx ts-node --transpile-only scripts/eval/progress-replay.ts [--sequences 200] [--seed 7]
// Every sequence is checked against a plain in-memory model of the rules.
import './test-env';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/database/prisma.service';
import { ProgressService } from '../../src/modules/progress/progress.service';
import { enroll, makeCourse, makeUser, resetDatabase } from '../../test/helpers/app';
import { arg, mulberry32, Report } from './lib';

const SEQUENCES = Number(arg('sequences', '200'));
const rand = mulberry32(Number(arg('seed', '7')));
const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
    abortOnError: false,
  });
  const prisma = app.get(PrismaService);
  const progress = app.get(ProgressService);
  await resetDatabase(prisma);

  const instructor = await makeUser(prisma, 'Instructor');
  const { course, lessons } = await makeCourse(prisma, instructor, ['Video', 'Text']);
  const [video, text] = lessons;

  // The model the service is checked against, written out on its own.
  const modelPercent = (pos: number, dur: number) => Math.floor((Math.min(pos, dur) * 100) / dur);
  const DONE_AT = 90;

  const ok = { percent: 0, monotonic: 0, completedOnce: 0, resume: 0, course: 0 };
  let sequential = 0;
  let steps = 0;

  for (let s = 0; s < SEQUENCES; s++) {
    const student = await makeUser(prisma);
    await enroll(prisma, student, course.id);
    const user = { id: student.id, accountType: 'Student' as const, sessionId: 'eval' };
    const duration = int(60, 3600);
    // Forward, backward and slightly past the end, plus one duplicate.
    const positions = Array.from({ length: int(5, 30) }, () =>
      rand() < 0.1 ? duration + int(0, 5) : int(0, duration),
    );
    positions.push(positions[int(0, positions.length - 1)]);
    const send = (p: number) =>
      progress.reportVideoProgress(user, video.id, {
        positionSeconds: p,
        durationSeconds: duration,
      });
    const model = Math.max(...positions.map((p) => modelPercent(p, duration)));

    // Every tenth sequence arrives all at once, in any order: only the end state is checked.
    // The others are checked after every heartbeat.
    let monotonic = true;
    let completedOnce = true;
    if (s % 10 === 9) {
      await Promise.all(positions.map(send));
    } else {
      sequential++;
      let best = 0;
      let lastPercent = 0;
      let completedAt: Date | null = null;
      let resume = true;
      for (const p of positions) {
        const r = await send(p);
        steps++;
        best = Math.max(best, modelPercent(p, duration));
        if (r.percent < lastPercent) monotonic = false;
        lastPercent = r.percent;
        if ((r.completedAt !== null) !== best >= DONE_AT) completedOnce = false;
        if (completedAt && r.completedAt?.getTime() !== completedAt.getTime())
          completedOnce = false;
        completedAt = r.completedAt ?? completedAt;
        if (r.lastPositionSeconds !== Math.min(p, duration)) resume = false;
      }
      if (resume) ok.resume++;
    }

    const final = await prisma.lessonProgress.findUniqueOrThrow({
      where: { userId_lessonId: { userId: student.id, lessonId: video.id } },
    });
    if (final.percent === model) ok.percent++;
    if (monotonic) ok.monotonic++;
    if (completedOnce && (final.completedAt !== null) === model >= DONE_AT) ok.completedOnce++;

    // Course progress: the video counts once it reached 90 %, the text lesson when marked done.
    const markText = rand() < 0.5;
    if (markText) await progress.completeLesson(user, text.id);
    const done = (model >= DONE_AT ? 1 : 0) + (markText ? 1 : 0);
    const got = await progress.getCourseProgress(user, course.id);
    if (got.progressPercentage === Math.floor((done * 100) / 2)) ok.course++;
  }

  const report = new Report();
  const all = (n: number, of = SEQUENCES) => [n === of, `${n}/${of}`] as const;
  report.add('final percent matches the model', ...all(ok.percent));
  report.add(
    'percent never decreased',
    ok.monotonic === SEQUENCES,
    `${ok.monotonic}/${SEQUENCES} (${steps} heartbeats checked one by one)`,
  );
  report.add('completedAt set once, when 90 % is first reached', ...all(ok.completedOnce));
  report.add('resume point follows the latest heartbeat', ...all(ok.resume, sequential));
  report.add('course percent = floor(done × 100 / total)', ...all(ok.course));
  await app.close();
  report.finish();
}
void main();
