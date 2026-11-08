import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Eye, EyeOff, GraduationCap, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useAuth } from "../auth/auth-context";
import { getErrorMessage } from "../services/auth";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ fullName: "", username: "", email: "", password: "", confirmPassword: "", role: "Student" as "Student" | "Instructor" });
  const update = (field: keyof typeof form, value: string) => { setForm((previous) => ({ ...previous, [field]: value })); setError(""); };
  const inputClass = "h-12 w-full rounded-xl border border-slate-200 bg-white pr-4 pl-12 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/\d/.test(form.password) || !/[^A-Za-z0-9]/.test(form.password)) {
      setError("Mật khẩu cần có 8–32 ký tự, gồm chữ hoa, số và ký tự đặc biệt."); return;
    }
    if (form.password !== form.confirmPassword) { setError("Mật khẩu xác nhận không khớp."); return; }
    const nameParts = form.fullName.trim().split(/\s+/);
    const firstName = nameParts.pop() ?? "";
    const lastName = nameParts.join(" ");
    setSubmitting(true);
    try {
      await register({ username: form.username.trim(), firstName, lastName, email: form.email.trim(), password: form.password, accountType: form.role });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[53%_47%]">
      <aside className="hidden flex-col justify-between bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100 p-10 text-slate-900 lg:flex">
        <Link to="/" className="flex items-center gap-3"><GraduationCap size={35} /><span className="text-3xl font-extrabold">EduLine</span></Link>
        <div className="relative z-10"><img src="/images/login_register.png" alt="Học tập trực tuyến cùng EduLine" className="mx-auto max-h-[390px] w-full max-w-[650px] object-contain mix-blend-multiply" /><h2 className="mt-5 text-4xl font-extrabold leading-tight">Bắt đầu hành trình học tập của bạn.</h2><p className="mt-4 text-lg leading-8 text-slate-600">Khám phá kiến thức mới và phát triển kỹ năng theo nhịp độ của riêng bạn.</p><div className="mt-5 space-y-3">{["Khám phá các khóa học đa dạng", "Học tập theo tiến độ cá nhân", "Theo dõi kết quả và thành tích"].map((item) => <div key={item} className="flex items-center gap-3"><CheckCircle2 size={19} className="text-blue-600" /><span>{item}</span></div>)}</div></div>
        <p className="text-sm text-slate-500">EduLine · Học tập linh hoạt, tiến bộ mỗi ngày</p>
      </aside>
      <div className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-12">
        <div className="w-full max-w-[460px]">
          <Link to="/" className="mb-7 inline-flex items-center gap-2 text-blue-600 lg:hidden"><GraduationCap size={30} /><span className="text-2xl font-bold">EduLine</span></Link>
          <h1 className="text-3xl font-extrabold text-slate-900">Tạo tài khoản mới</h1><p className="mt-2 text-sm text-slate-500">Đăng ký để bắt đầu học tập cùng EduLine.</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
            <Field label="Họ và tên" id="register-name" icon={<UserRound size={18} />}><input id="register-name" required autoComplete="name" value={form.fullName} onChange={(event) => update("fullName", event.target.value)} placeholder="Nguyễn Văn An" className={inputClass} /></Field>
            <Field label="Tên đăng nhập" id="register-username" icon={<UserRound size={18} />}><input id="register-username" required minLength={3} autoComplete="username" autoCapitalize="none" value={form.username} onChange={(event) => update("username", event.target.value)} placeholder="nguyen.van.an" className={inputClass} /></Field>
            <Field label="Email" id="register-email" icon={<Mail size={18} />}><input id="register-email" type="email" required autoComplete="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="you@example.com" className={inputClass} /></Field>
            <div><label htmlFor="register-role" className="mb-2 block text-sm font-semibold text-slate-700">Vai trò đăng ký</label><select id="register-role" value={form.role} onChange={(event) => update("role", event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-500"><option value="Student">Học viên (Student)</option><option value="Instructor">Giảng viên (Instructor)</option></select><p className="mt-1 text-xs text-slate-400">Yêu cầu giảng viên sẽ được quản trị viên xét duyệt.</p></div>
            <PasswordField label="Mật khẩu" id="register-password" value={form.password} onChange={(value) => update("password", value)} visible={showPassword} toggle={() => setShowPassword(!showPassword)} placeholder="8–32 ký tự, gồm chữ hoa, số và ký tự đặc biệt" />
            <PasswordField label="Xác nhận mật khẩu" id="register-confirm" value={form.confirmPassword} onChange={(value) => update("confirmPassword", value)} visible={showConfirmPassword} toggle={() => setShowConfirmPassword(!showConfirmPassword)} placeholder="Nhập lại mật khẩu" />
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={submitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70">{submitting ? "Đang tạo tài khoản…" : "Tạo tài khoản"}<ArrowRight size={18} /></button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-500">Đã có tài khoản? <Link to="/login" className="font-bold text-blue-600 hover:underline">Đăng nhập</Link></p>
          <div className="mt-4 text-center"><Link to="/" className="text-sm text-slate-500 hover:text-blue-600">← Quay về trang chủ</Link></div>
        </div>
      </div>
    </main>
  );
}

function Field({ label, id, icon, children }: { label: string; id: string; icon: ReactNode; children: ReactNode }) {
  return <div><label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>{children}</div></div>;
}

function PasswordField({ label, id, value, onChange, visible, toggle, placeholder }: { label: string; id: string; value: string; onChange: (value: string) => void; visible: boolean; toggle: () => void; placeholder: string }) {
  return <div><label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label><div className="relative"><LockKeyhole size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input id={id} type={visible ? "text" : "password"} required autoComplete="new-password" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-12 w-full rounded-xl border border-slate-200 bg-white pr-12 pl-12 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /><button type="button" onClick={toggle} aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>;
}
