// Demo data for local testing: instructors, a demo student and published
// courses (the four mock courses from the frontend plus a few that exercise
// the enrollment rules). Safe to run more than once: existing usernames and
// course slugs are skipped.
// Usage: npm run seed:demo   (run `npm run seed` first for the Admin account)
import { DifficultyLevel, LessonType, PrismaClient } from '@prisma/client';
import { hashSecret } from '../src/common/security/hashing';

const prisma = new PrismaClient();

const INSTRUCTOR_PASSWORD = 'Instructor#2026';
const STUDENT_PASSWORD = 'Student#2026';
const RESTRICTED_COURSE_PASSWORD = 'Demo#2026';

const INSTRUCTORS = [
  { username: 'minh.nguyen', firstName: 'Minh', lastName: 'Nguyễn Văn', email: 'minh.nguyen@eduline.local' },
  { username: 'anh.tran', firstName: 'Anh', lastName: 'Trần Hoàng', email: 'anh.tran@eduline.local' },
  { username: 'bao.le', firstName: 'Bảo', lastName: 'Lê Quốc', email: 'bao.le@eduline.local' },
  { username: 'ha.pham', firstName: 'Hà', lastName: 'Phạm Thu', email: 'ha.pham@eduline.local' },
];

const STUDENT = { username: 'student.demo', firstName: 'Demo', lastName: 'Học Viên', email: 'student.demo@eduline.local' };

type LessonSeed = [title: string, type: LessonType, minutes: number];
interface CourseSeed {
  slug: string;
  title: string;
  shortSummary: string;
  category: string;
  thumbnailUrl: string;
  difficultyLevel: DifficultyLevel;
  instructor: string;
  visibility: 'Public' | 'Restricted' | 'Draft';
  hasCertificate?: boolean;
  enrollmentOpensAt?: Date;
  prerequisiteSlug?: string;
  modules: Array<{ title: string; lessons: LessonSeed[] }>;
}

const COURSES: CourseSeed[] = [
  {
    slug: 'lap-trinh-web-hien-dai-voi-reactjs',
    title: 'Lập trình Web hiện đại với ReactJS',
    shortSummary: 'Xây dựng giao diện web bằng React: component, state, hooks và gọi API.',
    category: 'Lập trình',
    thumbnailUrl: '/images/courses/reactjs_course.png',
    difficultyLevel: 'College',
    instructor: 'minh.nguyen',
    visibility: 'Public',
    hasCertificate: true,
    modules: [
      { title: 'Chương 1: Làm quen với React', lessons: [['Giới thiệu khóa học', 'Video', 8], ['Cài đặt Node.js và Vite', 'Text', 15], ['Component đầu tiên', 'Video', 20]] },
      { title: 'Chương 2: State và Props', lessons: [['Props là gì', 'Video', 18], ['useState', 'Video', 25], ['Bài tập: Danh sách việc cần làm', 'Text', 30]] },
      { title: 'Chương 3: Hooks và gọi API', lessons: [['useEffect', 'Video', 22], ['Gọi API với Axios', 'Video', 25], ['Tổng kết', 'Text', 10]] },
    ],
  },
  {
    slug: 'nhap-mon-dien-toan-dam-may',
    title: 'Nhập môn Điện toán đám mây',
    shortSummary: 'Các khái niệm cloud cơ bản: IaaS, PaaS, SaaS, lưu trữ, mạng và triển khai ứng dụng.',
    category: 'Cloud Computing',
    thumbnailUrl: '/images/courses/cloud_course.png',
    difficultyLevel: 'College',
    instructor: 'anh.tran',
    visibility: 'Public',
    modules: [
      { title: 'Chương 1: Cloud là gì', lessons: [['Lịch sử điện toán đám mây', 'Video', 12], ['IaaS, PaaS, SaaS', 'Text', 15]] },
      { title: 'Chương 2: Dịch vụ cốt lõi', lessons: [['Máy ảo và container', 'Video', 25], ['Lưu trữ đối tượng', 'Video', 20], ['Mạng và CDN', 'Video', 22]] },
      { title: 'Chương 3: Triển khai', lessons: [['Triển khai ứng dụng lên Cloud Run', 'Video', 30], ['Chi phí và tối ưu', 'Text', 15]] },
    ],
  },
  {
    slug: 'cybersecurity-fundamentals',
    title: 'Cybersecurity Fundamentals',
    shortSummary: 'Nền tảng an ninh mạng: mối đe dọa phổ biến, mật mã học và bảo mật ứng dụng web.',
    category: 'An ninh mạng',
    thumbnailUrl: '/images/courses/cybersecurity_course.png',
    difficultyLevel: 'College',
    instructor: 'bao.le',
    visibility: 'Public',
    hasCertificate: true,
    modules: [
      { title: 'Chương 1: Tổng quan', lessons: [['Vì sao cần an ninh mạng', 'Video', 10], ['Các loại tấn công phổ biến', 'Video', 25]] },
      { title: 'Chương 2: Mật mã học', lessons: [['Mã hóa đối xứng và bất đối xứng', 'Video', 30], ['Băm mật khẩu', 'Text', 15]] },
      { title: 'Chương 3: Bảo mật web', lessons: [['OWASP Top 10', 'Video', 35], ['XSS và CSRF', 'Video', 25], ['Thực hành', 'Text', 40]] },
    ],
  },
  {
    slug: 'python-cho-phan-tich-du-lieu',
    title: 'Python cho Phân tích dữ liệu',
    shortSummary: 'Phân tích dữ liệu với Python, pandas và trực quan hóa bằng matplotlib.',
    category: 'Data Science',
    thumbnailUrl: '/images/courses/python_data_course.png',
    difficultyLevel: 'HighSchool',
    instructor: 'ha.pham',
    visibility: 'Public',
    modules: [
      { title: 'Chương 1: Python cơ bản', lessons: [['Cài đặt Anaconda và Jupyter', 'Video', 15], ['Biến và kiểu dữ liệu', 'Video', 20], ['Vòng lặp và hàm', 'Video', 25]] },
      { title: 'Chương 2: pandas', lessons: [['DataFrame', 'Video', 25], ['Làm sạch dữ liệu', 'Video', 30], ['Gom nhóm và tổng hợp', 'Text', 20]] },
      { title: 'Chương 3: Trực quan hóa', lessons: [['Biểu đồ với matplotlib', 'Video', 25], ['Dự án cuối khóa', 'Text', 45]] },
    ],
  },
  // ─── Extra courses for testing enrollment rules ───────────────────────────
  {
    slug: 'reactjs-nang-cao',
    title: 'ReactJS nâng cao',
    shortSummary: 'Quản lý state lớn, tối ưu hiệu năng và kiểm thử. Cần hoàn thành khóa ReactJS cơ bản trước.',
    category: 'Lập trình',
    thumbnailUrl: '/images/courses/reactjs_course.png',
    difficultyLevel: 'College',
    instructor: 'minh.nguyen',
    visibility: 'Public',
    prerequisiteSlug: 'lap-trinh-web-hien-dai-voi-reactjs',
    modules: [{ title: 'Chương 1: Hiệu năng', lessons: [['memo và useMemo', 'Video', 20], ['Code splitting', 'Video', 18]] }],
  },
  {
    slug: 'cloud-lab-lop-rieng',
    title: 'Cloud Lab — Lớp riêng',
    shortSummary: 'Lớp thực hành có mật khẩu. Mật khẩu demo: Demo#2026.',
    category: 'Cloud Computing',
    thumbnailUrl: '/images/courses/cloud_course.png',
    difficultyLevel: 'College',
    instructor: 'anh.tran',
    visibility: 'Restricted',
    modules: [{ title: 'Lab 1', lessons: [['Tạo bucket lưu trữ', 'Text', 20], ['Signed URL', 'Text', 25]] }],
  },
  {
    slug: 'devops-khai-giang-thang-12',
    title: 'DevOps căn bản — Khai giảng tháng 12',
    shortSummary: 'CI/CD, Docker và giám sát. Mở đăng ký từ 01/12/2026.',
    category: 'DevOps',
    thumbnailUrl: '/images/courses/cloud_course.png',
    difficultyLevel: 'College',
    instructor: 'anh.tran',
    visibility: 'Public',
    enrollmentOpensAt: new Date('2026-12-01T00:00:00+07:00'),
    modules: [{ title: 'Chương 1: Docker', lessons: [['Container là gì', 'Video', 15]] }],
  },
  {
    slug: 'nextjs-dang-soan',
    title: 'Next.js (đang soạn)',
    shortSummary: 'Bản nháp: chỉ giảng viên và Admin nhìn thấy.',
    category: 'Lập trình',
    thumbnailUrl: '/images/courses/reactjs_course.png',
    difficultyLevel: 'College',
    instructor: 'minh.nguyen',
    visibility: 'Draft',
    modules: [{ title: 'Chương 1', lessons: [['Giới thiệu', 'Text', 5]] }],
  },
];

async function ensureUser(
  u: { username: string; firstName: string; lastName: string; email: string },
  accountType: 'Instructor' | 'Student',
  password: string,
) {
  const existing = await prisma.user.findUnique({ where: { username: u.username } });
  if (existing) return existing;
  return prisma.user.create({
    data: { ...u, accountType, passwordHash: await hashSecret(password), isVerified: true },
  });
}

async function main(): Promise<void> {
  const instructorIds = new Map<string, string>();
  for (const i of INSTRUCTORS) {
    instructorIds.set(i.username, (await ensureUser(i, 'Instructor', INSTRUCTOR_PASSWORD)).id);
  }
  await ensureUser(STUDENT, 'Student', STUDENT_PASSWORD);

  const restrictedHash = await hashSecret(RESTRICTED_COURSE_PASSWORD);
  let created = 0;
  for (const c of COURSES) {
    if (await prisma.course.findUnique({ where: { slug: c.slug } })) continue;
    const prerequisite = c.prerequisiteSlug
      ? await prisma.course.findUnique({ where: { slug: c.prerequisiteSlug } })
      : null;

    await prisma.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: {
          slug: c.slug,
          title: c.title,
          shortSummary: c.shortSummary,
          category: c.category,
          thumbnailUrl: c.thumbnailUrl,
          difficultyLevel: c.difficultyLevel,
          visibility: c.visibility,
          accessPasswordHash: c.visibility === 'Restricted' ? restrictedHash : null,
          hasCertificate: c.hasCertificate ?? false,
          enrollmentOpensAt: c.enrollmentOpensAt ?? null,
          instructors: { create: { instructorId: instructorIds.get(c.instructor)! } },
          ...(prerequisite && {
            prerequisites: { create: { prerequisiteCourseId: prerequisite.id } },
          }),
        },
      });
      for (const [mi, m] of c.modules.entries()) {
        const mod = await tx.module.create({
          data: { courseId: course.id, title: m.title, sortOrder: mi + 1 },
        });
        for (const [li, [title, type, minutes]] of m.lessons.entries()) {
          await tx.lesson.create({
            data: {
              moduleId: mod.id,
              courseId: course.id,
              title,
              slug: `${mi + 1}-${li + 1}`,
              type,
              sortOrder: li + 1,
              estimatedDurationMinutes: minutes,
              textContent: type === 'Text' ? `Nội dung bài "${title}".` : null,
              // The first lesson of every course is a free preview.
              isPreview: mi === 0 && li === 0,
            },
          });
        }
      }
    });
    created++;
  }

  console.log(`Demo data ready. ${created} new course(s).`);
  console.log(`  Instructors: ${INSTRUCTORS.map((i) => i.username).join(', ')} / ${INSTRUCTOR_PASSWORD}`);
  console.log(`  Student:     ${STUDENT.username} / ${STUDENT_PASSWORD}`);
  console.log(`  Restricted course password: ${RESTRICTED_COURSE_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
