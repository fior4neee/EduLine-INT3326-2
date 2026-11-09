--
-- PostgreSQL database dump
--

\restrict DkRWK4CUNE6BNA8d8luokYdQyvwdXneDgSeH626CHuu96Ppti8FCBoQmnWvGg75

-- Dumped from database version 16.15 (Debian 16.15-1.pgdg12+2)
-- Dumped by pg_dump version 16.15 (Debian 16.15-1.pgdg12+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.courses (id, title, slug, short_summary, difficulty_level, visibility, access_password_hash, enrollment_opens_at, enrollment_closes_at, has_certificate, created_at, updated_at, category, thumbnail_url, welcome_message) FROM stdin;
1	Lập trình Web hiện đại với ReactJS	lap-trinh-web-hien-dai-voi-reactjs	Xây dựng giao diện web bằng React: component, state, hooks và gọi API.	College	Public	\N	\N	\N	t	2026-11-09 03:28:23.379	2026-11-09 03:28:23.379	Lập trình	/images/courses/reactjs_course.png	\N
2	Nhập môn Điện toán đám mây	nhap-mon-dien-toan-dam-may	Các khái niệm cloud cơ bản: IaaS, PaaS, SaaS, lưu trữ, mạng và triển khai ứng dụng.	College	Public	\N	\N	\N	f	2026-11-09 03:28:23.426	2026-11-09 03:28:23.426	Cloud Computing	/images/courses/cloud_course.png	\N
3	Cybersecurity Fundamentals	cybersecurity-fundamentals	Nền tảng an ninh mạng: mối đe dọa phổ biến, mật mã học và bảo mật ứng dụng web.	College	Public	\N	\N	\N	t	2026-11-09 03:28:23.46	2026-11-09 03:28:23.46	An ninh mạng	/images/courses/cybersecurity_course.png	\N
4	Python cho Phân tích dữ liệu	python-cho-phan-tich-du-lieu	Phân tích dữ liệu với Python, pandas và trực quan hóa bằng matplotlib.	High School	Public	\N	\N	\N	f	2026-11-09 03:28:23.491	2026-11-09 03:28:23.491	Data Science	/images/courses/python_data_course.png	\N
5	ReactJS nâng cao	reactjs-nang-cao	Quản lý state lớn, tối ưu hiệu năng và kiểm thử. Cần hoàn thành khóa ReactJS cơ bản trước.	College	Public	\N	\N	\N	f	2026-11-09 03:28:23.525	2026-11-09 03:28:23.525	Lập trình	/images/courses/reactjs_course.png	\N
6	Cloud Lab — Lớp riêng	cloud-lab-lop-rieng	Lớp thực hành có mật khẩu. Mật khẩu demo: Demo#2026.	College	Restricted	$argon2id$v=19$m=19456,t=2,p=1$KAl+5F7zEj5DJZuNukF4UQ$fpNn2GNTT5vsnDzgsPM7BMsl+YTVkTSEYn0mlEREzRI	\N	\N	f	2026-11-09 03:28:23.549	2026-11-09 03:28:23.549	Cloud Computing	/images/courses/cloud_course.png	\N
7	DevOps căn bản — Khai giảng tháng 12	devops-khai-giang-thang-12	CI/CD, Docker và giám sát. Mở đăng ký từ 01/12/2026.	College	Public	\N	2026-11-30 17:00:00	\N	f	2026-11-09 03:28:23.568	2026-11-09 03:28:23.568	DevOps	/images/courses/cloud_course.png	\N
8	Next.js (đang soạn)	nextjs-dang-soan	Bản nháp: chỉ giảng viên và Admin nhìn thấy.	College	Draft	\N	\N	\N	f	2026-11-09 03:28:23.584	2026-11-09 03:28:23.584	Lập trình	/images/courses/reactjs_course.png	\N
9	Cơ sở văn hóa Việt Nam	co-so-van-hoa-viet-nam	Khái niệm văn hóa, không gian và chủ thể văn hóa Việt Nam, văn hóa lúa nước, tam giáo, tín ngưỡng và lễ hội.	College	Public	\N	\N	\N	f	2026-11-09 03:28:24.969	2026-11-09 03:28:24.969	Văn hóa	/images/courses/co-so-van-hoa-viet-nam.svg	Chào mừng bạn đến với khóa Cơ sở văn hóa Việt Nam! Hãy thử tìm ví dụ cho mỗi bài học ngay trong gia đình và quê hương của bạn.
10	Kinh tế vĩ mô nhập môn	kinh-te-vi-mo-nhap-mon	GDP, thất nghiệp, lạm phát, tổng cung – tổng cầu, chính sách tiền tệ và tài khóa, cán cân thương mại và tỷ giá.	College	Public	\N	\N	\N	t	2026-11-09 03:28:25.064	2026-11-09 03:28:25.064	Kinh tế	/images/courses/kinh-te-vi-mo-nhap-mon.svg	Chào mừng bạn đến với khóa Kinh tế vĩ mô nhập môn! Hãy thử liên hệ mỗi bài học với tin tức kinh tế bạn đọc hằng ngày.
11	Mạng máy tính căn bản	mang-may-tinh-can-ban	Hiểu cách các máy tính trao đổi dữ liệu: mô hình OSI và TCP/IP, đóng gói dữ liệu, địa chỉ IP và thiết bị mạng.	College	Public	\N	\N	\N	t	2026-11-09 03:28:25.119	2026-11-09 03:28:25.119	Mạng máy tính	/images/courses/mang-may-tinh-can-ban.svg	Chào mừng bạn đến với khóa Mạng máy tính căn bản! Hãy bắt đầu từ chương 1 và làm bài kiểm tra ở cuối khóa.
12	Nhập môn lập trình với ngôn ngữ C	nhap-mon-lap-trinh-c	Làm quen với lập trình qua ngôn ngữ C: biến, kiểu dữ liệu, nhập xuất, biểu thức và phạm vi biến.	College	Public	\N	\N	\N	t	2026-11-09 03:28:25.164	2026-11-09 03:28:25.164	Lập trình	/images/courses/nhap-mon-lap-trinh-c.svg	Chào mừng bạn đến với khóa Nhập môn lập trình C! Hãy cài sẵn một trình biên dịch (gcc hoặc clang) để chạy thử các ví dụ.
13	Xác suất và thống kê ứng dụng	xac-suat-thong-ke	Thống kê mô tả, biến cố và xác suất, xác suất có điều kiện, công thức Bayes, phân phối nhị thức và phân phối chuẩn.	College	Public	\N	\N	\N	t	2026-11-09 03:28:25.208	2026-11-09 03:28:25.208	Toán học	/images/courses/xac-suat-thong-ke.svg	Chào mừng bạn đến với khóa Xác suất và thống kê! Chuẩn bị giấy bút và máy tính cầm tay để làm theo các ví dụ nhé.
\.


--
-- Data for Name: modules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.modules (id, course_id, title, sort_order) FROM stdin;
1	1	Chương 1: Làm quen với React	1
2	1	Chương 2: State và Props	2
3	1	Chương 3: Hooks và gọi API	3
4	2	Chương 1: Cloud là gì	1
5	2	Chương 2: Dịch vụ cốt lõi	2
6	2	Chương 3: Triển khai	3
7	3	Chương 1: Tổng quan	1
8	3	Chương 2: Mật mã học	2
9	3	Chương 3: Bảo mật web	3
10	4	Chương 1: Python cơ bản	1
11	4	Chương 2: pandas	2
12	4	Chương 3: Trực quan hóa	3
13	5	Chương 1: Hiệu năng	1
14	6	Lab 1	1
15	7	Chương 1: Docker	1
16	8	Chương 1	1
17	9	Chương 1: Văn hóa và văn hóa học	1
18	9	Chương 2: Đặc trưng và giao lưu văn hóa	2
19	9	Chương 3: Tín ngưỡng, lễ hội và ôn tập	3
20	10	Chương 1: Đo lường nền kinh tế	1
21	10	Chương 2: Thất nghiệp, lạm phát và tổng cung – tổng cầu	2
22	10	Chương 3: Chính sách kinh tế vĩ mô và ôn tập	3
23	11	Chương 1: Tổng quan về mạng máy tính	1
24	11	Chương 2: Mô hình OSI và TCP/IP	2
25	11	Chương 3: Địa chỉ, thiết bị mạng và ôn tập	3
26	12	Chương 1: Làm quen với C	1
27	12	Chương 2: Biến, kiểu dữ liệu và nhập xuất	2
28	12	Chương 3: Biểu thức, phạm vi biến và ôn tập	3
29	13	Chương 1: Dữ liệu và thống kê mô tả	1
30	13	Chương 2: Xác suất	2
31	13	Chương 3: Biến ngẫu nhiên và ôn tập	3
\.


--
-- Data for Name: lessons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lessons (id, module_id, course_id, title, slug, type, sort_order, estimated_duration_minutes, is_preview, text_content, video_key, resource_keys) FROM stdin;
1	1	1	Giới thiệu khóa học	1-1	Video	1	8	t	\N	\N	{}
2	1	1	Cài đặt Node.js và Vite	1-2	Text	2	15	f	Nội dung bài "Cài đặt Node.js và Vite".	\N	{}
3	1	1	Component đầu tiên	1-3	Video	3	20	f	\N	\N	{}
4	2	1	Props là gì	2-1	Video	1	18	f	\N	\N	{}
5	2	1	useState	2-2	Video	2	25	f	\N	\N	{}
6	2	1	Bài tập: Danh sách việc cần làm	2-3	Text	3	30	f	Nội dung bài "Bài tập: Danh sách việc cần làm".	\N	{}
7	3	1	useEffect	3-1	Video	1	22	f	\N	\N	{}
8	3	1	Gọi API với Axios	3-2	Video	2	25	f	\N	\N	{}
9	3	1	Tổng kết	3-3	Text	3	10	f	Nội dung bài "Tổng kết".	\N	{}
10	4	2	Lịch sử điện toán đám mây	1-1	Video	1	12	t	\N	\N	{}
11	4	2	IaaS, PaaS, SaaS	1-2	Text	2	15	f	Nội dung bài "IaaS, PaaS, SaaS".	\N	{}
12	5	2	Máy ảo và container	2-1	Video	1	25	f	\N	\N	{}
13	5	2	Lưu trữ đối tượng	2-2	Video	2	20	f	\N	\N	{}
14	5	2	Mạng và CDN	2-3	Video	3	22	f	\N	\N	{}
15	6	2	Triển khai ứng dụng lên Cloud Run	3-1	Video	1	30	f	\N	\N	{}
16	6	2	Chi phí và tối ưu	3-2	Text	2	15	f	Nội dung bài "Chi phí và tối ưu".	\N	{}
17	7	3	Vì sao cần an ninh mạng	1-1	Video	1	10	t	\N	\N	{}
18	7	3	Các loại tấn công phổ biến	1-2	Video	2	25	f	\N	\N	{}
19	8	3	Mã hóa đối xứng và bất đối xứng	2-1	Video	1	30	f	\N	\N	{}
20	8	3	Băm mật khẩu	2-2	Text	2	15	f	Nội dung bài "Băm mật khẩu".	\N	{}
21	9	3	OWASP Top 10	3-1	Video	1	35	f	\N	\N	{}
22	9	3	XSS và CSRF	3-2	Video	2	25	f	\N	\N	{}
23	9	3	Thực hành	3-3	Text	3	40	f	Nội dung bài "Thực hành".	\N	{}
24	10	4	Cài đặt Anaconda và Jupyter	1-1	Video	1	15	t	\N	\N	{}
25	10	4	Biến và kiểu dữ liệu	1-2	Video	2	20	f	\N	\N	{}
26	10	4	Vòng lặp và hàm	1-3	Video	3	25	f	\N	\N	{}
27	11	4	DataFrame	2-1	Video	1	25	f	\N	\N	{}
28	11	4	Làm sạch dữ liệu	2-2	Video	2	30	f	\N	\N	{}
29	11	4	Gom nhóm và tổng hợp	2-3	Text	3	20	f	Nội dung bài "Gom nhóm và tổng hợp".	\N	{}
30	12	4	Biểu đồ với matplotlib	3-1	Video	1	25	f	\N	\N	{}
31	12	4	Dự án cuối khóa	3-2	Text	2	45	f	Nội dung bài "Dự án cuối khóa".	\N	{}
32	13	5	memo và useMemo	1-1	Video	1	20	t	\N	\N	{}
33	13	5	Code splitting	1-2	Video	2	18	f	\N	\N	{}
34	14	6	Tạo bucket lưu trữ	1-1	Text	1	20	t	Nội dung bài "Tạo bucket lưu trữ".	\N	{}
35	14	6	Signed URL	1-2	Text	2	25	f	Nội dung bài "Signed URL".	\N	{}
36	15	7	Container là gì	1-1	Video	1	15	t	\N	\N	{}
37	16	8	Giới thiệu	1-1	Text	1	5	t	Nội dung bài "Giới thiệu".	\N	{}
38	17	9	Video: Giới thiệu khóa học	1-1	Video	1	8	t	\N	\N	{}
39	17	9	Văn hóa và bản sắc văn hóa	1-2	Text	2	10	f	Văn hóa là hệ thống các giá trị vật chất và tinh thần do con người sáng tạo và tích lũy qua quá trình hoạt động thực tiễn, trong sự tương tác giữa con người với môi trường tự nhiên và xã hội.\n\nTheo UNESCO, văn hóa bao gồm các đặc trưng về tinh thần, vật chất, trí tuệ và cảm xúc của một xã hội hay một nhóm người, không chỉ gồm nghệ thuật và văn chương mà còn cả lối sống, cách chung sống, hệ giá trị, truyền thống và tín ngưỡng.\n\nCác đặc trưng của văn hóa:\n• Tính hệ thống: các yếu tố văn hóa liên hệ chặt chẽ với nhau.\n• Tính giá trị: văn hóa là thước đo mức độ nhân bản của xã hội.\n• Tính nhân sinh: văn hóa là sản phẩm do con người tạo ra, phân biệt với tự nhiên.\n• Tính lịch sử: văn hóa được tích lũy và truyền lại qua nhiều thế hệ.\n\nBản sắc văn hóa là tổng thể những nét riêng, đặc trưng và tương đối bền vững của văn hóa một cộng đồng, giúp phân biệt cộng đồng đó với các cộng đồng khác.\n\nCần phân biệt văn hóa với văn minh (trình độ phát triển, thiên về vật chất – kỹ thuật), văn hiến (văn hóa thiên về giá trị tinh thần, truyền thống lâu đời) và văn vật (văn hóa thiên về di tích, hiện vật).\n\n———\nNguồn tham khảo:\n• Văn hóa Việt Nam – Wikipedia tiếng Việt (CC BY-SA 4.0): https://vi.wikipedia.org/wiki/Văn_hóa_Việt_Nam	\N	{}
40	17	9	Chủ thể và không gian văn hóa Việt Nam	1-3	Text	3	12	f	Chủ thể văn hóa Việt Nam là cộng đồng 54 dân tộc, trong đó người Kinh (Việt) chiếm khoảng 85% dân số. Các dân tộc thiểu số như Tày, Thái, Mường, Khmer, Hoa, Nùng, H'Mông, Chăm... đều có bản sắc riêng, góp phần tạo nên sự đa dạng trong thống nhất của văn hóa Việt Nam.\n\nVề không gian, Việt Nam nằm ở Đông Nam Á, khí hậu nhiệt đới gió mùa, nóng ẩm, nhiều sông ngòi. Nền tảng văn hóa gốc là văn hóa Đông Nam Á, thuộc loại hình văn hóa gốc nông nghiệp.\n\nCác vùng văn hóa thường được chia như sau:\n• Tây Bắc và Việt Bắc: văn hóa các dân tộc miền núi, ruộng bậc thang, nhà sàn.\n• Châu thổ Bắc Bộ: cái nôi của văn hóa Việt, nền văn minh sông Hồng, làng xã.\n• Trung Bộ: dấu ấn văn hóa Chăm Pa, kinh đô Huế.\n• Tây Nguyên: văn hóa cồng chiêng, nhà rông, sử thi.\n• Nam Bộ: vùng đất mở, giao thoa Việt – Khmer – Hoa – Chăm, văn hóa sông nước.\n\nTiến trình lịch sử văn hóa gồm các lớp: văn hóa bản địa (Đông Sơn, Sa Huỳnh, Óc Eo), lớp giao lưu với Trung Hoa và khu vực, và lớp giao lưu với phương Tây từ thế kỷ XVII trở đi.\n\n———\nNguồn tham khảo:\n• Văn hóa Việt Nam – Wikipedia tiếng Việt (CC BY-SA 4.0): https://vi.wikipedia.org/wiki/Văn_hóa_Việt_Nam	\N	{}
41	18	9	Văn hóa nông nghiệp lúa nước	2-1	Text	1	12	f	Nghề trồng lúa nước đã chi phối sâu sắc lối sống và tư duy của người Việt.\n\nNhững đặc điểm của văn hóa gốc nông nghiệp:\n• Sống định cư, gắn bó với làng xã. Làng là đơn vị cơ bản của xã hội truyền thống, với cây đa, giếng nước, sân đình.\n• Tính cộng đồng cao: mọi người cùng làm thủy lợi, cùng chống thiên tai. Mặt trái là tâm lý dựa dẫm, đố kỵ, "cào bằng".\n• Tính tự trị của làng: mỗi làng có hương ước riêng. Câu "phép vua thua lệ làng" phản ánh điều này.\n• Tư duy tổng hợp, biện chứng, coi trọng các mối quan hệ, ưa sự hài hòa.\n• Lối sống trọng tình hơn trọng lý, trọng văn hơn trọng võ, trọng nữ, ứng xử mềm dẻo, linh hoạt.\n• Tôn trọng và sống hòa hợp với tự nhiên, thể hiện qua các tín ngưỡng thờ trời, đất, nước, các vị thần nông nghiệp.\n\nLịch sinh hoạt gắn với mùa vụ: lễ hội thường diễn ra vào mùa xuân và mùa thu, sau khi thu hoạch, lúc nông nhàn.\n\nBữa ăn truyền thống theo cơ cấu cơm – rau – cá, phản ánh rõ nguồn sống từ đồng ruộng và sông nước.\n\n———\nNguồn tham khảo:\n• Văn hóa Việt Nam – Wikipedia tiếng Việt (CC BY-SA 4.0): https://vi.wikipedia.org/wiki/Văn_hóa_Việt_Nam	\N	{}
42	18	9	Tam giáo và chữ viết	2-2	Text	2	12	f	Trong quá trình giao lưu với Trung Hoa và Ấn Độ, ba tôn giáo – học thuyết lớn đã du nhập và hòa quyện vào văn hóa Việt, tạo nên hiện tượng "tam giáo đồng nguyên":\n• Phật giáo: vào Việt Nam từ đầu Công nguyên, qua cả đường biển từ Ấn Độ và đường bộ từ Trung Hoa. Trung tâm Luy Lâu (Bắc Ninh) là một trong những trung tâm Phật giáo sớm nhất khu vực.\n• Nho giáo: theo chân chính quyền phương Bắc, phát triển mạnh từ thời Lê sơ, trở thành hệ tư tưởng chính thống của nhà nước phong kiến. Nho giáo đề cao trung, hiếu, lễ, nghĩa và việc học hành, thi cử.\n• Đạo giáo: hòa nhập với tín ngưỡng dân gian, thể hiện trong các hình thức bùa chú, đồng bóng, thờ các vị thần tiên.\n\nTiến trình chữ viết:\n• Chữ Hán: chữ viết chính thức trong hành chính, khoa cử suốt nhiều thế kỷ.\n• Chữ Nôm: do người Việt sáng tạo dựa trên chữ Hán để ghi tiếng Việt. Nhiều tác phẩm lớn như Truyện Kiều của Nguyễn Du được viết bằng chữ Nôm.\n• Chữ Quốc ngữ: dùng chữ cái Latinh, hình thành từ thế kỷ XVII với công lao của các giáo sĩ phương Tây. Ngày nay là chữ viết chính thức của Việt Nam.\n\n———\nNguồn tham khảo:\n• Văn hóa Việt Nam – Wikipedia tiếng Việt (CC BY-SA 4.0): https://vi.wikipedia.org/wiki/Văn_hóa_Việt_Nam	\N	{}
43	18	9	Phật giáo thời Lý – Trần và An Nam tứ đại khí	2-3	Text	3	10	f	Thời Lý (1009–1225) và Trần (1225–1400) là giai đoạn cực thịnh của Phật giáo Việt Nam. Nhiều nhà vua, hoàng thân theo đạo Phật. Vua Trần Nhân Tông sau khi nhường ngôi đã xuất gia và sáng lập Thiền phái Trúc Lâm Yên Tử, một dòng thiền mang đậm tinh thần nhập thế của người Việt.\n\nDấu ấn tiêu biểu của thời kỳ này là "An Nam tứ đại khí", bốn công trình bằng đồng lớn, đều là di sản của văn hóa Phật giáo:\n• Tháp Báo Thiên ở kinh thành Thăng Long.\n• Tượng Phật chùa Quỳnh Lâm (Quảng Ninh).\n• Chuông Quy Điền (chuông chùa Một Cột).\n• Vạc Phổ Minh ở chùa Phổ Minh (Nam Định).\n\nĐáng tiếc là cả bốn công trình đều không còn. Nhiều tư liệu cho rằng chúng bị quân Minh phá hủy, lấy đồng đúc vũ khí trong thời kỳ đô hộ đầu thế kỷ XV.\n\nCác công trình kiến trúc Phật giáo nổi tiếng còn lại đến nay gồm chùa Một Cột (Diên Hựu), chùa Dâu, chùa Phật Tích, chùa Keo và quần thể Yên Tử.\n\n———\nNguồn tham khảo:\n• Văn hóa Việt Nam – Wikipedia tiếng Việt (CC BY-SA 4.0): https://vi.wikipedia.org/wiki/Văn_hóa_Việt_Nam	\N	{}
44	19	9	Tín ngưỡng dân gian	3-1	Text	1	12	f	Các tín ngưỡng tiêu biểu của người Việt:\n\n• Tín ngưỡng phồn thực: cầu mong sự sinh sôi nảy nở của con người và mùa màng. Thể hiện qua thờ sinh thực khí, các hình ảnh trên trống đồng, tục giã cối đón dâu.\n• Tín ngưỡng sùng bái tự nhiên: thờ các nữ thần Mây, Mưa, Sấm, Chớp (Tứ Pháp), thờ Mẫu, thờ động vật và thực vật như rắn, cây đa, cây lúa.\n• Thờ cúng tổ tiên: tín ngưỡng phổ biến nhất. Gần như nhà nào cũng có bàn thờ tổ tiên, thể hiện đạo hiếu và tư tưởng "uống nước nhớ nguồn". Ngày giỗ được coi trọng hơn ngày sinh.\n• Thờ Thổ Công (thần đất trong nhà), Thành Hoàng làng (vị thần bảo hộ cả làng, thờ ở đình), và thờ vua – thờ anh hùng dân tộc như Hùng Vương, Trần Hưng Đạo.\n• Tín ngưỡng thờ Mẫu Tam phủ, Tứ phủ: được UNESCO công nhận là di sản văn hóa phi vật thể đại diện của nhân loại năm 2016.\n\nĐặc điểm chung của tín ngưỡng Việt là tính đa thần, tính dung hợp và tôn vinh vai trò của người phụ nữ.\n\n———\nNguồn tham khảo:\n• Văn hóa Việt Nam – Wikipedia tiếng Việt (CC BY-SA 4.0): https://vi.wikipedia.org/wiki/Văn_hóa_Việt_Nam	\N	{}
45	19	9	Lễ hội và phong tục	3-2	Text	2	12	f	Lễ hội truyền thống gồm hai phần:\n• Phần lễ: nghi thức tế lễ, rước thần, cầu mong mưa thuận gió hòa, mùa màng bội thu, tưởng nhớ công ơn các vị thần, anh hùng.\n• Phần hội: các trò chơi và sinh hoạt cộng đồng như đấu vật, kéo co, đánh đu, hát quan họ, đua thuyền, chọi gà.\n\nMột số lễ hội tiêu biểu: Giỗ Tổ Hùng Vương (10/3 âm lịch), hội Gióng (được UNESCO công nhận năm 2010), hội chùa Hương, hội Lim, lễ hội Bà Chúa Xứ núi Sam.\n\nCác ngày tết trong năm theo âm lịch:\n• Tết Nguyên đán: tết lớn nhất, đón năm mới, đoàn tụ gia đình, cúng tổ tiên, chúc tết, lì xì.\n• Tết Nguyên tiêu (rằm tháng Giêng), Tết Hàn thực (3/3), Tết Đoan ngọ (5/5), lễ Vu lan (rằm tháng Bảy), Tết Trung thu (rằm tháng Tám), Tết ông Công ông Táo (23 tháng Chạp).\n\nPhong tục vòng đời: hôn nhân truyền thống với các lễ dạm ngõ, ăn hỏi, cưới; tang ma thể hiện quan niệm "sống gửi thác về" và đạo hiếu với cha mẹ.\n\nGiao tiếp: người Việt coi trọng chữ "lễ", xưng hô theo quan hệ họ hàng (anh, chị, cô, chú...) ngay cả với người ngoài, ưa nói vòng, tế nhị và giữ thể diện.\n\n———\nNguồn tham khảo:\n• Văn hóa Việt Nam – Wikipedia tiếng Việt (CC BY-SA 4.0): https://vi.wikipedia.org/wiki/Văn_hóa_Việt_Nam	\N	{}
46	19	9	Bài kiểm tra cuối khóa (VMLU)	3-3	Quiz	3	20	f	\N	\N	{}
47	20	10	Video: Kinh tế vĩ mô là gì?	1-1	Video	1	8	t	\N	\N	{}
48	20	10	Đối tượng của kinh tế vĩ mô	1-2	Text	2	10	f	Kinh tế vi mô nghiên cứu hành vi của từng hộ gia đình và doanh nghiệp. Kinh tế vĩ mô nghiên cứu nền kinh tế như một tổng thể.\n\nBốn mục tiêu vĩ mô chính:\n• Tăng trưởng kinh tế: sản lượng (GDP thực tế) tăng ổn định theo thời gian.\n• Việc làm đầy đủ: tỷ lệ thất nghiệp thấp, gần mức tự nhiên.\n• Ổn định giá cả: lạm phát thấp và ổn định.\n• Cân bằng bên ngoài: cán cân thanh toán và tỷ giá hối đoái ổn định.\n\nHai nhóm công cụ chính sách:\n• Chính sách tài khóa: chính phủ thay đổi chi tiêu (G) và thuế (T).\n• Chính sách tiền tệ: ngân hàng trung ương điều chỉnh lượng cung tiền và lãi suất.\n\nCác mục tiêu này đôi khi mâu thuẫn. Ví dụ, kích thích kinh tế để giảm thất nghiệp có thể làm tăng lạm phát. Nhà hoạch định chính sách phải cân nhắc đánh đổi giữa các mục tiêu.\n\n———\nNguồn tham khảo:\n• Principles of Macroeconomics 3e – OpenStax (Rice University) (CC BY 4.0): https://openstax.org/details/books/principles-macroeconomics-3e	\N	{}
49	20	10	GDP và cách tính tăng trưởng	1-3	Text	3	15	f	Tổng sản phẩm quốc nội (GDP) là tổng giá trị thị trường của tất cả hàng hóa và dịch vụ cuối cùng được sản xuất trong lãnh thổ một nước trong một thời kỳ (thường là một năm).\n\nTính GDP theo phương pháp chi tiêu:\nGDP = C + I + G + (X − M)\n• C: tiêu dùng của hộ gia đình\n• I: đầu tư của doanh nghiệp (máy móc, nhà xưởng, hàng tồn kho)\n• G: chi mua hàng hóa, dịch vụ của chính phủ (không tính chi chuyển nhượng như trợ cấp)\n• X − M: xuất khẩu ròng\n\nGDP danh nghĩa tính theo giá hiện hành. GDP thực tế tính theo giá của năm gốc, nên loại bỏ được ảnh hưởng của lạm phát.\nChỉ số giảm phát GDP = GDP danh nghĩa / GDP thực tế × 100.\n\nGNP (hay GNI) = GDP + thu nhập ròng từ nước ngoài, tính theo quyền sở hữu của công dân thay vì theo lãnh thổ.\n\nTỷ lệ tăng trưởng = (GDP thực năm t − GDP thực năm t−1) / GDP thực năm t−1 × 100%.\nVí dụ: GDP bình quân thực tế năm 2000 là 18.073 USD, năm 2001 là 18.635 USD. Tốc độ tăng trưởng = (18.635 − 18.073) / 18.073 ≈ 3,1%.\n\n———\nNguồn tham khảo:\n• Principles of Macroeconomics 3e – OpenStax (Rice University) (CC BY 4.0): https://openstax.org/details/books/principles-macroeconomics-3e	\N	{}
50	21	10	Thất nghiệp	2-1	Text	1	12	f	Lực lượng lao động gồm những người trong độ tuổi lao động đang có việc làm hoặc đang tích cực tìm việc. Người không tìm việc (sinh viên đi học, người nội trợ, người đã nghỉ hưu) không thuộc lực lượng lao động.\n\nTỷ lệ thất nghiệp = số người thất nghiệp / lực lượng lao động × 100%.\n\nCác loại thất nghiệp:\n• Thất nghiệp tạm thời (cọ xát): người lao động đang chuyển việc hoặc mới tốt nghiệp, đang tìm việc phù hợp.\n• Thất nghiệp cơ cấu: kỹ năng của người lao động không khớp với nhu cầu, ví dụ do công nghệ thay đổi hoặc ngành nghề suy giảm.\n• Thất nghiệp chu kỳ: phát sinh khi nền kinh tế suy thoái, tổng cầu giảm.\n\nTỷ lệ thất nghiệp tự nhiên = thất nghiệp tạm thời + thất nghiệp cơ cấu. Đây là mức thất nghiệp khi thị trường lao động cân bằng.\n\nTrạng thái toàn dụng nhân công (việc làm đầy đủ) không có nghĩa là không còn ai thất nghiệp. Nó có nghĩa là thất nghiệp chỉ ở mức tự nhiên, không có thất nghiệp chu kỳ. Khi đó nền kinh tế vẫn có thể có một tỷ lệ lạm phát nhất định.\n\nĐịnh luật Okun: khi thất nghiệp thực tế cao hơn mức tự nhiên 1 điểm phần trăm, sản lượng thực tế thấp hơn sản lượng tiềm năng khoảng 2–2,5%.\n\n———\nNguồn tham khảo:\n• Principles of Macroeconomics 3e – OpenStax (Rice University) (CC BY 4.0): https://openstax.org/details/books/principles-macroeconomics-3e	\N	{}
51	21	10	Lạm phát và chỉ số giá tiêu dùng	2-2	Text	2	12	f	Lạm phát là sự tăng lên liên tục của mức giá chung theo thời gian.\n\nChỉ số giá tiêu dùng (CPI) đo chi phí của một giỏ hàng hóa, dịch vụ cố định mà một hộ gia đình điển hình mua, so với năm gốc:\nCPI năm t = chi phí giỏ hàng năm t / chi phí giỏ hàng năm gốc × 100\nTỷ lệ lạm phát = (CPIₜ − CPIₜ₋₁) / CPIₜ₋₁ × 100%\n\nNguyên nhân của lạm phát:\n• Lạm phát do cầu kéo: tổng cầu tăng nhanh hơn khả năng sản xuất, ví dụ do chi tiêu chính phủ tăng mạnh hoặc in thêm tiền.\n• Lạm phát do chi phí đẩy: chi phí sản xuất tăng (giá xăng dầu, tiền lương, nguyên liệu nhập khẩu) làm tổng cung giảm.\n• Theo thuyết số lượng tiền tệ (MV = PY): cung tiền tăng nhanh hơn sản lượng thì giá cả sẽ tăng.\n\nTác hại: thu nhập thực tế của người có lương cố định giảm, người cho vay bị thiệt, giá cả khó dự đoán làm doanh nghiệp ngại đầu tư.\n\nLãi suất thực ≈ lãi suất danh nghĩa − tỷ lệ lạm phát.\n\n———\nNguồn tham khảo:\n• Principles of Macroeconomics 3e – OpenStax (Rice University) (CC BY 4.0): https://openstax.org/details/books/principles-macroeconomics-3e	\N	{}
52	21	10	Mô hình tổng cung – tổng cầu (AD–AS)	2-3	Text	3	12	f	Tổng cầu (AD) là tổng lượng hàng hóa, dịch vụ mà mọi tác nhân trong nền kinh tế muốn mua ở mỗi mức giá chung: AD = C + I + G + NX. Đường AD dốc xuống: khi mức giá giảm, của cải thực tế tăng, lãi suất giảm, hàng trong nước rẻ hơn hàng ngoại, nên lượng cầu tăng.\n\nTổng cung (AS) là tổng lượng hàng hóa, dịch vụ mà doanh nghiệp muốn sản xuất ở mỗi mức giá.\n• Trong ngắn hạn, AS dốc lên vì tiền lương và một số giá khác chậm điều chỉnh.\n• Trong dài hạn, AS thẳng đứng tại mức sản lượng tiềm năng, do nguồn lực và công nghệ quyết định.\n\nCác cú sốc:\n• AD tăng (chính phủ tăng chi tiêu, giảm thuế, cung tiền tăng): sản lượng tăng và giá tăng.\n• AS giảm (giá dầu tăng mạnh): sản lượng giảm và giá tăng cùng lúc. Hiện tượng này gọi là lạm phát đình trệ (stagflation).\n\nMô hình AD–AS giúp giải thích vì sao các chính sách kích cầu có thể giảm thất nghiệp trong ngắn hạn nhưng gây lạm phát nếu sản lượng vượt mức tiềm năng.\n\n———\nNguồn tham khảo:\n• Principles of Macroeconomics 3e – OpenStax (Rice University) (CC BY 4.0): https://openstax.org/details/books/principles-macroeconomics-3e	\N	{}
53	22	10	Ngân hàng trung ương và chính sách tiền tệ	3-1	Text	1	15	f	Ngân hàng trung ương (NHTW, ở Việt Nam là Ngân hàng Nhà nước) kiểm soát cung tiền.\n\nCơ sở tiền tệ (tiền mạnh, MB) = tiền mặt trong lưu thông + dự trữ của các ngân hàng thương mại.\nCung tiền M = số nhân tiền × MB.\n\nCông cụ của chính sách tiền tệ:\n• Nghiệp vụ thị trường mở: NHTW mua trái phiếu thì bơm tiền ra, cơ sở tiền tệ tăng; bán trái phiếu thì hút tiền về.\n• Tỷ lệ dự trữ bắt buộc: hạ tỷ lệ thì số nhân tiền tăng, cung tiền tăng.\n• Lãi suất chiết khấu/tái cấp vốn: hạ lãi suất khuyến khích ngân hàng vay NHTW nhiều hơn.\n• Cho các ngân hàng thương mại vay, hoặc mua ngoại tệ, đều làm tăng cơ sở tiền tệ. Bán ngoại tệ thì làm giảm.\n\nHai hướng chính sách:\n• Mở rộng (nới lỏng): tăng cung tiền, giảm lãi suất, kích thích đầu tư và tiêu dùng. Dùng khi kinh tế suy thoái.\n• Thu hẹp (thắt chặt): giảm cung tiền, tăng lãi suất. Dùng khi nền kinh tế có lạm phát cao.\n\n———\nNguồn tham khảo:\n• Principles of Macroeconomics 3e – OpenStax (Rice University) (CC BY 4.0): https://openstax.org/details/books/principles-macroeconomics-3e	\N	{}
54	22	10	Chính sách tài khóa, thương mại và tỷ giá	3-2	Text	2	15	f	Chính sách tài khóa:\n• Mở rộng: tăng chi tiêu chính phủ (G) hoặc giảm thuế (T) để tăng tổng cầu khi suy thoái.\n• Thu hẹp: giảm chi tiêu ngân sách và tăng thuế để kiềm chế lạm phát.\n• Số nhân chi tiêu: 1 đồng chi tiêu của chính phủ có thể làm GDP tăng hơn 1 đồng, vì thu nhập tăng lại dẫn đến tiêu dùng tăng.\n• Thâm hụt ngân sách xảy ra khi chi tiêu lớn hơn thu thuế. Vay nợ để bù thâm hụt có thể đẩy lãi suất lên, làm giảm đầu tư tư nhân (hiện tượng lấn át – crowding out).\n\nCán cân thương mại = xuất khẩu − nhập khẩu. Thâm hụt thương mại có thể do: thu nhập trong nước tăng làm nhập khẩu tăng, đồng nội tệ lên giá làm hàng trong nước đắt hơn với người nước ngoài, hoặc thu nhập của các nước đối tác giảm làm xuất khẩu giảm.\n\nTỷ giá hối đoái là giá của một đơn vị ngoại tệ tính bằng nội tệ.\n• Trong cơ chế tỷ giá thả nổi, tỷ giá do cung cầu ngoại tệ quyết định.\n• Trong cơ chế tỷ giá cố định, NHTW phải can thiệp để giữ tỷ giá. Khi dư cung ngoại tệ, NHTW dùng nội tệ mua vào lượng ngoại tệ dư thừa. Khi dư cầu ngoại tệ, NHTW bán ngoại tệ từ dự trữ ra.\n\n———\nNguồn tham khảo:\n• Principles of Macroeconomics 3e – OpenStax (Rice University) (CC BY 4.0): https://openstax.org/details/books/principles-macroeconomics-3e	\N	{}
55	22	10	Bài kiểm tra cuối khóa (VMLU)	3-3	Quiz	3	20	f	\N	\N	{}
56	23	11	Video: Mạng máy tính quanh ta	1-1	Video	1	8	t	\N	\N	{}
57	23	11	Mạng máy tính là gì?	1-2	Text	2	10	f	Mạng máy tính là tập hợp các thiết bị (máy tính, điện thoại, máy in, máy chủ...) được nối với nhau để chia sẻ dữ liệu và tài nguyên.\n\nPhân loại theo phạm vi địa lý:\n• LAN (Local Area Network): mạng cục bộ trong một tòa nhà, trường học, văn phòng.\n• MAN (Metropolitan Area Network): mạng trong phạm vi một thành phố.\n• WAN (Wide Area Network): mạng diện rộng, nối nhiều quốc gia. Internet là WAN lớn nhất.\n\nCấu trúc liên kết (topology) phổ biến:\n• Bus: mọi máy nối vào một đường cáp chung. Đứt cáp chính thì cả mạng ngừng.\n• Star (hình sao): mọi máy nối về một thiết bị trung tâm (switch). Dễ mở rộng, phổ biến nhất hiện nay.\n• Ring (vòng): các máy nối thành vòng khép kín, dữ liệu đi theo một chiều.\n• Mesh (lưới): các máy nối với nhau bằng nhiều đường, có khả năng dự phòng cao.\n\nMô hình hoạt động:\n• Client–server: máy khách gửi yêu cầu, máy chủ phục vụ (ví dụ trình duyệt và web server).\n• Peer-to-peer (P2P): các máy ngang hàng, vừa là khách vừa là chủ.\n\n———\nNguồn tham khảo:\n• Computer Networking: Principles, Protocols and Practice – Olivier Bonaventure (CC BY 3.0): https://www.computer-networking.info/	\N	{}
58	23	11	Giao thức và kiến trúc phân tầng	1-3	Text	3	10	f	Giao thức (protocol) là tập quy tắc mà các bên phải tuân theo khi trao đổi dữ liệu. Một giao thức quy định:\n• Định dạng của thông điệp.\n• Thứ tự gửi và nhận thông điệp.\n• Hành động cần làm khi nhận được thông điệp hoặc khi có lỗi.\n\nVí dụ: HTTP (web), SMTP (gửi thư), DNS (phân giải tên miền), TCP, UDP, IP.\n\nVì sao cần phân tầng?\nTruyền dữ liệu qua mạng là bài toán rất phức tạp. Người ta chia nó thành nhiều tầng, mỗi tầng giải quyết một phần việc và chỉ cung cấp dịch vụ cho tầng ngay trên nó. Nhờ vậy:\n• Mỗi tầng có thể thay đổi cách làm mà không ảnh hưởng các tầng khác.\n• Thiết bị và phần mềm của nhiều hãng khác nhau vẫn làm việc được với nhau.\n\nHai mô hình phân tầng quan trọng là mô hình tham chiếu OSI (7 tầng) của ISO và mô hình TCP/IP (4 tầng) mà Internet đang dùng.\n\n———\nNguồn tham khảo:\n• Computer Networking: Principles, Protocols and Practice – Olivier Bonaventure (CC BY 3.0): https://www.computer-networking.info/	\N	{}
59	24	11	Bảy tầng của mô hình OSI	2-1	Text	1	15	f	Mô hình OSI gồm 7 tầng, đánh số từ dưới lên:\n\n1. Vật lý (Physical): truyền các bit 0/1 qua môi trường (cáp đồng, cáp quang, sóng vô tuyến). Quy định điện áp, đầu nối, tốc độ truyền.\n2. Liên kết dữ liệu (Data Link): đóng dữ liệu thành khung (frame), dùng địa chỉ MAC để truyền giữa hai nút kề nhau, phát hiện lỗi. Switch làm việc ở tầng này.\n3. Mạng (Network): tạo gói tin (packet), đánh địa chỉ logic (IP) và chọn đường đi (định tuyến) qua nhiều mạng. Router làm việc ở tầng này.\n4. Giao vận (Transport): truyền dữ liệu giữa hai tiến trình đầu cuối, chia dữ liệu thành đoạn (segment). TCP đảm bảo tin cậy, đúng thứ tự; UDP nhanh nhưng không đảm bảo.\n5. Phiên (Session): thiết lập, duy trì và kết thúc phiên làm việc giữa hai ứng dụng.\n6. Trình diễn (Presentation): chuyển đổi định dạng, mã hóa, nén dữ liệu.\n7. Ứng dụng (Application): giao tiếp trực tiếp với người dùng qua các giao thức như HTTP, FTP, SMTP, DNS.\n\nMẹo nhớ từ tầng 1 lên tầng 7: "Please Do Not Throw Sausage Pizza Away".\n\n———\nNguồn tham khảo:\n• Computer Networking: Principles, Protocols and Practice – Olivier Bonaventure (CC BY 3.0): https://www.computer-networking.info/	\N	{}
60	24	11	Đóng gói dữ liệu (encapsulation)	2-2	Text	2	10	f	Khi gửi dữ liệu, mỗi tầng thêm phần thông tin điều khiển (header) của mình vào dữ liệu nhận từ tầng trên. Quá trình này gọi là đóng gói.\n\nTên gọi đơn vị dữ liệu (PDU) ở từng tầng theo thứ tự đóng gói:\n• Tầng ứng dụng: Data (dữ liệu)\n• Tầng giao vận: Segment (đoạn), thêm số cổng nguồn/đích\n• Tầng mạng: Packet (gói tin), thêm địa chỉ IP nguồn/đích\n• Tầng liên kết dữ liệu: Frame (khung), thêm địa chỉ MAC và phần kiểm tra lỗi\n• Tầng vật lý: Bit\n\nThứ tự đúng: Data → Segment → Packet → Frame → Bit.\n\nỞ phía nhận, quá trình diễn ra ngược lại (mở gói, de-encapsulation): mỗi tầng đọc và gỡ header của mình rồi chuyển phần còn lại lên tầng trên, cho tới khi ứng dụng nhận được dữ liệu ban đầu.\n\n———\nNguồn tham khảo:\n• Computer Networking: Principles, Protocols and Practice – Olivier Bonaventure (CC BY 3.0): https://www.computer-networking.info/	\N	{}
61	24	11	Mô hình TCP/IP	2-3	Text	3	10	f	Mô hình TCP/IP là mô hình thực tế của Internet, gồm 4 tầng:\n\n1. Truy cập mạng (Network Access/Link): tương ứng tầng 1 và 2 của OSI. Ví dụ Ethernet, Wi-Fi.\n2. Internet: tương ứng tầng 3 của OSI. Giao thức chính là IP, cùng ICMP (dùng cho lệnh ping) và ARP (tìm địa chỉ MAC từ địa chỉ IP).\n3. Giao vận (Transport): tương ứng tầng 4. Gồm TCP và UDP.\n4. Ứng dụng (Application): gộp tầng 5, 6, 7 của OSI. Ví dụ HTTP/HTTPS, DNS, SMTP, FTP, SSH.\n\nSo sánh TCP và UDP:\n• TCP: hướng kết nối (bắt tay 3 bước), có xác nhận, gửi lại khi mất gói, đảm bảo đúng thứ tự. Dùng cho web, email, truyền file.\n• UDP: không kết nối, không xác nhận, độ trễ thấp. Dùng cho gọi video, game trực tuyến, DNS.\n\nMột số cổng thông dụng: HTTP 80, HTTPS 443, DNS 53, SMTP 25, FTP 21, SSH 22.\n\n———\nNguồn tham khảo:\n• Computer Networking: Principles, Protocols and Practice – Olivier Bonaventure (CC BY 3.0): https://www.computer-networking.info/	\N	{}
62	25	11	Địa chỉ IP và mặt nạ mạng con	3-1	Text	1	15	f	Địa chỉ IPv4 dài 32 bit, viết thành 4 số thập phân từ 0 đến 255, ví dụ 192.168.1.10.\n\nMỗi địa chỉ gồm hai phần: phần mạng (network) và phần máy (host). Mặt nạ mạng con (subnet mask) cho biết bao nhiêu bit đầu là phần mạng. Ví dụ 255.255.255.0, viết gọn là /24, nghĩa là 24 bit đầu là phần mạng.\n\nCác lớp địa chỉ truyền thống (theo số đầu tiên):\n• Lớp A: 1–126, mặt nạ mặc định 255.0.0.0\n• Lớp B: 128–191, mặt nạ mặc định 255.255.0.0\n• Lớp C: 192–223, mặt nạ mặc định 255.255.255.0\n• Lớp D (224–239) dùng cho multicast, lớp E dành cho nghiên cứu.\n• 127.x.x.x là địa chỉ loopback (máy tự gọi chính nó).\n\nDải địa chỉ riêng (dùng trong mạng nội bộ, không định tuyến trên Internet): 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16.\n\nVới mạng /24: có 2^8 = 256 địa chỉ, trừ địa chỉ mạng và địa chỉ quảng bá (broadcast) còn 254 địa chỉ dùng cho máy.\n\nIPv6 dài 128 bit, viết bằng hệ 16, ra đời để giải quyết tình trạng cạn kiệt địa chỉ IPv4.\n\n———\nNguồn tham khảo:\n• Computer Networking: Principles, Protocols and Practice – Olivier Bonaventure (CC BY 3.0): https://www.computer-networking.info/	\N	{}
63	25	11	Các thiết bị mạng	3-2	Text	2	10	f	Mỗi thiết bị mạng hoạt động chủ yếu ở một tầng của mô hình OSI:\n\n• Repeater (bộ lặp) – tầng 1: khuếch đại tín hiệu để kéo dài khoảng cách truyền.\n• Hub – tầng 1: nhận tín hiệu ở một cổng và phát ra tất cả các cổng còn lại. Mọi máy chung một miền đụng độ.\n• Bridge (cầu nối) – tầng 2: nối hai đoạn mạng, lọc khung dựa trên địa chỉ MAC.\n• Switch (bộ chuyển mạch) – tầng 2: học địa chỉ MAC của các máy và chỉ chuyển khung tới đúng cổng đích. Mỗi cổng là một miền đụng độ riêng.\n• Router (bộ định tuyến) – tầng 3: nối các mạng khác nhau, chọn đường đi cho gói tin dựa trên địa chỉ IP và bảng định tuyến. Router chia tách các miền quảng bá.\n• Gateway (cổng nối): chuyển đổi giữa các mạng dùng giao thức khác nhau, có thể hoạt động ở nhiều tầng.\n• Access point (điểm truy cập không dây): cho phép thiết bị Wi-Fi tham gia vào mạng LAN có dây.\n\nTrong mạng gia đình, "modem Wi-Fi" thường là một thiết bị gộp cả router, switch và access point.\n\n———\nNguồn tham khảo:\n• Computer Networking: Principles, Protocols and Practice – Olivier Bonaventure (CC BY 3.0): https://www.computer-networking.info/	\N	{}
64	25	11	Bài kiểm tra cuối khóa (VMLU)	3-3	Quiz	3	20	f	\N	\N	{}
65	26	12	Video: Giới thiệu khóa học	1-1	Video	1	8	t	\N	\N	{}
66	26	12	Lịch sử và đặc điểm của ngôn ngữ C	1-2	Text	2	10	f	Ngôn ngữ C được Dennis Ritchie phát triển tại Bell Labs vào khoảng năm 1972. C kế thừa từ ngôn ngữ B của Ken Thompson, và B lại bắt nguồn từ BCPL. Mục tiêu ban đầu của C là viết lại hệ điều hành Unix sao cho dễ chuyển sang nhiều loại máy khác nhau.\n\nCác mốc chính:\n• 1978: Kernighan và Ritchie xuất bản cuốn "The C Programming Language" (thường gọi là K&R C).\n• 1989/1990: chuẩn ANSI C (C89/C90) ra đời.\n• Các chuẩn tiếp theo: C99, C11, C17 và C23.\n\nĐặc điểm của C:\n• Là ngôn ngữ lập trình có cấu trúc (structured) và thủ tục (procedural): chương trình được chia thành các hàm, dùng các cấu trúc điều khiển if, for, while.\n• Là ngôn ngữ biên dịch: mã nguồn được dịch ra mã máy trước khi chạy, nên chương trình chạy nhanh.\n• Gần với phần cứng: cho phép làm việc trực tiếp với bộ nhớ qua con trỏ, vì vậy C được dùng nhiều cho hệ điều hành, trình điều khiển thiết bị và hệ thống nhúng.\n• Có tính khả chuyển: cùng một mã nguồn có thể biên dịch trên nhiều nền tảng.\n\nNhiều ngôn ngữ hiện đại như C++, Java, C# hay Go đều chịu ảnh hưởng cú pháp của C, nên học C là nền tảng tốt để học các ngôn ngữ khác.\n\n———\nNguồn tham khảo:\n• Modern C – Jens Gustedt (Bản PDF miễn phí, giấy phép Creative Commons phi thương mại): https://livebook.manning.com/book/modern-c-third-edition/title\n• C (ngôn ngữ lập trình) – Wikipedia tiếng Việt (CC BY-SA 4.0): https://vi.wikipedia.org/wiki/C_(ngôn_ngữ_lập_trình)	\N	{}
67	26	12	Chương trình C đầu tiên	1-3	Text	3	12	f	Một chương trình C đơn giản:\n\n    #include <stdio.h>\n\n    int main(void) {\n        printf("Xin chào EduLine!\\n");\n        return 0;\n    }\n\nGiải thích từng dòng:\n• #include <stdio.h> nạp thư viện nhập xuất chuẩn, trong đó có hàm printf.\n• int main(void) là hàm chính. Mọi chương trình C đều bắt đầu chạy từ hàm main.\n• printf(...) in chuỗi ra màn hình. Ký tự \\n là xuống dòng.\n• return 0; báo cho hệ điều hành biết chương trình kết thúc thành công.\n• Mỗi câu lệnh kết thúc bằng dấu chấm phẩy (;). Khối lệnh được bao bởi cặp ngoặc nhọn { }.\n\nBiên dịch và chạy bằng gcc:\n\n    gcc hello.c -o hello\n    ./hello\n\nQuy trình gồm: tiền xử lý (xử lý #include, #define), biên dịch ra mã đối tượng, rồi liên kết với thư viện để tạo file chạy được.\n\nGhi chú trong C: // cho một dòng, /* ... */ cho nhiều dòng. Trình biên dịch bỏ qua phần ghi chú.\n\n———\nNguồn tham khảo:\n• Modern C – Jens Gustedt (Bản PDF miễn phí, giấy phép Creative Commons phi thương mại): https://livebook.manning.com/book/modern-c-third-edition/title\n• C (ngôn ngữ lập trình) – Wikipedia tiếng Việt (CC BY-SA 4.0): https://vi.wikipedia.org/wiki/C_(ngôn_ngữ_lập_trình)	\N	{}
68	27	12	Biến và quy tắc đặt tên	2-1	Text	1	10	f	Biến là một vùng nhớ có tên, dùng để lưu giá trị. Trong C, biến phải được khai báo kèm kiểu trước khi dùng:\n\n    int tuoi = 20;\n    double diem_tb;\n\nQuy tắc đặt tên (định danh) trong C:\n• Chỉ gồm chữ cái tiếng Anh (a–z, A–Z), chữ số (0–9) và dấu gạch dưới (_).\n• Không được bắt đầu bằng chữ số.\n• Không chứa khoảng trắng, dấu gạch ngang hay ký tự đặc biệt như @, #, $.\n• Không trùng với từ khóa của C (int, float, return, if, while, ...).\n• Phân biệt chữ hoa và chữ thường: Tong và tong là hai biến khác nhau.\n\nVí dụ:\n• Hợp lệ: so_luong, _dem, x1, TongTien\n• Không hợp lệ: 1x (bắt đầu bằng số), so-luong (có dấu gạch ngang), tong tien (có khoảng trắng), int (là từ khóa)\n\nNên đặt tên có nghĩa, ví dụ diem_toan thay vì d1, để chương trình dễ đọc.\n\n———\nNguồn tham khảo:\n• Modern C – Jens Gustedt (Bản PDF miễn phí, giấy phép Creative Commons phi thương mại): https://livebook.manning.com/book/modern-c-third-edition/title\n• C (ngôn ngữ lập trình) – Wikipedia tiếng Việt (CC BY-SA 4.0): https://vi.wikipedia.org/wiki/C_(ngôn_ngữ_lập_trình)	\N	{}
69	27	12	Kiểu dữ liệu cơ bản	2-2	Text	2	10	f	C có bốn kiểu dữ liệu cơ bản:\n• char: một ký tự, thường chiếm 1 byte. Ví dụ: char c = 'A';\n• int: số nguyên, thường chiếm 4 byte. Ví dụ: int n = 42;\n• float: số thực độ chính xác đơn, thường 4 byte. Ví dụ: float x = 3.14f;\n• double: số thực độ chính xác kép, thường 8 byte. Ví dụ: double y = 2.718281828;\n\nCác từ bổ nghĩa thay đổi phạm vi giá trị:\n• short, long, long long: thay đổi kích thước số nguyên.\n• signed, unsigned: có dấu hoặc không dấu. unsigned int chỉ chứa số không âm.\n\nToán tử sizeof cho biết số byte của một kiểu hoặc biến:\n\n    printf("%zu\\n", sizeof(double)); // thường in ra 8\n\nKích thước chính xác phụ thuộc vào trình biên dịch và máy, chuẩn C chỉ quy định kích thước tối thiểu.\n\nNgoài ra còn có các kiểu dẫn xuất (mảng, con trỏ, cấu trúc struct) được xây dựng từ các kiểu cơ bản.\n\n———\nNguồn tham khảo:\n• Modern C – Jens Gustedt (Bản PDF miễn phí, giấy phép Creative Commons phi thương mại): https://livebook.manning.com/book/modern-c-third-edition/title\n• C (ngôn ngữ lập trình) – Wikipedia tiếng Việt (CC BY-SA 4.0): https://vi.wikipedia.org/wiki/C_(ngôn_ngữ_lập_trình)	\N	{}
70	27	12	Nhập xuất với printf và scanf	2-3	Text	3	15	f	printf in dữ liệu theo một xâu định dạng. Mỗi đặc tả bắt đầu bằng dấu %:\n• %d hoặc %i: số nguyên (int)\n• %ld: số nguyên dài (long)\n• %u: số nguyên không dấu\n• %o: số nguyên ở hệ 8 (bát phân)\n• %x hoặc %X: số nguyên ở hệ 16 (thập lục phân)\n• %f: số thực (float, double)\n• %lf: số thực độ chính xác kép (double)\n• %e: số thực dạng khoa học, ví dụ 1.5e+03\n• %c: một ký tự\n• %s: một xâu ký tự\n• %p: địa chỉ (con trỏ), ví dụ printf("%p", &x);\n• %%: in ra chính dấu %\n\nVí dụ:\n\n    int n = 255;\n    printf("%d %o %x\\n", n, n, n); // 255 377 ff\n\nscanf đọc dữ liệu từ bàn phím, cần truyền địa chỉ biến bằng toán tử &:\n\n    int a;\n    double b;\n    scanf("%d %lf", &a, &b);\n\nLưu ý: với scanf, double bắt buộc dùng %lf. Với printf, cả %f và %lf đều in được double. Khi đọc xâu bằng %s thì không cần &, vì tên mảng đã là địa chỉ.\n\n———\nNguồn tham khảo:\n• Modern C – Jens Gustedt (Bản PDF miễn phí, giấy phép Creative Commons phi thương mại): https://livebook.manning.com/book/modern-c-third-edition/title\n• C (ngôn ngữ lập trình) – Wikipedia tiếng Việt (CC BY-SA 4.0): https://vi.wikipedia.org/wiki/C_(ngôn_ngữ_lập_trình)	\N	{}
71	28	12	Biểu thức và toán tử	3-1	Text	1	12	f	Các nhóm toán tử chính trong C:\n• Số học: + - * / %\n• Quan hệ: < <= > >= == !=\n• Logic: && (và), || (hoặc), ! (phủ định)\n• Gán: = += -= *= /= %=\n• Tăng giảm: ++ và --\n\nNhững điểm hay nhầm:\n• Phép chia hai số nguyên cho kết quả nguyên: 7 / 2 bằng 3. Muốn có 3.5 thì một toán hạng phải là số thực: 7.0 / 2.\n• Toán tử % (chia lấy dư) chỉ dùng cho số nguyên. Nếu a và b là số thực thì viết a % b là sai cú pháp; khi đó dùng hàm fmod(a, b) trong <math.h>.\n• == là so sánh, = là gán. Viết if (x = 5) sẽ gán 5 cho x chứ không so sánh.\n• C không có toán tử lũy thừa. Dùng pow(a, b) trong <math.h>; a^b trong C là phép XOR bit.\n• Phép nhân phải viết rõ: 2*a chứ không viết 2a.\n\nĐộ ưu tiên: ! và ++ cao nhất, rồi * / %, rồi + -, rồi các toán tử quan hệ, rồi &&, rồi ||, thấp nhất là phép gán. Khi không chắc chắn, hãy dùng dấu ngoặc.\n\n———\nNguồn tham khảo:\n• Modern C – Jens Gustedt (Bản PDF miễn phí, giấy phép Creative Commons phi thương mại): https://livebook.manning.com/book/modern-c-third-edition/title\n• C (ngôn ngữ lập trình) – Wikipedia tiếng Việt (CC BY-SA 4.0): https://vi.wikipedia.org/wiki/C_(ngôn_ngữ_lập_trình)	\N	{}
72	28	12	Biến toàn cục và biến cục bộ	3-2	Text	2	10	f	Phạm vi (scope) của biến là vùng chương trình có thể dùng biến đó.\n\nBiến toàn cục (global):\n• Được khai báo bên ngoài mọi hàm.\n• Dùng được ở mọi hàm từ vị trí khai báo đến cuối file.\n• Tồn tại suốt thời gian chương trình chạy, và được tự động khởi tạo bằng 0 nếu không gán giá trị đầu.\n\nBiến cục bộ (local, còn gọi là biến địa phương):\n• Được khai báo bên trong một hàm hoặc một khối { }.\n• Chỉ dùng được trong hàm hoặc khối đó.\n• Được tạo khi chương trình vào khối và mất đi khi ra khỏi khối. Nếu không khởi tạo, giá trị ban đầu là không xác định.\n\nVí dụ:\n\n    int dem = 0;          // toàn cục\n\n    void tang(void) {\n        int buoc = 1;     // cục bộ\n        dem += buoc;\n    }\n\nNếu biến cục bộ trùng tên với biến toàn cục, trong khối đó biến cục bộ sẽ che biến toàn cục.\n\nBiến cục bộ khai báo với từ khóa static vẫn chỉ dùng được trong hàm, nhưng giữ nguyên giá trị giữa các lần gọi hàm.\n\nNên hạn chế biến toàn cục, vì bất kỳ hàm nào cũng có thể thay đổi nó, khiến chương trình khó kiểm soát.\n\n———\nNguồn tham khảo:\n• Modern C – Jens Gustedt (Bản PDF miễn phí, giấy phép Creative Commons phi thương mại): https://livebook.manning.com/book/modern-c-third-edition/title\n• C (ngôn ngữ lập trình) – Wikipedia tiếng Việt (CC BY-SA 4.0): https://vi.wikipedia.org/wiki/C_(ngôn_ngữ_lập_trình)	\N	{}
73	28	12	Bài kiểm tra cuối khóa (VMLU)	3-3	Quiz	3	20	f	\N	\N	{}
74	29	13	Video: Thống kê trong đời sống	1-1	Video	1	8	t	\N	\N	{}
75	29	13	Tổng thể, mẫu và các loại dữ liệu	1-2	Text	2	10	f	Thống kê là khoa học về thu thập, tổ chức, phân tích và diễn giải dữ liệu.\n\nKhái niệm cơ bản:\n• Tổng thể (population): toàn bộ các đối tượng cần nghiên cứu. Ví dụ: tất cả sinh viên của một trường.\n• Mẫu (sample): một phần của tổng thể được chọn ra để khảo sát. Ví dụ: 200 sinh viên được chọn ngẫu nhiên.\n• Tham số (parameter): con số mô tả tổng thể, ví dụ điểm trung bình của toàn trường.\n• Thống kê (statistic): con số tính từ mẫu, dùng để ước lượng tham số.\n\nCác loại dữ liệu:\n• Định tính (phân loại): giới tính, quê quán, chuyên ngành.\n• Định lượng rời rạc: đếm được, ví dụ số anh chị em trong gia đình.\n• Định lượng liên tục: đo được, ví dụ chiều cao, cân nặng, thời gian.\n\nCách lấy mẫu phổ biến:\n• Ngẫu nhiên đơn giản: mọi cá thể có cơ hội được chọn như nhau.\n• Phân tầng: chia tổng thể thành các nhóm rồi lấy ngẫu nhiên trong từng nhóm.\n• Hệ thống: chọn cách đều, ví dụ cứ 10 người lấy 1.\n• Theo cụm: chọn ngẫu nhiên một vài cụm rồi khảo sát toàn bộ cụm đó.\n\nMẫu tốt phải đại diện cho tổng thể. Mẫu tiện lợi (hỏi người quen) thường bị chệch.\n\n———\nNguồn tham khảo:\n• Introductory Statistics 2e – OpenStax (Rice University) (CC BY 4.0): https://openstax.org/details/books/introductory-statistics-2e	\N	{}
76	29	13	Các đại lượng đặc trưng của dữ liệu	1-3	Text	3	15	f	Đo xu hướng trung tâm:\n• Trung bình (mean): tổng các giá trị chia cho số giá trị.\n• Trung vị (median): giá trị ở giữa khi sắp xếp dữ liệu tăng dần. Ít bị ảnh hưởng bởi giá trị ngoại lai.\n• Mốt (mode): giá trị xuất hiện nhiều nhất.\n\nĐo độ phân tán:\n• Khoảng biến thiên: giá trị lớn nhất trừ giá trị nhỏ nhất.\n• Phương sai mẫu: s² = Σ(xᵢ − x̄)² / (n − 1).\n• Độ lệch chuẩn: s = √s², cùng đơn vị với dữ liệu.\n• Khoảng tứ phân vị IQR = Q3 − Q1.\n\nVí dụ với dữ liệu 2, 4, 4, 5, 10:\n• Trung bình = 25 / 5 = 5\n• Trung vị = 4\n• Mốt = 4\n• Phương sai mẫu = (9 + 1 + 1 + 0 + 25) / 4 = 9, độ lệch chuẩn = 3\n\nGiá trị 10 kéo trung bình lên cao hơn trung vị. Khi dữ liệu lệch như vậy, trung vị thường phản ánh "giá trị điển hình" tốt hơn trung bình.\n\n———\nNguồn tham khảo:\n• Introductory Statistics 2e – OpenStax (Rice University) (CC BY 4.0): https://openstax.org/details/books/introductory-statistics-2e	\N	{}
77	30	13	Phép thử, biến cố và các phép toán	2-1	Text	1	12	f	• Phép thử: một thí nghiệm hay hành động mà kết quả không biết trước, ví dụ tung đồng xu, kiểm tra một sản phẩm.\n• Không gian mẫu Ω: tập hợp tất cả kết quả có thể xảy ra.\n• Biến cố: một tập con của Ω.\n\nPhép toán trên biến cố:\n• Tổng A + B (hay A ∪ B): xảy ra khi ít nhất một trong hai biến cố xảy ra.\n• Tích AB (hay A ∩ B): xảy ra khi cả hai cùng xảy ra.\n• Biến cố đối Ā: xảy ra khi A không xảy ra. P(Ā) = 1 − P(A).\n• A và B xung khắc nếu không thể cùng xảy ra (AB = ∅).\n• Hệ đầy đủ: các biến cố đôi một xung khắc và tổng của chúng là Ω.\n\nVí dụ: kiểm tra 3 sản phẩm, gọi Aᵢ là biến cố sản phẩm thứ i tốt (i = 1, 2, 3).\n• "Cả 3 sản phẩm đều tốt" = A₁A₂A₃.\n• "Có ít nhất một sản phẩm tốt" = A₁ + A₂ + A₃.\n• "Không có sản phẩm nào tốt" = Ā₁Ā₂Ā₃, là biến cố đối của "có ít nhất một sản phẩm tốt".\n\nNếu gọi Bₖ là biến cố có đúng k sản phẩm tốt (k = 0, 1, 2, 3) thì B₀, B₁, B₂, B₃ lập thành một hệ đầy đủ.\n\n———\nNguồn tham khảo:\n• Introductory Statistics 2e – OpenStax (Rice University) (CC BY 4.0): https://openstax.org/details/books/introductory-statistics-2e	\N	{}
78	30	13	Công thức cộng, nhân và xác suất có điều kiện	2-2	Text	2	15	f	Định nghĩa cổ điển: nếu các kết quả đồng khả năng thì P(A) = số kết quả thuận lợi cho A / tổng số kết quả.\n\nCông thức cộng:\n• P(A + B) = P(A) + P(B) − P(AB)\n• Nếu A và B xung khắc: P(A + B) = P(A) + P(B)\n\nXác suất có điều kiện của A khi biết B đã xảy ra:\n• P(A|B) = P(AB) / P(B), với P(B) > 0\n\nCông thức nhân:\n• P(AB) = P(B) · P(A|B) = P(A) · P(B|A)\n• A và B độc lập khi việc xảy ra của biến cố này không ảnh hưởng đến biến cố kia. Khi đó P(AB) = P(A) · P(B).\n\nVí dụ: một hộp có 3 bi đỏ và 2 bi xanh. Lấy lần lượt 2 bi không hoàn lại. Xác suất cả hai bi đều đỏ:\nP = 3/5 · 2/4 = 6/20 = 0,3.\n\nNếu lấy có hoàn lại thì hai lần lấy độc lập: P = 3/5 · 3/5 = 0,36.\n\n———\nNguồn tham khảo:\n• Introductory Statistics 2e – OpenStax (Rice University) (CC BY 4.0): https://openstax.org/details/books/introductory-statistics-2e	\N	{}
79	30	13	Công thức xác suất toàn phần và Bayes	2-3	Text	3	15	f	Giả sử H₁, H₂, ..., Hₙ là một hệ đầy đủ các biến cố. Với biến cố A bất kỳ:\n\nCông thức xác suất toàn phần:\nP(A) = P(H₁)P(A|H₁) + P(H₂)P(A|H₂) + ... + P(Hₙ)P(A|Hₙ)\n\nCông thức Bayes (xác suất của giả thiết Hᵢ sau khi biết A đã xảy ra):\nP(Hᵢ|A) = P(Hᵢ)P(A|Hᵢ) / P(A)\n\nVí dụ: hai phân xưởng cùng sản xuất một loại sản phẩm. Phân xưởng I làm 60% sản phẩm, tỉ lệ phế phẩm 2%. Phân xưởng II làm 40%, tỉ lệ phế phẩm 5%. Lấy ngẫu nhiên một sản phẩm.\n• Xác suất sản phẩm là phế phẩm: P(A) = 0,6 · 0,02 + 0,4 · 0,05 = 0,012 + 0,020 = 0,032.\n• Biết sản phẩm là phế phẩm, xác suất nó do phân xưởng II làm ra: P(H₂|A) = 0,020 / 0,032 = 0,625.\n\nNhận xét: phân xưởng II chỉ làm 40% sản phẩm nhưng chiếm 62,5% số phế phẩm, vì tỉ lệ lỗi của nó cao hơn.\n\n———\nNguồn tham khảo:\n• Introductory Statistics 2e – OpenStax (Rice University) (CC BY 4.0): https://openstax.org/details/books/introductory-statistics-2e	\N	{}
80	31	13	Biến ngẫu nhiên rời rạc và phân phối nhị thức	3-1	Text	1	15	f	Biến ngẫu nhiên X là đại lượng nhận giá trị số tùy theo kết quả của phép thử.\n\nVới biến ngẫu nhiên rời rạc có bảng phân phối P(X = xᵢ) = pᵢ:\n• Kỳ vọng: E(X) = Σ xᵢpᵢ\n• Phương sai: V(X) = E(X²) − [E(X)]²\n• Độ lệch chuẩn: σ = √V(X)\n\nPhân phối nhị thức B(n, p): thực hiện n phép thử độc lập, mỗi lần biến cố A xảy ra với xác suất p. X là số lần A xảy ra.\n• P(X = k) = C(n, k) · pᵏ · (1 − p)ⁿ⁻ᵏ, với k = 0, 1, ..., n\n• E(X) = np\n• V(X) = np(1 − p)\n\nVí dụ: một sinh viên đoán ngẫu nhiên 10 câu trắc nghiệm, mỗi câu có 4 phương án, chỉ 1 phương án đúng. Khi đó X ~ B(10; 0,25).\n• Số câu đúng trung bình: E(X) = 10 · 0,25 = 2,5\n• Xác suất đúng đúng 3 câu: C(10, 3) · 0,25³ · 0,75⁷ ≈ 0,25\n\n———\nNguồn tham khảo:\n• Introductory Statistics 2e – OpenStax (Rice University) (CC BY 4.0): https://openstax.org/details/books/introductory-statistics-2e	\N	{}
81	31	13	Phân phối chuẩn	3-2	Text	2	12	f	Phân phối chuẩn N(μ, σ²) có đồ thị hình chuông, đối xứng qua giá trị trung bình μ. Rất nhiều đại lượng trong tự nhiên và xã hội có phân phối gần chuẩn: chiều cao, sai số đo, điểm thi của số đông.\n\nQuy tắc 68–95–99,7:\n• Khoảng 68% giá trị nằm trong μ ± σ\n• Khoảng 95% giá trị nằm trong μ ± 2σ\n• Khoảng 99,7% giá trị nằm trong μ ± 3σ\n\nChuẩn hóa: với X ~ N(μ, σ²), đặt Z = (X − μ) / σ thì Z ~ N(0, 1). Giá trị z cho biết một quan sát cách trung bình bao nhiêu độ lệch chuẩn. Sau đó tra bảng phân phối chuẩn tắc (hàm Laplace) để tính xác suất.\n\nVí dụ: điểm thi có phân phối N(65, 10²). Một bạn được 85 điểm thì z = (85 − 65) / 10 = 2, tức là cao hơn trung bình 2 độ lệch chuẩn. Theo quy tắc trên, chỉ khoảng 2,5% thí sinh đạt từ 85 điểm trở lên.\n\nĐịnh lý giới hạn trung tâm: trung bình của một mẫu đủ lớn có phân phối xấp xỉ chuẩn, bất kể tổng thể ban đầu có phân phối gì. Đây là cơ sở của ước lượng và kiểm định thống kê.\n\n———\nNguồn tham khảo:\n• Introductory Statistics 2e – OpenStax (Rice University) (CC BY 4.0): https://openstax.org/details/books/introductory-statistics-2e	\N	{}
82	31	13	Bài kiểm tra cuối khóa (VMLU)	3-3	Quiz	3	25	f	\N	\N	{}
\.


--
-- Data for Name: assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assignments (id, lesson_id, course_id, title, instructions, max_points, allowed_extensions, due_at, allow_late_submissions, attachment_keys, published_at, submission_types, unlock_at) FROM stdin;
\.


--
-- Data for Name: quizzes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quizzes (id, lesson_id, course_id, title, passing_score_percentage, time_limit_minutes, max_attempts) FROM stdin;
1	46	9	Kiểm tra: Cơ sở văn hóa Việt Nam	70	\N	\N
2	55	10	Kiểm tra: Kinh tế vĩ mô	70	\N	\N
3	64	11	Kiểm tra: Mạng máy tính căn bản	70	\N	\N
4	73	12	Kiểm tra: Nhập môn lập trình C	70	\N	\N
5	82	13	Kiểm tra: Xác suất và thống kê	70	\N	\N
\.


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.questions (id, quiz_id, question_text, options, correct_option_index, points, sort_order) FROM stdin;
1	1	An Nam tứ đại khí là 4 di sản của văn hóa:	{"Phật giáo","Nho giáo","Thiên chúa giáo","Đạo giáo"}	0	10	1
2	1	Bản sắc văn hóa là khái niệm dùng để chỉ:	{"Mọi yếu tố văn hóa","Văn hóa của một tộc người","Văn hóa của một cộng đồng","Các yếu tố văn hóa phân biệt chủ thể văn hóa ở các cấp độ khác nhau"}	3	10	2
3	1	Biểu hiện ảnh hưởng của văn hóa phương Tây trong lĩnh vực giáo dục là ?	{"Cả 3 phương án đều đúng","Sự xuất hiện của các tri thức khoa học kỹ thuật","Sự xuất hiện các trường học","Sự xuất hiện các Viện nghiên cứu"}	0	10	3
4	1	Bữa ăn của người Việt Nam thể hiện tính:	{"Cộng đồng","Tổng hợp","Biện chứng","Cả 3 phương án đều đúng"}	3	10	4
5	1	Càng gần trung tâm, ảnh hưởng của văn hóa gốc càng sâu đậm, càng xa trung tâm, ảnh hưởng của văn hóa gốc càng phai nhạt” là luận điểm được rút ra từ công cụ nghiên cứu:	{"Giao lưu – tiếp biến văn hóa","Nhân học – văn hóa","Địa văn hóa","Tọa độ văn hóa"}	0	10	5
6	1	Chiếc áo dài của người phụ nữ Việt Nam là sản phẩm của :	{"Sự tiếp thu văn hóa truyền thống","Sự kết hợp giữa văn hóa truyền thống và văn hóa phương Tây","Sự tiếp thu văn hóa phương Tây","Sự tiếp thu văn hóa Trung Hoa"}	1	10	6
7	1	Chiếc xích lô của người Việt Nam là sản phẩm của:	{"Xe đạp","Xe máy","Sự kết hợp giữa xe đạp và xe tay","Xe tay"}	2	10	7
8	1	Chủ nghĩa yêu nước” của người Việt Nam là sản phẩm của văn hóa:	{"Nhà nước – dân tộc","Làng xã","Đô thị","tộc người"}	0	10	8
9	1	Chữ quốc ngữ là sản phẩm của:	{"Người Phương Tây","Người Ấn Độ","Người Trung Hoa","Người Việt Nam"}	0	10	9
10	1	Chùa ở Việt Nam là nơi thờ:	{"Các vị anh hùng có công với nước","Cả ba phương án đều đúng",Phật,"Các vị thần"}	2	10	10
11	1	Chúng tôi gọi tất cả những gì phân biệt giữa con người với động vật là văn hóa” thuộc cách định nghĩa:	{"Lịch sử","Chuẩn mực","Tâm lý học","Nguồn gốc"}	3	10	11
12	1	Cơ sở hình thành nên những phẩm chất nổi trội trong tính cách của người Việt là ?	{"Cả 3 phương án đều đúng","Địa lý","Kinh tế xã hội","Lịch sử"}	0	10	12
13	1	Cơ sở hình thành nên tính dung chấp của văn hóa Việt Nam là ?	{"Cả 3 phương án đều đúng","Huyết thống","Địa lý","Lịch sử"}	0	10	13
14	1	Công cụ không được sử dụng để nghiên cứu Đại cương văn hóa Việt Nam là?	{"Địa văn hóa","Giao lưu – tiếp biến văn hóa","Nhân học – văn hóa","Tôn giáo"}	3	10	14
15	1	Công cụ nghiên cứu được sử dụng phổ biến để nghiên cứu văn hóa dân gian và văn hóa tộc người là?	{"Giá trị văn hóa tinh thần","Địa – văn hóa","Giá trị văn hóa vật chất và tinh thần","Các yếu tố văn hóa vật thể và phi vật thể"}	1	10	15
16	1	Đặc điểm nổi trội của bản sắc văn hóa Việt Nam là ?	{"Tính dung chấp","Tính nhẫn nhịn","Tính dung hòa","Tính giản dị"}	0	10	16
17	1	Đặc điểm phân biệt nghệ thuật hình khối của văn hóa Việt Nam với văn hóa phương Tây là ?	{"Tính biểu cảm","Tính linh hoạt","Tính tổng hợp","Tính biểu trưng"}	3	10	17
18	1	Đặc điểm văn hóa “Tôn sùng phụ nữ và sự phồn thực” được rút ra từ công cụ nghiên cứu:	{"Địa văn hóa","Tôn giáo","Nhân học văn hóa","Giao lưu – tiếp biến văn hóa"}	0	10	18
19	1	Đạo Cao Đài là sự kết hợp giữa :	{"Văn hóa Ấn Độ với văn hóa phương Tây","Văn hóa Trung Hoa với văn hóa Ấn Độ","Văn hóa Trung Hoa với văn hóa phương Tây","Văn hóa phương Đông với văn hóa phương Tây"}	3	10	19
20	1	Đạo Hòa Hảo là sự kết hợp giữa :	{"Tín ngưỡng thờ Tổ tiên và Phật giáo","Tín ngưỡng thờ Thành hoàng và Phật giáo","Tín ngưỡng thờ Thổ công và Phật giáo","Tín ngưỡng Phồn thực và Phật giáo"}	0	10	20
21	2	Nếu GDP bình quân thực tế của năm 2000 là 18,073$ và GDP bình quân thực tế của năm 2001 là 18,635$ thì tỷ lệ tăng trưởng của sản lượng thực tế trong thời kỳ này là bao nhiêu?	{3.0%,3.1%,5.62%,18.0%,18.6%}	1	10	1
22	2	Khi nền kinh tế đang có lạm phát cao, nên:	{"Giảm lượng cung tiền, tăng lãi suất","Giảm chi ngân sách và tăng thuế","Các lựa chọn đều sai","Các lựa chọn đều đúng"}	3	10	2
23	2	Mức sống của chúng ta liên quan nhiều nhất đến:	{"Mức Độ làm việc chăm chỉ của chúng ta","Nguồn cung tư bản của chúng ta, vì tất cả những gì có giá trị đều do máy móc sản xuất ra","Nguồn tài nguyên thiên nhiên của chúng ta, vì chúng giới hạn sản xuất","Năng suất của chúng ta, vì thu nhập của chúng ta bằng chính những gì chúng ta sản xuất ra"}	3	10	3
24	2	Sản phẩm trung gian và sản phẩm cuối cùng khác nhau ở:	{"Mục đích sử dụng","Thời gian tiêu thụ","Độ bền trong quá trình sử dụng","Các lựa chọn đều đúng"}	0	10	4
25	2	Ngân hàng Trung Ương có thể làm thay đổi cung nội tệ bằng cách:	{"Mua hoặc bán trái phiếu chính phủ","Mua hoặc bán ngoại tệ","Cả hai lựa chọn đều đúng","Cả hai lựa chọn đều sai"}	2	10	5
26	2	Thành phần nào sau đây thuộc lực lượng lao động:	{"Học sinh trường trung học chuyên nghiệp","Người nội trợ","Bộ đội xuất ngũ","Sinh viên năm cuối"}	2	10	6
50	3	Số thập phân nào là đúng nhất cho số nhị phân 10011101 ?	{159,157,185,167}	1	10	10
27	2	Hoạt động nào sau đây của ngân hàng Trung Ương sẽ làm tăng cơ sở tiền tệ	{"Bán ngoại tệ trên thị trường ngoại hối","Cho các ngân hàng thương mại vay","Hạ tỷ lệ dự trữ bắt buộc đối với các ngân hàng thương mại","Tăng lãi suất chiết khấu"}	2	10	7
28	2	Những yếu tố nào sau đây có thể dẫn đến thâm hụt cán cân thương mại của một nước:	{"Đồng nội tệ xuống giá so với đồng ngoại tệ","Sự gia tăng của đầu tư trực tiếp nước ngoài","Thu nhập của các nước đối tác mậu dịch chủ yếu tăng","Các lựa chọn đều sai"}	3	10	8
29	2	Những yếu tố nào sau đây có ảnh hưởng đến tổng cung dài hạn:	{"Thu nhập quốc gia tăng","Xuất khẩu tăng","Tiền lương tăng","Đổi mới công nghệ"}	3	10	9
30	2	Những trường hợp nào sau đây có thể tạo ra những áp lực lạm phát	{"Cán cân thanh toán thặng dư trong một thời gian dài","Giá của các nguyên liệu nhập khẩu chủ yếu gia tăng nhiều","Một phần lớn các thâm hụt ngân sách được tài trợ bởi ngân hàng trung ương","Các lựa chọn đều đúng"}	3	10	10
31	2	GDP thực và GDP danh nghĩa của một năm bằng nhau nếu:	{"Tỷ lệ lạm phát của năm hiện hành bằng tỷ lệ lạm phát của năm trước","Tỷ lệ lạm phát của năm hiện hành bằng tỷ lệ lạm phát của năm gốc","Chỉ số giá của năm hiện hành bằng chỉ số giá của năm trước","Chỉ số giá của năm hiện hành bằng chỉ số giá của năm gốc"}	3	10	11
32	2	Nếu NHTƯ giảm tỷ lệ dự trữ bắt buộc và tăng lãi suất chiết khấu thì khối lượng tiền tệ sẽ:	{Tăng,Giảm,"Không đổi","Không thể kết luận"}	3	10	12
33	2	Trên đồ thị, trục hoành ghi sản lượng quốc gia, trục tung ghi mức giá chung, đường tổng cầu AD dịch sang phải khi:	{"Nhập khẩu và xuất khẩu tăng","Chính phủ tăng chi tiêu cho quốc phòng","Chính phủ cắt giảm các khoản trợ cấp và giảm thuế","Các lựa chọn đều đúng"}	1	10	13
34	2	Trên đồ thị, trục hoành ghi sản lượng quốc gia, trục tung ghi mức giá chung, đường tổng cung AS  dịch chuyển khi:	{"Mức giá chung thay đổi","Chính phủ thay đổi các khoản chi ngân sách","Thu nhập quốc gia không đổi","Công nghệ sản xuất có những thay đổi đáng kể"}	3	10	14
35	2	Trong cơ chế tỷ giá hối đoái thả nổi hoàn toàn:	{"Dự trữ ngoại tệ của quốc gia thay đổi tùy theo diễn biến trên thị trường ngoại hối","Dự trữ ngoại tệ của quốc gia tăng khi tỷ giá hối đoái giảm","Dự trữ ngoại tệ của quốc gia không thay đổi, bất luận diễn biến trên thị trường ngoại hối","Dự trữ ngoại tệ của quốc gia giảm khi tỷ giá hối đoái tăng"}	0	10	15
36	2	Nếu tỷ giá hối đoái danh nghĩa không thay đổi đáng kể, tốc độ tăng giá trong nước tăng nhanh hơn giá thế giới, sức cạnh tranh của hàng hóa trong nước sẽ:	{Tăng,Giảm,"Không thay đổi","Không thể kết luận"}	1	10	16
37	2	Khi đầu tư nước ngoài vào Việt Nam tăng, nếu các yếu tố khác không đổi, Việt Nam sẽ:	{"Thặng dư hoặc thâm hụt cán cân thanh toán","Tăng xuất khẩu ròng","Tăng Thu nhập ròng từ tài sản nước ngoài","Các lựa chọn đều đúng"}	3	10	17
38	2	Nếu các yếu tố khác không đổi, lãi suất tăng thì sản lượng cân bằng sẽ:	{Tăng,Giảm,"Không thay đổi","Không thể thay đổi"}	1	10	18
39	2	Nền kinh tế đang ở mức toàn dụng. Giả sử lãi suất, giá cả và tỷ giá hối đoái không đổi, nếu chính phủ giảm chi tiêu và giảm thuế một lượng bằng nhau,  trạng thái của nền kinh tế sẽ thay đổi:	{"Từ suy thoái sang lạm phát","Từ suy thoái sang ổn định","Từ ổn định sang lạm phát","Từ ổn định sang suy thoái"}	3	10	19
40	2	Tác động ngắn hạn của chính sách nới lỏng tiền tệ  trong nền kinh tế mở với cơ chế tỷ giá hối đoái thả nổi là:	{"Sản lượng tăng","Thặng dư hoặc giảm thâm hụt cán cân thương mại","Đồng nội tệ giảm giá","Các lựa chọn đều đúng"}	3	10	20
41	3	Tầng nào trong mô hình OSI có chức năng dùng để tạo ra những gói tin ?	{"Data Link",Transport,Physical,Network}	3	10	1
42	3	Khi dữ liệu được đóng gói, thứ tự nào là đúng?	{"Segment, data, frame, packet, bit","Data, segment, packet, frame, bit","Segment, packet, data, frame, bit","Data, segment, frame, packet, bit"}	1	10	2
43	3	PDU( Protocol Data Unit) tại tầng Network của mô hình OSI được gọi là gì ?	{Transport,Segment,Packet,Frame}	2	10	3
44	3	Sự phân đoạn dòng dữ liệu xảy ra tại tầng nào của mô hình OSI ?	{Transport,Network,Physical,"Data link"}	0	10	4
45	3	Tầng nào trong mô hình OSI có chức năng chuyển đổi dữ liệu ?	{Application,Presentation,Transport,Network}	1	10	5
46	3	Lớp nào trong mô hình OSI thực hiện việc chọn đường và chuyển tiếp thông tin; thực hiện kiểm soát luồng dữ liệu và cắt/hợp dữ liệu?	{Session,Network,Transport,"Data link"}	1	10	6
47	3	Phương thức trao đổi thông tin nào mà trong đó cả hai bên đều có thể đồng thời gửi dữ liệu đi ?	{"Full – duplex",Simplex,"Half – duplex","Câu a và c đều đúng"}	0	10	7
48	3	Lý do nào sau đây ảnh hưởng đến việc nghẽn mạch đối với mạng LAN?	{"Quá nhiều người sử dụng","Không đủ băng thông","Cơn bão truyền đại chúng (broadcast storm)","Cả 3 câu đều đúng"}	3	10	8
49	3	Để triển khai một mạng vừa, mà loại mạng này không bị ảnh hưởng bởi tính chịu nhiễu EMI, loại cáp nào ta nên sử dụng ?	{"Cáp xoắn","Cáp đồng trục mảnh","Cáp quang","Cáp đồng trục dày"}	2	10	9
51	3	Giao thức nào được sử dụng để tìm ra địa chỉ phần cứng của một thiết bị nội bộ ?	{ICMP,ARP,IP,RARP}	1	10	11
52	3	Lớp nào sau đây chỉ được sử dụng trong mô hình TCP/IP ?	{Application,Network,Transport,Internet}	3	10	12
53	3	Dịch vụ nào sau đây sử dụng giao thức TCP?	{HTTP,TFTP,SNMP,"Cả ba câu a, b, c đều đúng"}	0	10	13
54	3	Giao thức TCP/IP nào được sử dụng tại tầng Application của mô hình OSI?	{Telnet,FTP,TFTP,"Cả ba câu a, b, c đều đúng"}	3	10	14
55	3	Mô hình TCP/ IP còn có tên gọi là gì ?	{ISO,DoD,DOF,"Cả 3 câu đều sai"}	1	10	15
56	3	Tầng nào trong mô hình TCP/IP tương ứng với tầng Transport trong mô hình OSI?	{Application,"Network access",Host-to-Host,Internet}	2	10	16
57	3	Dịch vụ nào sau đây sử dụng cả hai giao thức TCP và UDP ?	{Telnet,FTP,SMTP,DNS}	3	10	17
58	3	Giao thức nào là giao thức dùng cho việc truy nhập tập tin từ xa của Apple ?	{ATP,AFP,APC,APPC}	1	10	18
59	4	Ngôn ngữ lập trình C được Dennish phát triển dựa trên ngôn ngữ lập trình nào:	{"Ngôn ngữ B","Ngôn ngữ BCPL","Ngôn ngữ DEC PDP","Ngôn ngữ B và BCPL"}	3	10	1
60	4	Ngôn ngữ lập trình được Dennish đưa ra vào năm nào?	{1967,1972,1970,1976}	1	10	2
61	4	Ngôn ngữ lập trình nào dưới đây là ngôn ngữ lập trình có cấu trúc?	{"Ngôn ngữ Assembler","Ngôn ngữ C và Pascal","Ngôn ngữ Cobol","a, b và c"}	1	10	3
62	4	Những tên biến nào dưới đây được viết đúng theo quy tắc đặt tên của ngôn ngữ lập trình C?	{"diem toan",3diemtoan,_diemtoan,-diemtoan}	2	10	4
63	4	Một biến được gọi là biến toàn cục nếu:	{"Nó được khai báo tất cả các hàm, ngoại trừ hàm main()","Nó được khai báo ngoài tất cả các hàm kể cả hàm main()","Nó được khai báo bên ngoài hàm main()","Nó được khai báo bên trong hàm main()"}	1	10	5
64	4	Một biến được gọi là một biến địa phương nếu:	{"Nó được khai báo bên trong các hàm hoặc thủ tục, kể cả hàm main()","Nó được khai báo bên trong các hàm ngoại trừ hàm main()","Nó được khai báo bên trong hàm main()","Nó được khai báo bên ngoài các hàm kể cả hàm main()"}	0	10	6
65	4	Nếu x là một biến toàn cục và x không phải là một con trỏ thì:	{"Miền nhớ dành cho x có thể thay đổi trong quá trình thực hiện chương trình","Miền nhớ dành cho x chỉ có thay đổi bởi những thao tác với x bên trong hàm main()","Miền nhớ dành cho x sẽ thay đổi bởi những thao tác với x trong tất cả các hàm, kể cả hàm main()","Miền nhớ dành cho x không bị thay đổi trong quá trình thực hiện chương trình"}	3	10	7
66	4	Kiểu dữ liệu nào dưới đây được coi là kiểu dữ liệu cơ bản trong ngôn ngữ lập trình C:	{"Kiểu double","Kiểu con trỏ","Kiểu hợp","Kiểu mảng"}	0	10	8
67	4	Giả sử a, b là hai số thực. Biểu thức nào dưới đây viết không đúng theo cú pháp của ngôn ngữ lập trình C:	{(a+=b),(a*=b),(a=b),(a&=b)}	3	10	9
68	4	Giả sử a và b là hai số thực. Biểu thức nào dưới đây là không được phép theo 7cú pháp của ngôn ngữ lập trình C:	{(ab),(a-=b),(a>>=b),(a*=b)}	2	10	10
69	4	Xâu định dạng nào dưới đây dùng để in ra một số nguyên hệ 16:	{“%d”,“%x”,“%i”,“%u”}	1	10	11
70	4	Xâu định dạng nào dưới đây dùng để in ra một số nguyên ở hệ 8:	{“%ld”,“%x”,“%o”,“%u”}	2	10	12
71	4	Xâu định dạng nào dưới đây dùng để in ra một kí tự:	{“%f”,“%x”,“%s”,“%c”}	3	10	13
72	4	Xâu định dạng nào dưới đây dùng để in ra một xâu kí tự:	{“%f”,“%x”,“%s”,“%c”}	2	10	14
73	4	Xâu định dạng nào dưới đây dùng để in ra một số nguyên dài:	{“%ld”,“%x”,“%d”,“%o”}	0	10	15
74	4	Xâu định dạng nào dưới đây dùng để in ra địa chỉ của một biến:	{“%u”,“%e”,“%o”,“%p”}	3	10	16
75	4	Xâu định dạng nào dưới đây dùng để in ra một số nguyên:	{“%u”,“%e”,“%d”,“%p”}	2	10	17
76	4	Xâu định dạng nào dưới đây dùng để in ra một số thực có độ chính xác kép:	{“%u”,“%e”,“%o”,“%p”}	1	10	18
77	5	Kiểm tra 3 sản phẩm chọn ngẫu nhiên từ lô hàng. Gọi A\\iota (\\iota = 1,2,3) là biến cố sản phẩm thứ \\iota là sản phẩm tốt. Chọn phát biểu đúng?	{"A_{1}, A_{2}, A_{3} là các biến cố Xung khắc từng đôi","A_{1}, A_{2}, A_{3} là các biến cố không Xung khắc","A_{1}, A_{2}, A_{3} là một hệ đầy đủ","Cả câu A và câu C đúng"}	1	10	1
78	5	Kiểm tra 3 sản phẩm chọn ngẫu nhiên từ một kiện hàng. Gọi B\\iota (\\iota = 1,2,3) là biến cố có \\iota sản phẩm tốt.	{"B_{1} , B_{2} , B_{3} là các biến cố Xung khắc từng đôi","B_{1} , B_{2} , B_{3} là các biến cố không Xung khắc","B_{1} , B_{2} , B_{3} là một hệ đầy đủ","Cả câu A và câu C đúng"}	0	10	2
79	5	Có 3 sinh viên A, B và C cùng thi môn Xác suất thống kê. Gọi A_{\\iota} là biến cố có \\iota sinh viên thi đỗ và H là biến cố sinh viên C thi đỗ. Biến cố A_{1} H là biến cố:	{"Có 1 sinh viên thi đỗ","Sinh viên C thi không đỗ","Sinh viên C thi đỗ","Chỉ có sinh viên C thi đỗ"}	3	10	3
80	5	Tung hai con Xúc Xắc cân đối đồng chất. Gọi A_{\\iota} là biến cố con Xúc Xắc thứ nhất  Xuất hiện mặt \\iota chấm (\\iota = 1,2,3,4,5,6) và Bk là biến cố con Xúc Xắc thứ hai Xuất hiện mặt k chấm (k = 1,2,3,4,5,6). Ký hiệu A_{5}B_{6} mô tả biến cố:	{"Con Xúc Xắc thứ nhất Xuất hiện mặt 5 chấm và con Xúc Xắc thứ hai Xuất hiện mặt 6 chấm","Con Xúc Xắc thứ nhất Xuất hiện mặt 6 chấm và con Xúc Xắc thứ hai Xuất hiện mặt 5 chấm","Con Xúc Xắc thứ nhất Xuất hiện mặt 2 chấm và con Xúc Xắc thứ hai Xuất hiện mặt 6 chấm","Con Xúc Xắc thứ nhất Xuất hiện mặt 5"}	0	10	4
81	5	Một người bắn 2 viên đạn vào bia một cách độc lập với Xác suất trúng bia của viên đạn thứ nhất là 0,7 và Xác suất trúng bia của viên đạn thứ hai là 0,8. Tính Xác suất cả hai viên đạn đều trúng bia	{"0,7","0,8","0,56","1,5"}	2	10	5
82	5	Hai công ty A và B cùng kinh doanh một mặt hàng một cách độc lập. Xác suất để công ty A lỗ là 0,2 và Xác suất để công ty B lỗ là 0,4. Xác suất để chỉ có một công ty lỗ là:	{"0,3","0,4","0,44","0,5"}	2	10	6
83	5	Biến cố đối lập của biến cố A + B là biến cố:	{"Biến cố AB","Biến cố \\\\overline{A} + \\\\overline{B}","Biến cố \\\\overline{ A}. \\\\overline{ B}","Biến cố \\\\overline{ A. B}"}	2	10	7
84	5	Biến cố đối lập của biến cố \\overline{ XY + YZ }là:	{"XY + \\\\overline{YZ}","XY + \\\\overline{ Y} + \\\\overline{ Z }","XY(\\\\overline{ Y} + \\\\overline{Z})",Y}	2	10	8
85	5	Cho X là biến ngẫu nhiên rời rạc có bảng phân phối Xác suất là: \nX −1 0 1 2\nP 0,25 0,3 0,15 0,3\nTính phương sai của biến ngẫu nhiên X?	{"1,6","0,55","1,35","1,725"}	2	10	9
86	5	Xạ thủ bắn vào bia 3 phát. Xác suất trúng của mỗi phát là 0,3. Gọi X là biến ngẫu  nhiên số lần bắn trúng bia. Tìm Mod(X).	{0,1,2,3}	1	10	10
87	5	Một kho chuyên cung cấp hàng cho 12 cửa hàng. Xác suất kho nhận được đơn đặt  hàng của mỗi cửa hàng là 0,3. Số cửa hàng mà kho nhận được đơn đặt hàng nhiều khả năng nhất trong một ngày là:	{1,2,3,4}	2	10	11
88	5	Tỉ lệ phế phẩm của một nhà máy là 5%. Xác suất có 2 phế phẩm trong 4 sản phẩm do máy đó sản Xuất là:	{"0,6535","0,0135375","0,56835","0,171475"}	1	10	12
89	5	Một lớp học có 60 sinh viên nam và 40 sinh viên nữ. Gọi X là biến ngẫu nhiên số sinh viên nam trong 10 sinh viên được chọn ngẫu nhiên không hoàn lại. Quy luật phân phối của biến ngẫu nhiên X là:	{"Nhị thức",Chuẩn,"Siêu bội",Poisson}	2	10	13
90	5	Ba Xạ thủ mỗi người bắn một viên đạn vào bia một cách độc lập. Xác suất bắn trúng bia của ba Xạ thủ lần lượt là 0,8; 0,85; 0,9. Xác Xuất để có hai viên đạn trúng đích là:	{"0,221","0,329","0,68","0,261"}	1	10	14
91	5	Thống kê điểm thi X môn Lý thuyết Xác suất & Thống kê toán của sinh viên tại \nTrường Đại học Ngoại thương Tp.Hồ Chí Minh cho thấy X là biến ngẫu nhiên với X ∼ N(5,25; 1,25). Tỉ lệ sinh viên có điểm thi môn này từ 4 đến 6 điểm là:	{"56,71%","68,72%","64,72%","61,72%"}	3	10	15
92	5	Một nhà máy có ba phân Xưởng cùng sản Xuất một loại sản phẩm. Biết tỉ lệ sản phẩm do từng phân Xưởng sản Xuất lần lượt là 45%, 30% và 25%. Tỉ lệ phế phẩm tương ứng là 3%, 2% và 1%. Lấy ngẫu nhiên một sản phẩm trong kho hàng của nhà máy thì thấy đó là phế phẩm. Tìm xác suất để phế phẩm này do phân Xưởng thứ hai sản Xuất.	{"\\\\frac{3}{11}","\\\\frac{5}{44}","\\\\frac{27}{44}","\\\\frac{9}{10000}"}	0	10	16
93	5	Tuổi thọ của một loại sản phẩm là biến ngẫu nhiên có phân phối chuẩn với tuổi thọ trung bình là 1000(giờ) và độ lệch chuẩn là 10 (giờ) . Một sản phẩm được bảo hành miễn phí nếu sản phẩm hỏng trước 983,55 giờ. Tỉ lệ sản phẩm nhà cung cấp phải bảo hiểm miễn phí là:	{"0,05","0,15","0,20","0,12"}	0	10	17
94	5	Cho X là biến ngẫu nhiên có phân phối Poisson P(\\lambda). Phương sai của biến ngẫu nhiên X là:	{"V(X) = \\\\lambda","V(X) = {\\\\lambda}^{2}","V(X) = 2\\\\lambda","V(X) =\\\\frac{\\\\lambda}{2}"}	0	10	18
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, first_name, last_name, email, account_type, password_hash, description, is_verified, instructor_request_status, instructor_requested_at, created_at, updated_at) FROM stdin;
d132e43f-2259-429e-b28f-47b4d63ab7ee	admin	EduLine	Admin	admin@eduline.local	Admin	$argon2id$v=19$m=19456,t=2,p=1$lcGaRAYfjePkEPdLrZ2nHQ$ao5bRih3zhbLKIYyHabQ2yXeiDEiEKOwDWOx5mqSEJk	\N	t	\N	\N	2026-11-09 03:28:21.748	2026-11-09 03:28:21.748
d14abbb4-c2da-438a-9445-490eb265d9ab	minh.nguyen	Minh	Nguyễn Văn	minh.nguyen@eduline.local	Instructor	$argon2id$v=19$m=19456,t=2,p=1$n6mQ91kqMX5IML8nkLqrgw$CNyhhB9rZQ7muTzcEOHqZBcpOCopN9f9Qu3xEEDZsSo	\N	t	\N	\N	2026-11-09 03:28:23.092	2026-11-09 03:28:23.092
1ea936e8-4ffb-4d07-891d-ff08475c779a	anh.tran	Anh	Trần Hoàng	anh.tran@eduline.local	Instructor	$argon2id$v=19$m=19456,t=2,p=1$QD6xr+PyznPt4PutZXP4tA$exs7g7JxFkD9THexNRLE+DBIhGVVo7Hlx41BCnuoNt8	\N	t	\N	\N	2026-11-09 03:28:23.138	2026-11-09 03:28:23.138
0dac01db-1192-47ad-89fa-c56b49edac51	bao.le	Bảo	Lê Quốc	bao.le@eduline.local	Instructor	$argon2id$v=19$m=19456,t=2,p=1$8Vb3vpjYYQbqaMno8NpbxQ$bbIDR1u8cJ/nB5Xo6OoU0SxWEOsqDxJcCO2g1JXs6Tc	\N	t	\N	\N	2026-11-09 03:28:23.203	2026-11-09 03:28:23.203
ae65b3d6-14b7-493a-8f53-3f7b87b08752	ha.pham	Hà	Phạm Thu	ha.pham@eduline.local	Instructor	$argon2id$v=19$m=19456,t=2,p=1$TOvjhyzUTydoQxK/NhIfuQ$XCrSGLuzyWKGie7Xr6JSyuxr5Np/NaMXgvx7wLIllPg	\N	t	\N	\N	2026-11-09 03:28:23.263	2026-11-09 03:28:23.263
141bd095-ac8c-44b0-940e-bbef85297b13	student.demo	Demo	Học Viên	student.demo@eduline.local	Student	$argon2id$v=19$m=19456,t=2,p=1$IoGt9/qsJTtaPCBTQ5BDGw$t8cQuBYs4tkZXr+pFwuuDlSI4D+EkW4TaRJqZQUynWg	\N	t	\N	\N	2026-11-09 03:28:23.326	2026-11-09 03:28:23.326
\.


--
-- Data for Name: quiz_attempts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quiz_attempts (id, quiz_id, user_id, status, score, max_score, passed, started_at, expires_at, submitted_at) FROM stdin;
\.


--
-- Data for Name: attempt_answers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attempt_answers (id, attempt_id, question_id, selected_option_index, points_awarded) FROM stdin;
\.


--
-- Data for Name: course_instructors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.course_instructors (course_id, instructor_id) FROM stdin;
1	d14abbb4-c2da-438a-9445-490eb265d9ab
2	1ea936e8-4ffb-4d07-891d-ff08475c779a
3	0dac01db-1192-47ad-89fa-c56b49edac51
4	ae65b3d6-14b7-493a-8f53-3f7b87b08752
5	d14abbb4-c2da-438a-9445-490eb265d9ab
6	1ea936e8-4ffb-4d07-891d-ff08475c779a
7	1ea936e8-4ffb-4d07-891d-ff08475c779a
8	d14abbb4-c2da-438a-9445-490eb265d9ab
9	ae65b3d6-14b7-493a-8f53-3f7b87b08752
10	1ea936e8-4ffb-4d07-891d-ff08475c779a
11	0dac01db-1192-47ad-89fa-c56b49edac51
12	d14abbb4-c2da-438a-9445-490eb265d9ab
13	ae65b3d6-14b7-493a-8f53-3f7b87b08752
\.


--
-- Data for Name: course_prerequisites; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.course_prerequisites (course_id, prerequisite_course_id) FROM stdin;
5	1
\.


--
-- Data for Name: enrollments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.enrollments (id, user_id, course_id, status, times_enrolled, completed_at, enrolled_at) FROM stdin;
1	141bd095-ac8c-44b0-940e-bbef85297b13	12	Active	1	\N	2026-11-09 03:30:46.453
2	141bd095-ac8c-44b0-940e-bbef85297b13	1	Active	1	\N	2026-11-09 03:35:30.928
\.


--
-- Data for Name: lesson_progress; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lesson_progress (user_id, lesson_id, course_id, last_position_seconds, percent, completed_at, updated_at) FROM stdin;
141bd095-ac8c-44b0-940e-bbef85297b13	1	1	0	100	2026-11-09 03:35:37.814	2026-11-09 03:35:39.109
141bd095-ac8c-44b0-940e-bbef85297b13	2	1	0	100	2026-11-09 03:35:40.846	2026-11-09 03:35:40.848
141bd095-ac8c-44b0-940e-bbef85297b13	65	12	5	100	2026-11-09 03:38:13.432	2026-11-09 03:38:13.796
141bd095-ac8c-44b0-940e-bbef85297b13	66	12	0	100	2026-11-09 03:38:15.175	2026-11-09 03:38:15.177
141bd095-ac8c-44b0-940e-bbef85297b13	67	12	0	100	2026-11-09 03:38:16.898	2026-11-09 03:38:16.899
141bd095-ac8c-44b0-940e-bbef85297b13	68	12	0	100	2026-11-09 03:38:18.53	2026-11-09 03:38:18.532
141bd095-ac8c-44b0-940e-bbef85297b13	70	12	0	100	2026-11-09 03:38:21.269	2026-11-09 03:38:21.27
141bd095-ac8c-44b0-940e-bbef85297b13	69	12	0	100	2026-11-09 03:38:23.072	2026-11-09 03:38:23.073
141bd095-ac8c-44b0-940e-bbef85297b13	71	12	0	100	2026-11-09 03:38:25.022	2026-11-09 03:38:25.023
141bd095-ac8c-44b0-940e-bbef85297b13	72	12	0	100	2026-11-09 03:38:26.846	2026-11-09 03:38:26.848
\.


--
-- Data for Name: notification_subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification_subscriptions (user_id, course_id, status, created_at, updated_at) FROM stdin;
141bd095-ac8c-44b0-940e-bbef85297b13	12	Granted	2026-11-09 03:30:46.461	2026-11-09 03:30:46.461
141bd095-ac8c-44b0-940e-bbef85297b13	1	Granted	2026-11-09 03:35:30.936	2026-11-09 03:35:30.936
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, recipient_id, type, title, message_body, action_url, is_read, source_event_id, created_at, group_key, image_url) FROM stdin;
1	141bd095-ac8c-44b0-940e-bbef85297b13	CourseWelcome	Chào mừng bạn đến với "Nhập môn lập trình với ngôn ngữ C"	Chào mừng bạn đến với khóa Nhập môn lập trình C! Hãy cài sẵn một trình biên dịch (gcc hoặc clang) để chạy thử các ví dụ.	/courses/nhap-mon-lap-trinh-c	f	24563263-3120-474f-988d-d1d408ff0279	2026-11-09 03:30:48.176	\N	/images/courses/nhap-mon-lap-trinh-c.svg
\.


--
-- Data for Name: outbox_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.outbox_events (id, type, payload, created_at, published_at, attempts, last_error) FROM stdin;
24563263-3120-474f-988d-d1d408ff0279	ENROLLMENT_CREATED	{"userId": "141bd095-ac8c-44b0-940e-bbef85297b13", "courseId": "crs_12", "enrollmentId": "enr_1", "timesEnrolled": 1}	2026-11-09 03:30:46.474	2026-11-09 03:30:48.182	0	\N
84d70aa8-b59d-43e6-af8f-4bb5ae71ea90	ENROLLMENT_CREATED	{"userId": "141bd095-ac8c-44b0-940e-bbef85297b13", "courseId": "crs_1", "enrollmentId": "enr_2", "timesEnrolled": 1}	2026-11-09 03:35:30.943	2026-11-09 03:35:31.353	0	\N
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (id, user_id, token_hash, family_id, expires_at, revoked_at, created_at) FROM stdin;
1	141bd095-ac8c-44b0-940e-bbef85297b13	28534f3a2482c556f3b54f400567af7ac272303f5f486619a58fdde4db9851a7	d636ed41-8aed-4bb3-b938-d5c7cd30a9ff	2026-11-16 03:30:30.53	2026-11-09 03:33:41.798	2026-11-09 03:30:30.533
2	141bd095-ac8c-44b0-940e-bbef85297b13	45a758358ca70652bda8c74b5a5b1d6d123c9b640845e66f2078cb26dd4965b8	d636ed41-8aed-4bb3-b938-d5c7cd30a9ff	2026-11-16 03:33:41.807	2026-11-09 03:33:43.442	2026-11-09 03:33:41.809
3	d14abbb4-c2da-438a-9445-490eb265d9ab	10b840a192155ac680dd776587ee9aeb552423c305848567592df67a98399fa9	b20258f7-0d92-4760-af19-0e5d4bee196c	2026-11-16 03:34:43.127	2026-11-09 03:35:01.26	2026-11-09 03:34:43.13
4	141bd095-ac8c-44b0-940e-bbef85297b13	cb351d67e49a84ca9f9fda19de1c84960333564212a17ddcb71a13e628942427	bd1e0b5d-6032-444b-99b8-75a1bf48ed91	2026-11-16 03:35:03.229	2026-11-09 03:35:41.889	2026-11-09 03:35:03.232
5	d14abbb4-c2da-438a-9445-490eb265d9ab	3a99ddbf00a5507cc163cee0f9a708b3d813736c003b53ca1f9a6fb6e76086dd	79b9f4fd-de99-4cb8-92d6-f11a33a0b009	2026-11-16 03:35:44.611	2026-11-09 03:45:16.931	2026-11-09 03:35:44.613
6	d14abbb4-c2da-438a-9445-490eb265d9ab	b9111c4d77402f13b84e0389faba57ea946f9042ab6a46391af9014179d54692	79b9f4fd-de99-4cb8-92d6-f11a33a0b009	2026-11-16 03:45:16.937	2026-11-09 03:46:09.597	2026-11-09 03:45:16.939
7	d14abbb4-c2da-438a-9445-490eb265d9ab	91afe30167615788ec86c4c6811882f356341c76f68519e13e33c7ab7cb5dda0	79b9f4fd-de99-4cb8-92d6-f11a33a0b009	2026-11-16 03:46:09.602	2026-11-09 03:53:18.487	2026-11-09 03:46:09.604
8	d14abbb4-c2da-438a-9445-490eb265d9ab	e65b5c6a2b82772306da9ac3d756846d5540818885886273c5afbfb1ca06bfb5	79b9f4fd-de99-4cb8-92d6-f11a33a0b009	2026-11-16 03:53:18.497	2026-11-09 03:53:20.567	2026-11-09 03:53:18.498
9	d14abbb4-c2da-438a-9445-490eb265d9ab	62d30d5ad5af5dedb8f0dc956d7fc018c969e085a0b680b9ba1a710b9934c430	79b9f4fd-de99-4cb8-92d6-f11a33a0b009	2026-11-16 03:53:20.57	\N	2026-11-09 03:53:20.571
10	d14abbb4-c2da-438a-9445-490eb265d9ab	ba092959244003f4e69cc92f72e2b82a6b09a5c8f7965ecdb0aae95f5d4d636e	7bf4a9f3-0bf2-4dec-adf2-34eb502318da	2026-11-16 04:06:19.954	\N	2026-11-09 04:06:19.957
\.


--
-- Data for Name: submissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.submissions (id, assignment_id, user_id, file_key, file_name, size_bytes, mime_type, status, is_late, score, feedback, graded_by_id, submitted_at, graded_at, text_body) FROM stdin;
\.


--
-- Data for Name: submission_comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.submission_comments (id, submission_id, author_id, body, created_at) FROM stdin;
\.


--
-- Name: assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.assignments_id_seq', 1, false);


--
-- Name: attempt_answers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.attempt_answers_id_seq', 1, false);


--
-- Name: courses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.courses_id_seq', 13, true);


--
-- Name: enrollments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.enrollments_id_seq', 2, true);


--
-- Name: lessons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lessons_id_seq', 82, true);


--
-- Name: modules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.modules_id_seq', 31, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, true);


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.password_reset_tokens_id_seq', 1, false);


--
-- Name: questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.questions_id_seq', 94, true);


--
-- Name: quiz_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.quiz_attempts_id_seq', 1, false);


--
-- Name: quizzes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.quizzes_id_seq', 5, true);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 10, true);


--
-- Name: submission_comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.submission_comments_id_seq', 1, false);


--
-- Name: submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.submissions_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict DkRWK4CUNE6BNA8d8luokYdQyvwdXneDgSeH626CHuu96Ppti8FCBoQmnWvGg75

