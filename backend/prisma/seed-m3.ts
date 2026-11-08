// M3 test data built from the files in /data: a course with a video lesson, text
// lessons (passages from ViSQuAD) and one quiz per VMLU subject (dev split, which
// has the answer key). Safe to run more than once: the course is skipped if it exists.
// Usage: npm run seed:m3   (after `npm run seed`)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { hashSecret } from '../src/common/security/hashing';
import { vmluBySubject } from '../test/helpers/vmlu';

const prisma = new PrismaClient();
const PASSWORD = 'Student#2026';
const SLUG = 'm3-kinh-te-vi-mo-vmlu';
const QUIZ_SUBJECTS = ['28', '29', '30']; // three VMLU subjects → three quizzes

async function user(
  username: string,
  firstName: string,
  lastName: string,
  accountType: 'Instructor' | 'Student',
) {
  return (
    (await prisma.user.findUnique({ where: { username } })) ??
    prisma.user.create({
      data: {
        username,
        firstName,
        lastName,
        email: `${username}@eduline.local`,
        accountType,
        passwordHash: await hashSecret(PASSWORD),
        isVerified: true,
      },
    })
  );
}

async function main() {
  if (await prisma.course.findUnique({ where: { slug: SLUG } })) {
    console.log(`Course ${SLUG} already exists, nothing to do.`);
    return;
  }
  const teacher = await user('m3.instructor', 'M3', 'Giảng Viên', 'Instructor');
  const student = await user('m3.student', 'M3', 'Học Viên', 'Student');

  const squad = JSON.parse(
    readFileSync(
      join(__dirname, '../../data/vmlu_squad_v1/vi_squad_benchmark_question_only.json'),
      'utf8',
    ),
  ) as { data: { question: string; context: string }[] };
  const passage = (i: number) => squad.data[i].context;

  const course = await prisma.course.create({
    data: {
      slug: SLUG,
      title: 'Kinh tế vĩ mô (dữ liệu VMLU, test M3)',
      shortSummary: 'Khóa học để thử tiến độ, chấm quiz và thống kê. Câu hỏi lấy từ VMLU dev.',
      category: 'Kinh tế',
      difficultyLevel: 'College',
      visibility: 'Public',
      instructors: { create: { instructorId: teacher.id } },
      modules: {
        create: [
          { title: 'Chương 1: Học liệu', sortOrder: 1 },
          { title: 'Chương 2: Kiểm tra', sortOrder: 2 },
        ],
      },
    },
    include: { modules: { orderBy: { sortOrder: 'asc' } } },
  });
  const [m1, m2] = course.modules;

  let sort = 0;
  const lesson = (
    moduleId: number,
    title: string,
    type: 'Video' | 'Text' | 'Document' | 'Quiz',
    extra = {},
  ) =>
    prisma.lesson.create({
      data: {
        moduleId,
        courseId: course.id,
        title,
        slug: `l${++sort}-${type.toLowerCase()}`,
        type,
        sortOrder: sort,
        ...extra,
      },
    });

  await lesson(m1.id, 'Video: Tổng quan kinh tế vĩ mô', 'Video', { estimatedDurationMinutes: 10 });
  await lesson(m1.id, 'Đọc: Bài 1', 'Text', { textContent: passage(0) });
  await lesson(m1.id, 'Đọc: Bài 2', 'Text', { textContent: passage(1) });
  await lesson(m1.id, 'Tài liệu tham khảo', 'Document');

  const subjects = vmluBySubject('dev');
  let questions = 0;
  for (const id of QUIZ_SUBJECTS) {
    const qs = subjects.get(id) ?? [];
    const slot = await lesson(m2.id, `Quiz VMLU môn ${id}`, 'Quiz');
    await prisma.quiz.create({
      data: {
        lessonId: slot.id,
        courseId: course.id,
        title: `VMLU môn ${id}`,
        passingScorePercentage: 80,
        questions: {
          create: qs.map((q, i) => ({
            questionText: q.questionText,
            options: q.options,
            correctOptionIndex: q.correctOptionIndex,
            points: 10,
            sortOrder: i + 1,
          })),
        },
      },
    });
    questions += qs.length;
  }
  await prisma.enrollment.create({ data: { userId: student.id, courseId: course.id } });

  console.log(
    `Created course ${SLUG} (id ${course.id}): ${sort} lessons, ${QUIZ_SUBJECTS.length} quizzes, ${questions} questions.`,
  );
  console.log(`  instructor: ${teacher.username} / ${PASSWORD}`);
  console.log(`  student:    ${student.username} / ${PASSWORD} (already enrolled)`);
}

main().finally(() => prisma.$disconnect());
