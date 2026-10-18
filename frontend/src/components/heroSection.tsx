
import {
    ArrowRight,
    Award,
    BookOpen,
    ChartNoAxesColumnIncreasing,
    CheckCircle2,
    GraduationCap,
    Play,
    Star,
    Users,
  } from "lucide-react";
  import { Link } from "react-router-dom";
  
  const stats = [
    {
      icon: GraduationCap,
      value: "500+",
      label: "Khóa học chất lượng",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      icon: Users,
      value: "50+",
      label: "Giảng viên chuyên gia",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      icon: BookOpen,
      value: "10,000+",
      label: "Học viên đã tham gia",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      icon: Star,
      value: "4.8/5",
      label: "Đánh giá từ học viên",
      color: "text-amber-500",
      bg: "bg-amber-50",
    },
  ];
  
  const benefits = [
    "Học linh hoạt",
    "Chứng chỉ hoàn thành",
    "Lộ trình cá nhân hóa",
    "Hỗ trợ 24/7",
  ];
  
  export default function HeroSection() {
    return (
      <section className="relative w-full overflow-hidden bg-gradient-to-r from-white via-blue-50/40 to-blue-100/60">
  
        {/* Main hero container */}
        <div className="relative mx-auto max-w-[1440px] px-6 pt-0 pb-8 lg:px-12 lg:pt-0">
  
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
  
            {/* LEFT CONTENT */}
            <div className="relative z-10 pt-10 lg:pt-16">
  
              {/* Badge */}
              <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-600">
                <Star
                  size={16}
                  className="fill-amber-400 text-amber-400"
                />
                Nền tảng học tập trực tuyến hàng đầu
              </div>
  
              {/* Heading */}
              <h1 className="max-w-[650px] text-4xl leading-[1.15] font-extrabold tracking-tight text-slate-900 sm:text-5xl xl:text-[60px]">
                Học mọi lúc,
                <br />
                <span className="text-blue-600">
                  phát triển mọi nơi
                </span>
              </h1>
  
              {/* Description */}
              <p className="mt-6 max-w-[600px] text-base leading-8 text-slate-600 sm:text-lg">
                EduLine giúp bạn tiếp cận tri thức chất lượng
                với các khóa học đa dạng, giảng viên giàu kinh
                nghiệm và lộ trình học cá nhân hóa.
              </p>
  
              {/* Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
  
                <Link
                  to="/courses"
                  className="inline-flex items-center justify-center gap-3 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg"
                >
                  Khám phá khóa học
                  <ArrowRight size={18} />
                </Link>
  
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white px-6 py-3.5 text-sm font-semibold text-blue-600 transition-all hover:bg-blue-50"
                >
                  Tạo tài khoản miễn phí
                </Link>
  
              </div>
            </div>
  
            {/* RIGHT IMAGE */}
            <div className="relative mx-auto w-full max-w-[650px] self-start lg:mx-0">
  
              {/* Student image */}
                <div className="relative w-full">
                <img
                    src="/images/student-learning.png"
                    alt="Sinh viên học trực tuyến"
                    className="block h-[440px] w-full object-cover object-top"
                    style={{
                        WebkitMaskImage:
                        "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
                        maskImage:
                        "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
                    }}
                    />
  
                {/* Soft gradient */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-transparent" />
              </div>
  
              {/* Floating video card */}
              <div className="absolute top-[40%] -left-10 xl:-left-20 hidden w-[200px] rounded-2xl border border-white/80 bg-white/95 p-3 shadow-xl backdrop-blur-sm sm:block xl:-left-10">
  
                <div className="relative flex h-[105px] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-100 to-slate-200">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-blue-600 shadow-md">
                    <Play size={20} fill="currentColor" />
                  </div>
                </div>
  
                <h3 className="mt-3 text-sm font-bold text-slate-900">
                  Lập trình Web cơ bản
                </h3>
  
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full w-1/4 rounded-full bg-blue-500" />
                </div>
  
                <p className="mt-1 text-right text-xs text-slate-500">
                  3/12 bài
                </p>
              </div>
  
              {/* Floating benefits card */}
              <div className="absolute top-[12%] -right-2 hidden rounded-2xl border border-white/80 bg-white/95 p-4 shadow-xl backdrop-blur-sm sm:block xl:-right-4">
  
                <div className="space-y-4">
                  {benefits.map((benefit) => (
                    <div
                      key={benefit}
                      className="flex items-center gap-3"
                    >
                      <CheckCircle2
                        size={19}
                        className="shrink-0 fill-blue-100 text-blue-600"
                      />
                      <span className="whitespace-nowrap text-xs font-medium text-slate-700">
                        {benefit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>  
            </div>
          </div>
  
          {/* STATISTICS */}
          
          <div className="relative z-10 mt-8 grid grid-cols-2 gap-5 border-t border-slate-100 pt-6 lg:mt-4 lg:grid-cols-4 lg:border-none lg:pt-0">
            {stats.map((stat) => {
              const Icon = stat.icon;
  
              return (
                <div
                  key={stat.label}
                  className="flex items-center gap-3"
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${stat.bg}`}
                  >
                    <Icon
                      size={25}
                      strokeWidth={2.3}
                      className={stat.color}
                    />
                  </div>
  
                  <div>
                    <p className="text-xl font-extrabold text-slate-900">
                      {stat.value}
                    </p>
  
                    <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                      {stat.label}
                    </p>
                  </div>
                </div>
              );
            })}
  
          </div>
        </div>
      </section>
    );
  }
  