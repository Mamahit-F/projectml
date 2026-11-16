# System Architecture Document
## StudentInsight: Smart Student Monitoring & Prediction System

### 1. High-Level Architectural Diagram

```
+-----------------------------------------------------------------+
|                        Client Layer                             |
|    React 18 + Vite + TypeScript + Tailwind CSS + Lucide Icons   |
|   (Admin Panel, Attendance Scanner, Dean Portal, Reports)       |
+-------------------------------+---------------------------------+
                                |
                                | HTTP REST API / JSON (JWT Auth)
                                v
+-----------------------------------------------------------------+
|                    Spring Boot 3 Backend Layer                  |
|                                                                 |
|  +-----------------------------------------------------------+  |
|  | Security & Filter: JwtAuthenticationFilter, RBAC          |  |
|  +-----------------------------------------------------------+  |
|  | Controllers: Auth, Student, Attendance, Violation, ML     |  |
|  +-----------------------------------------------------------+  |
|  | Service Layer (Business Logic & Transactions):            |  |
|  | - StudentService         - AttendanceVerificationService  |  |
|  | - PointCalculationService - MLIntegrationService          |  |
|  | - WelfareReportService   - FollowUpService                |  |
|  +-----------------------------------------------------------+  |
|  | Persistence Layer: Spring Data JPA Repositories           |  |
|  +-----------------------------------------------------------+  |
+---------------+-------------------------------+-----------------+
                |                               |
                | JDBC / SQL                    | HTTP REST API
                v                               v
+-------------------------------+   +-----------------------------+
|    PostgreSQL 16/18 DB        |   | Python FastAPI ML Service   |
|  - Flyway Migrations          |   |  - Scikit-learn Pipeline    |
|  - Relational Schema          |   |  - Random Forest Classifier |
|  - Audit Logs & Indexing      |   |  - Model Metadata & Eval    |
+-------------------------------+   +-----------------------------+
```

### 2. Component Responsibility & Boundary

#### A. Frontend (React + Vite + TypeScript)
- Bertanggung jawab merender antarmuka pengguna responsif (desktop, tablet, mobile).
- Melakukan verifikasi token JWT pada `localStorage` / `sessionStorage`, menyediakan `AuthContext` untuk mengelola sesi pengguna dan routing terlindungi (`ProtectedRoute`).
- Menyediakan komponen pemindai kamera QR Code (`html5-qrcode` / ZXing) dan fallback pencarian manual input NIM.
- Memanggil endpoint RESTful backend menggunakan instans Axios yang dikonfigurasi dengan `Authorization: Bearer <token>`.
- Menampilkan grafik analitik dan sebaran risiko interaktif dengan Recharts.

#### B. Backend (Java 17 LTS / Spring Boot 3)
- Bertindak sebagai *single source of truth* dan pusat seluruh business logic sistem.
- Mengelola autentikasi berbasis JWT, otorisasi peran (`ROLE_ADMIN`, `ROLE_STAFF`, `ROLE_VILLAGE_DEAN`).
- Mengatur pencatatan presensi: memastikan mahasiswa wajib hadir berdasarkan kategori tempat tinggal dan aturan ibadah (`attendance_rules`).
- Menjalankan *Point Calculation Engine*: menghitung poin pelanggaran secara otomatis ketika absensi final ditetapkan.
- Mengumpulkan metrik mahasiswa (tingkat kehadiran, absensi berturut-turut, poin sebelumnya) dan meneruskannya ke ML Service via REST API `POST /predict`.
- Menyimpan hasil prediksi ke tabel `ml_predictions` dan menyajikan data terpadu untuk Village Dean.
- Menangani *fault tolerance*: jika ML Service tidak aktif / timeout, Spring Boot tetap melayani CRUD operasional dan menandai status prediksi sebagai `UNAVAILABLE` tanpa membuat sistem crash.

#### C. Database (PostgreSQL)
- Menyimpan seluruh data transaksional secara relasional dan terintegritas.
- Perubahan skema dikelola secara terstruktur dan terverifikasi menggunakan Flyway Migration (`V1__init_schema.sql`, `V2__seed_initial_data.sql`, dst).

#### D. Machine Learning Service (Python 3 / FastAPI)
- Service terisolasi khusus tugas analitik prediktif dan machine learning.
- Menjalankan pipeline Scikit-Learn yang telah dilatih secara offline dan tervalidasi menggunakan metrik Macro F1 dan Confusion Matrix.
- Menyediakan endpoint RESTful:
  - `GET /health`: Pemeriksaan kesehatan service.
  - `GET /model/info`: Informasi metadata model aktif (algoritma, akurasi, fitur, tanggal pelatihan).
  - `POST /predict`: Melakukan inferensi probabilistik kategori risiko (`LOW`, `MEDIUM`, `HIGH`).
  - `POST /retrain`: Endpoint terproteksi untuk melatih ulang model dengan data terkini.
