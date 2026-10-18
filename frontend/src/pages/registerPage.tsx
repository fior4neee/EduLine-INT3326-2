
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  UserRound,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
    agreeTerms: false,
  });

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (form.password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    // TODO: Tích hợp POST /api/auth/register
    // Backend cần kiểm tra dữ liệu và quyền đăng ký vai trò.
    alert("Thông tin hợp lệ. Chức năng đăng ký đang chờ Auth API.");
  };

  const inputClass =
    "h-12 w-full rounded-xl border border-slate-200 bg-white pr-4 pl-12 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

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

      {/* RIGHT */}
      <div className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-12">
        <div className="w-full max-w-[440px]">

          <Link to="/" className="mb-8 flex items-center gap-2 text-blue-600 lg:hidden">
            <GraduationCap size={30} />
            <span className="text-2xl font-bold">EduLine</span>
          </Link>

          <h1 className="text-3xl font-extrabold text-slate-900 -mt-25">
            Tạo tài khoản mới
          </h1>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">

            {/* Full name */}
            <div>
              <label htmlFor="register-name" className="mb-2 block text-sm font-semibold text-slate-700">
                Họ và tên
              </label>
              <div className="relative">
                <UserRound size={18} className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="register-name"
                  required
                  autoComplete="name"
                  value={form.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="register-email" className="mb-2 block text-sm font-semibold text-slate-700">
                Email
              </label>
              <div className="relative">
                <Mail size={18} className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="register-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label htmlFor="register-role" className="mb-2 block text-sm font-semibold text-slate-700">
                Bạn muốn tham gia với vai trò
              </label>
              <select
                id="register-role"
                value={form.role}
                onChange={(e) => updateField("role", e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="student">Học viên (Student)</option>
                <option value="instructor">Giảng viên (Instructor)</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="register-password" className="mb-2 block text-sm font-semibold text-slate-700">
                Mật khẩu
              </label>
              <div className="relative">
                <LockKeyhole size={18} className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="Ít nhất 8 ký tự"
                  className={inputClass + " pr-12"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="register-confirm" className="mb-2 block text-sm font-semibold text-slate-700">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <LockKeyhole size={18} className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="register-confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className={inputClass + " pr-12"}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-semibold text-white transition hover:bg-blue-700"
            >
              Tạo tài khoản
              <ArrowRight size={18} />
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Đã có tài khoản?{" "}
            <Link to="/login" className="font-bold text-blue-600 hover:underline">
              Đăng nhập
            </Link>
          </p>

          <div className="mt-4 text-center">
            <Link to="/" className="text-sm text-slate-500 hover:text-blue-600">
              ← Quay về trang chủ
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
}
