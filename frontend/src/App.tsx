
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import Navbar from "./components/navbar";
import HeroSection from "./components/heroSection";
import FeaturedCourses from "./components/featuredCourse";
import LoginPage from "./pages/loginPage";
import RegisterPage from "./pages/registerPage";

function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <HeroSection />
      <FeaturedCourses />
    </main>
  );
}

function MainLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="text-3xl font-bold">{title}</h1>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages with Navbar */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/courses" element={<PlaceholderPage title="Khóa học" />} />
          <Route path="/instructors" element={<PlaceholderPage title="Giảng viên" />} />
          <Route path="/about" element={<PlaceholderPage title="Về chúng tôi" />} />
        </Route>

        {/* Authentication pages without Navbar */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </BrowserRouter>
  );
}
