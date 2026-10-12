
import {
    Star,
    Users,
    Clock3,
    BookOpen,
    ArrowUpRight,
  } from "lucide-react";
  import { Link } from "react-router-dom";
  import type { Course } from "../data/courses";
  
  interface CourseCardProps {
    course: Course;
  }
  
  export default function CourseCard({ course }: CourseCardProps) {
    return (
      <Link
        to={`/courses/${course.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/60"
      >
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-slate-100">
          <img
            src={course.image}
            alt={course.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
  
          <span className="absolute left-4 top-4 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-blue-600 shadow-sm">
            {course.category}
          </span>
  
          {course.featured && (
            <span className="absolute right-4 top-4 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-white">
              Nổi bật
            </span>
          )}
        </div>
  
        {/* Content */}
        <div className="flex flex-1 flex-col p-5">
          <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
            <span className="rounded-md bg-blue-50 px-2 py-1 font-medium text-blue-600">
              {course.level}
            </span>
            <span className="flex items-center gap-1">
              <Clock3 size={14} />
              {course.duration}
            </span>
          </div>
  
          <h3 className="min-h-[56px] text-lg font-bold leading-7 text-slate-900 transition-colors group-hover:text-blue-600">
            {course.title}
          </h3>
  
          <p className="mt-2 text-sm text-slate-500">
            Giảng viên: {course.instructor}
          </p>
  
          {/* Rating */}
          <div className="mt-4 flex items-center gap-2">
            <Star
              size={17}
              className="fill-amber-400 text-amber-400"
            />
            <span className="text-sm font-bold text-slate-900">
              {course.rating}
            </span>
            <span className="text-xs text-slate-400">
              ({course.reviews.toLocaleString("vi-VN")} đánh giá)
            </span>
          </div>
  
          {/* Course metadata */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Users size={15} />
              {course.students.toLocaleString("vi-VN")} học viên
            </span>
  
            <span className="flex items-center gap-1.5">
              <BookOpen size={15} />
              {course.lessons} bài học
            </span>
          </div>
  
          {/* Footer */}
          <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-5 mt-5">
            <span className="text-lg font-extrabold text-blue-600">
              {course.price === 0
                ? "Miễn phí"
                : `${course.price.toLocaleString("vi-VN")}đ`}
            </span>
  
            <span className="flex items-center gap-1 text-sm font-semibold text-blue-600 transition-all group-hover:gap-2">
              Xem chi tiết
              <ArrowUpRight size={17} />
            </span>
          </div>
        </div>
      </Link>
    );
  }
  