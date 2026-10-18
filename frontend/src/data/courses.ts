export interface Course {
    id: number;
    title: string;
    category: string;
    instructor: string;
    image: string;
    rating: number;
    reviews: number;
    students: number;
    lessons: number;
    duration: string;
    level: string;
    price: number;
    featured: boolean;
  }
  
  export const courses: Course[] = [
    {
      id: 1,
      title: "Lập trình Web hiện đại với ReactJS",
      category: "Lập trình",
      instructor: "Nguyễn Văn Minh",
      image: "/images/courses/reactjs_course.png",
      rating: 4.9,
      reviews: 1250,
      students: 4200,
      lessons: 32,
      duration: "12 giờ",
      level: "Cơ bản",
      price: 0,
      featured: true,
    },
    {
      id: 2,
      title: "Nhập môn Điện toán đám mây",
      category: "Cloud Computing",
      instructor: "Trần Hoàng Anh",
      image: "/images/courses/cloud_course.png",
      rating: 4.8,
      reviews: 980,
      students: 3100,
      lessons: 24,
      duration: "10 giờ",
      level: "Cơ bản",
      price: 0,
      featured: true,
    },
    {
      id: 3,
      title: "Cybersecurity Fundamentals",
      category: "An ninh mạng",
      instructor: "Lê Quốc Bảo",
      image: "/images/courses/cybersecurity_course.png",
      rating: 4.9,
      reviews: 760,
      students: 2800,
      lessons: 28,
      duration: "14 giờ",
      level: "Trung cấp",
      price: 0,
      featured: true,
    },
    {
      id: 4,
      title: "Python cho Phân tích dữ liệu",
      category: "Data Science",
      instructor: "Phạm Thu Hà",
      image: "/images/courses/python_data_course.png",
      rating: 4.8,
      reviews: 1100,
      students: 3600,
      lessons: 36,
      duration: "16 giờ",
      level: "Cơ bản",
      price: 0,
      featured: true,
    },
  ];
  