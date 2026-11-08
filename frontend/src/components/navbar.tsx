import { useState, type FormEvent } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Search,
  Menu,
  X,
  ArrowRight,
  UserRound,
  ShieldCheck,
  LogOut,
  BookOpen,
} from "lucide-react";
import { useAuth } from "../auth/auth-context";
import { ROLE_LABEL } from "../lib/roles";
import NotificationBell from "./notificationBell";

const navItems = [
  { label: "Trang chủ", path: "/" },
  { label: "Khóa học", path: "/courses" },
  { label: "Giảng viên", path: "/instructors" },
  { label: "Về chúng tôi", path: "/about" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/");
  };

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (search.trim()) {
      navigate(`/courses?search=${encodeURIComponent(search.trim())}`);
      setMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/95 backdrop-blur-md">
      <nav className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-6 px-5 lg:px-10">

        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <GraduationCap size={25} strokeWidth={2.5} />
          </div>

          <span className="text-2xl font-extrabold tracking-tight text-slate-900">
            Edu<span className="text-blue-600">Line</span>
          </span>
        </Link>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-7 lg:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `relative whitespace-nowrap py-6 text-sm font-semibold transition-colors ${
                  isActive
                    ? "text-blue-600 after:absolute after:bottom-4 after:left-0 after:h-0.5 after:w-full after:bg-blue-600"
                    : "text-slate-700 hover:text-blue-600"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="hidden max-w-[340px] flex-1 items-center gap-3 rounded-full bg-slate-100 px-4 py-3 xl:flex"
        >
          <Search size={19} className="shrink-0 text-slate-500" />

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm khóa học, chủ đề, giảng viên..."
            aria-label="Tìm kiếm khóa học"
            className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
        </form>

        {/* One bell for every screen size, so the unread count is polled once. */}
        {user && (
          <div className="ml-auto md:ml-0">
            <NotificationBell />
          </div>
        )}

        {/* Authentication */}
        {user ? (
          <div className="hidden shrink-0 items-center gap-3 md:flex">
            {user.accountType === "Admin" && (
              <Link
                to="/admin/users"
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
              >
                <ShieldCheck size={17} /> Quản trị
              </Link>
            )}
            <Link
              to={user.accountType === "Student" ? "/my-courses" : "/instructor/courses"}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              <BookOpen size={17} />
              {user.accountType === "Student" ? "Khóa học của tôi" : "Khóa tôi dạy"}
            </Link>
            <Link
              to="/account"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
            >
              <UserRound size={17} />
              <span>{user.firstName}</span>
              <span className="text-xs font-medium text-slate-400">· {ROLE_LABEL[user.accountType]}</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Đăng xuất"
              title="Đăng xuất"
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
        <div className="hidden shrink-0 items-center gap-5 md:flex">
          <Link
            to="/login"
            className="text-sm font-semibold text-slate-800 transition-colors hover:text-blue-600"
          >
            Đăng nhập
          </Link>

          <Link
            to="/register"
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
          >
            Đăng ký
          </Link>
        </div>
        )}

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={menuOpen}
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
        >
          {menuOpen ? <X size={25} /> : <Menu size={25} />}
        </button>
      </nav>

      {/* Mobile / Tablet menu */}
      {menuOpen && (
        <div className="border-t border-slate-100 bg-white px-5 py-5 shadow-lg lg:hidden">
          <form onSubmit={handleSearch} className="mb-5 flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3">
            <Search size={18} className="text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm khóa học..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </form>

          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-4 py-3 text-sm font-semibold ${
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-700 hover:bg-slate-50"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          {user ? (
            <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 md:hidden">
              {user.accountType === "Admin" && (
                <Link
                  to="/admin/users"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl border border-violet-200 py-3 text-center text-sm font-semibold text-violet-700"
                >
                  Quản trị người dùng
                </Link>
              )}
              <Link
                to={user.accountType === "Student" ? "/my-courses" : "/instructor/courses"}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl border border-blue-200 py-3 text-center text-sm font-semibold text-blue-700"
              >
                {user.accountType === "Student" ? "Khóa học của tôi" : "Khóa tôi dạy"}
              </Link>
              <Link
                to="/account"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl border border-slate-200 py-3 text-center text-sm font-semibold text-slate-800"
              >
                Tài khoản ({user.firstName})
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 md:hidden">
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="rounded-xl border border-slate-200 py-3 text-center text-sm font-semibold text-slate-800"
            >
              Đăng nhập
            </Link>

            <Link
              to="/register"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white"
            >
              Đăng ký <ArrowRight size={16} />
            </Link>
          </div>
          )}
        </div>
      )}
    </header>
  );
}
