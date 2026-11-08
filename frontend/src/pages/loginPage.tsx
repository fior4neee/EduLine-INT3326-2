import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, GraduationCap, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "../auth/auth-context";
import { getErrorMessage } from "../services/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from || "/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[53%_47%]">
      <aside className="hidden flex-col justify-between bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100 p-10 text-slate-900 lg:flex">
        <Link to="/" className="flex items-center gap-3"><GraduationCap size={34} /><span className="text-3xl font-extrabold">EduLine</span></Link>
        <div className="mx-auto max-w-xl"><img src="/images/login_register.png" alt="Học tập trực tuyến cùng EduLine" className="max-h-[400px] w-full object-contain mix-blend-multiply" /><h2 className="mt-6 text-4xl font-extrabold leading-tight">Chào mừng bạn trở lại!</h2><p className="mt-4 text-lg leading-8 text-slate-600">Đăng nhập để tiếp tục hành trình học tập và chinh phục mục tiêu của bạn.</p></div>
        <p className="text-sm text-slate-500">Học tập theo cách của bạn cùng EduLine</p>
      </aside>
      <div className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-[430px]">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-blue-600 lg:hidden"><GraduationCap size={30} /><span className="text-2xl font-bold">EduLine</span></Link>
          <h1 className="text-3xl font-extrabold text-slate-900">Đăng nhập</h1>
          <p className="mt-3 text-slate-500">Sử dụng email hoặc tên đăng nhập để tiếp tục.</p>
          <form onSubmit={handleSubmit} className="mt-9 space-y-6">
            <div><label htmlFor="login-id" className="mb-2 block text-sm font-semibold text-slate-700">Email hoặc tên đăng nhập</label><div className="relative"><Mail size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input id="login-id" required autoComplete="username" autoCapitalize="none" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-13 w-full rounded-xl border border-slate-200 bg-white pr-4 pl-12 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div></div>
            <div><label htmlFor="login-password" className="mb-2 block text-sm font-semibold text-slate-700">Mật khẩu</label><div className="relative"><LockKeyhole size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input id="login-password" type={showPassword ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" className="h-13 w-full rounded-xl border border-slate-200 bg-white pr-12 pl-12 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div></div>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={submitting} className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-semibold text-white shadow-md shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70">{submitting ? "Đang đăng nhập…" : "Đăng nhập"}<ArrowRight size={19} /></button>
          </form>
          <p className="mt-8 text-center text-sm text-slate-500">Chưa có tài khoản? <Link to="/register" className="font-bold text-blue-600 hover:underline">Đăng ký ngay</Link></p>
          <div className="mt-8 border-t border-slate-100 pt-6 text-center"><Link to="/" className="text-sm text-slate-500 hover:text-blue-600">← Quay về trang chủ</Link></div>
        </div>
      </div>
    </main>
  );
}
