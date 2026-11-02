
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import Navbar from "./components/navbar";
import HeroSection from "./components/heroSection";
import FeaturedCourses from "./components/featuredCourse";
import LoginPage from "./pages/loginPage";
import RegisterPage from "./pages/registerPage";
import AccountPage from "./pages/accountPage";
import AdminUsersPage from "./pages/adminUsersPage";
import RequireAuth from "./auth/RequireAuth";
import CoursesPage from "./pages/coursesPage";
import CourseDetailPage from "./pages/courseDetailPage";
import MyCoursesPage from "./pages/myCoursesPage";
import InstructorCoursesPage from "./pages/instructorCoursesPage";
import InstructorCourseManagePage from "./pages/instructorCourseManagePage";

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
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:idOrSlug" element={<CourseDetailPage />} />
          <Route
            path="/my-courses"
            element={
              <RequireAuth>
                <MyCoursesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/instructor/courses"
            element={
              <RequireAuth roles={["Instructor", "Admin"]}>
                <InstructorCoursesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/instructor/courses/:courseId"
            element={
              <RequireAuth roles={["Instructor", "Admin"]}>
                <InstructorCourseManagePage />
              </RequireAuth>
            }
          />
          <Route path="/instructors" element={<PlaceholderPage title="Giảng viên" />} />
          <Route path="/about" element={<PlaceholderPage title="Về chúng tôi" />} />
          <Route
            path="/account"
            element={
              <RequireAuth>
                <AccountPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RequireAuth roles={["Admin"]}>
                <AdminUsersPage />
              </RequireAuth>
            }
          />
        </Route>

        {/* Authentication pages without Navbar */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </BrowserRouter>
  );
}
