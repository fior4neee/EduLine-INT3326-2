// Catalog courses for the "Khóa học" tab, one per VMLU topic. Course content is
// in data/courses/*.json (lesson text written from open textbooks, credited at
// the end of each lesson). Each course ends with a quiz built from the VMLU
// questions of its topic (dev + valid splits, the ones with an answer key).
// Safe to run more than once: existing course slugs and usernames are skipped.
// Usage: npm run seed:catalog   (after `npm run seed`)
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DifficultyLevel, LessonType, PrismaClient } from '@prisma/client';
import { hashSecret } from '../src/common/security/hashing';
import { loadVmlu } from '../test/helpers/vmlu';

const prisma = new PrismaClient();
const COURSES_DIR = join(__dirname, '../../data/courses');
const INSTRUCTOR_PASSWORD = 'Instructor#2026';

// Same accounts as seed-demo.ts, so either script can run first.
const INSTRUCTORS = [
  { username: 'minh.nguyen', firstName: 'Minh', lastName: 'Nguyễn Văn', email: 'minh.nguyen@eduline.local' },
  { username: 'anh.tran', firstName: 'Anh', lastName: 'Trần Hoàng', email: 'anh.tran@eduline.local' },
  { username: 'bao.le', firstName: 'Bảo', lastName: 'Lê Quốc', email: 'bao.le@eduline.local' },
  { username: 'ha.pham', firstName: 'Hà', lastName: 'Phạm Thu', email: 'ha.pham@eduline.local' },
];

interface LessonFile {
  title: string;
  type: Extract<LessonType, 'Video' | 'Text' | 'Quiz'>;
  minutes: number;
  isPreview?: boolean;
  text?: string;
  quizTitle?: string;
}
interface CourseFile {
  slug: string;
  title: string;
  shortSummary: string;
  category: string;
  difficultyLevel: DifficultyLevel;
  instructor: string;
  thumbnailUrl: string;
  hasCertificate: boolean;
  welcomeMessage: string;
  vmluSubject: string;
  sources: { title: string; author: string; url: string; license: string }[];
  modules: { title: string; lessons: LessonFile[] }[];
}

function credits(c: CourseFile): string {
  const lines = c.sources.map((s) => `• ${s.title} – ${s.author} (${s.license}): ${s.url}`);
  return `\n\n———\nNguồn tham khảo:\n${lines.join('\n')}`;
}

async function main(): Promise<void> {
  const instructorIds = new Map<string, string>();
  for (const i of INSTRUCTORS) {
    const user =
      (await prisma.user.findUnique({ where: { username: i.username } })) ??
      (await prisma.user.create({
        data: {
          ...i,
          accountType: 'Instructor',
          passwordHash: await hashSecret(INSTRUCTOR_PASSWORD),
          isVerified: true,
        },
      }));
    instructorIds.set(i.username, user.id);
  }

  const questions = [...loadVmlu('dev'), ...loadVmlu('valid')].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const files = readdirSync(COURSES_DIR).filter((f) => f.endsWith('.json'));

  let created = 0;
  for (const file of files) {
    const c = JSON.parse(readFileSync(join(COURSES_DIR, file), 'utf8')) as CourseFile;
    if (await prisma.course.findUnique({ where: { slug: c.slug } })) {
      console.log(`  skip ${c.slug} (already exists)`);
      continue;
    }
    const instructorId = instructorIds.get(c.instructor);
    if (!instructorId) throw new Error(`${file}: unknown instructor ${c.instructor}`);
    const quizQuestions = questions.filter((q) => q.subject === c.vmluSubject);
    if (quizQuestions.length === 0) throw new Error(`${file}: no VMLU questions for ${c.vmluSubject}`);

    await prisma.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: {
          slug: c.slug,
          title: c.title,
          shortSummary: c.shortSummary,
          category: c.category,
          thumbnailUrl: c.thumbnailUrl,
          difficultyLevel: c.difficultyLevel,
          visibility: 'Public',
          hasCertificate: c.hasCertificate,
          welcomeMessage: c.welcomeMessage,
          instructors: { create: { instructorId } },
        },
      });
      for (const [mi, m] of c.modules.entries()) {
        const mod = await tx.module.create({
          data: { courseId: course.id, title: m.title, sortOrder: mi + 1 },
        });
        for (const [li, l] of m.lessons.entries()) {
          const lesson = await tx.lesson.create({
            data: {
              moduleId: mod.id,
              courseId: course.id,
              title: l.title,
              slug: `${mi + 1}-${li + 1}`,
              type: l.type,
              sortOrder: li + 1,
              estimatedDurationMinutes: l.minutes,
              isPreview: l.isPreview ?? false,
              textContent: l.type === 'Text' ? `${l.text ?? ''}${credits(c)}` : null,
            },
          });
          if (l.type === 'Quiz') {
            await tx.quiz.create({
              data: {
                lessonId: lesson.id,
                courseId: course.id,
                title: l.quizTitle ?? l.title,
                passingScorePercentage: 70,
                questions: {
                  create: quizQuestions.map((q, i) => ({
                    questionText: q.questionText,
                    options: q.options,
                    correctOptionIndex: q.correctOptionIndex,
                    points: 10,
                    sortOrder: i + 1,
                  })),
                },
              },
            });
          }
        }
      }
    });
    const lessons = c.modules.reduce((n, m) => n + m.lessons.length, 0);
    console.log(`  created ${c.slug}: ${lessons} lessons, quiz with ${quizQuestions.length} VMLU questions`);
    created++;
  }

  console.log(`Catalog ready. ${created} new course(s) from ${files.length} file(s).`);
  console.log(`  Instructors: ${INSTRUCTORS.map((i) => i.username).join(', ')} / ${INSTRUCTOR_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
