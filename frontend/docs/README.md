# EduLine Frontend

Frontend application for **EduLine – Online Learning Platform**, developed as part of the Cloud Application Development course.

## 1. Tech Stack

| Technology | Purpose |
|---|---|
| ReactJS | Frontend UI development |
| TypeScript | Type-safe development |
| Vite | Development server and build tool |
| Tailwind CSS v4 | Responsive UI styling |
| React Router DOM | Client-side routing |
| Lucide React | UI icons |
| Git & GitHub | Version control and collaboration |

## 2. Project Structure

```text
frontend/
├── public/
│   └── images/              # Static images and assets
├── src/
│   ├── assets/              # Imported assets
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── HeroSection.tsx
│   │   ├── CourseCard.tsx
│   │   └── FeaturedCourses.tsx
│   ├── data/
│   │   └── courses.ts       # Mock course data
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   ├── App.tsx              # Application routes and layouts
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles
├── package.json
├── vite.config.ts
├── tsconfig.app.json
└── README.md
```

## 3. Implemented Features

### Homepage
- Responsive navigation bar
- Hero section with educational illustrations
- Featured courses section
- Course cards displaying course information
- Navigation to authentication pages

### Authentication UI
- Login page
- Registration page
- Student and Instructor role selection
- Password visibility toggle
- Client-side form validation
- Navigation between Login and Register

### Course Discovery
- Featured course listing
- Course thumbnails and categories
- Instructor information
- Ratings, enrollment counts, and course duration
- Mock data for frontend development

**Current status:** Authentication and course data are frontend demonstrations. Backend authentication, persistent data storage, and full course functionality are not yet integrated.

## 4. Getting Started

### Prerequisites

- Node.js (compatible with the project dependencies)
- npm
- Git
- Visual Studio Code (recommended)

### Clone the Repository

```bash
git clone https://github.com/fior4neee/EduLine-INT3326-2/
cd EduLine-INT3326-2/frontend
```

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

Open the local URL displayed by Vite, typically:

```text
http://localhost:5173
```

## 5. Application Routes

| Route | Description | Status |
|---|---|---|
| `/` | Homepage | Implemented |
| `/login` | Login page | UI completed |
| `/register` | Registration page | UI completed |
| `/courses` | Course catalog | Planned |
| `/courses/:id` | Course details | Planned |
| `/instructors` | Instructor listing | Planned |
| `/about` | About EduLine | Planned |

Some routes may currently contain placeholder pages.

## 6. Backend Integration

The frontend is designed to integrate with backend REST APIs.

### Planned API Endpoints

Confirm with backendmembers.

### Environment Configuration

For future backend integration, create a `.env.local` file:

```env
VITE_API_BASE_URL={api-url}
```

## 7. Planned Features

- Backend authentication integration
- Student dashboard
- Course catalog and filtering
- Course details and enrollment
- Video and document learning interface
- Learning progress tracking
- Online quizzes and assessments
- Assignment submission
- Instructor dashboard
- Notifications
- AI-powered course tutor (optional)
