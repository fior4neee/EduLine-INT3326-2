import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { courseProgressPercent } from './progress-rules';

// Read-only view of lesson_progress. Kept apart from ProgressService (which needs
// EnrollmentsService to complete a course) so EnrollmentsService and UsersService
// can ask for progress without a circular dependency.
@Injectable()
export class CourseProgressService {
  constructor(private readonly prisma: PrismaService) {}

  // Course progress for many courses in two queries, for GET /me/courses and
  // enrolledCourses. A course with no lessons is missing from the map (read it as 0).
  async getCourseProgressMap(userId: string, courseIds: number[]): Promise<Map<number, number>> {
    if (courseIds.length === 0) return new Map();
    const [totals, dones] = await Promise.all([
      this.prisma.lesson.groupBy({
        by: ['courseId'],
        where: { courseId: { in: courseIds } },
        _count: { _all: true },
      }),
      this.prisma.lessonProgress.groupBy({
        by: ['courseId'],
        where: { userId, courseId: { in: courseIds }, completedAt: { not: null } },
        _count: { _all: true },
      }),
    ]);
    const doneBy = new Map(dones.map((d) => [d.courseId, d._count._all]));
    return new Map(
      totals.map((t) => [
        t.courseId,
        courseProgressPercent(doneBy.get(t.courseId) ?? 0, t._count._all),
      ]),
    );
  }
}
