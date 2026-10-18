
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import CourseCard from "./courseCard";
import { courses } from "../data/courses";

export default function FeaturedCourses() {
  const featuredCourses = courses
    .filter((course) => course.featured)
    .slice(0, 4);

  return (
    <section className="w-full bg-white py-16 lg:py-10">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-12">

        {/* Section heading */}
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
              <Sparkles size={18} />
              KHÁM PHÁ TRI THỨC
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
              Khóa học <span className="text-blue-600">nổi bật</span>
            </h2>

            <p className="mt-4 max-w-xl text-base leading-7 text-slate-500">
              Khám phá những khóa học được yêu thích,
              giúp bạn phát triển kỹ năng và chinh phục
              mục tiêu học tập.
            </p>
          </div>

          <Link
            to="/courses"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-blue-200 px-5 py-3 text-sm font-semibold text-blue-600 transition-all hover:bg-blue-50 md:self-auto"
          >
            Xem tất cả khóa học
            <ArrowRight size={17} />
          </Link>
        </div>

        {/* Course grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {featuredCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </div>
    </section>
  );
}
