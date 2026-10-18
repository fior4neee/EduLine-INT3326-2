
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  BookOpen,
  CheckCircle2,
} from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // TODO: Tích hợp POST /api/auth/login
    // Chưa có backend nên không xác thực hoặc tạo phiên đăng nhập.
    alert("Giao diện đăng nhập đã sẵn sàng. Chờ kết nối Auth API.");
  };

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[53%_47%]">

      {/* LEFT */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#dbeafe] via-[#eff6ff] to-[#e0e7ff] p-10 text-slate-900 lg:flex">
        <Link to="/" className="flex items-center gap-3 -mt-6">
          <GraduationCap size={35} />
          <span className="text-3xl font-extrabold">EduLine</span>
        </Link>

        <div className="relative z-10">
          <div className="relative mt-8 mb-8 w-full max-w-[700px] overflow-hidden rounded-3xl">
            <img
              src="/images/login_register.png"
              alt="EduLine Online Learning"
              className="block h-[450px] w-full rounded-3xl object-contain mix-blend-multiply"
            />
          </div>


          <h2 className="text-4xl font-extrabold leading-tight">
            Bắt đầu hành trình học tập của bạn.
          </h2>

          <p className="mt-6 text-lg leading-8">
            Tham gia cộng đồng học tập EduLine và khám phá những cơ hội phát triển bản thân.
          </p>

          <div className="mt-5 space-y-4">
            {[
              "Khám phá các khóa học đa dạng",
              "Học tập theo tiến độ cá nhân",
              "Theo dõi kết quả và thành tích",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 size={20} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* RIGHT - LOGIN FORM */}
      <div className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-[430px]">

          <Link
            to="/"
            className="mb-10 inline-flex items-center gap-2 text-blue-600 lg:hidden"
          >
            <GraduationCap size={30} />
            <span className="text-2xl font-bold">EduLine</span>
          </Link>

          <h1 className="text-3xl font-extrabold text-slate-900">
            Chào mừng trở lại!
          </h1>
          <p className="mt-3 text-slate-500">
            Đăng nhập để tiếp tục hành trình học tập.
          </p>

          <form onSubmit={handleSubmit} className="mt-9 space-y-6">

            <div>
              <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-slate-700">
                Địa chỉ email
              </label>
              <div className="relative">
                <Mail size={19} className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-13 w-full rounded-xl border border-slate-200 bg-white pr-4 pl-12 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="login-password" className="text-sm font-semibold text-slate-700">
                  Mật khẩu
                </label>
                <Link to="/forgot-password" className="text-sm font-semibold text-blue-600 hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>

              <div className="relative">
                <LockKeyhole size={19} className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="h-13 w-full rounded-xl border border-slate-200 bg-white pr-12 pl-12 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400 hover:text-blue-600"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-semibold text-white shadow-md shadow-blue-100 transition hover:bg-blue-700"
            >
              Đăng nhập
              <ArrowRight size={19} />
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="font-bold text-blue-600 hover:underline">
              Đăng ký ngay
            </Link>
          </p>

          <div className="mt-10 border-t border-slate-100 pt-6 text-center">
            <Link to="/" className="text-sm text-slate-500 hover:text-blue-600">
              ← Quay về trang chủ
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
}
