# Functional Requirements (FR) Document
## StudentInsight: Smart Student Monitoring & Prediction System

### 1. Overview
StudentInsight dirancang khusus untuk memonitor, mengelola kedisiplinan, mengevaluasi kesejahteraan, dan memprediksi risiko pelanggaran kehadiran mahasiswa outsider di Universitas Klabat, yang terbagi dalam dua kategori utama:
1. **Outsider Dekat**: Mahasiswa bertempat tinggal dalam radius 600–700 meter dari kampus.
2. **Outsider Jauh**: Mahasiswa bertempat tinggal di luar radius 600–700 meter.

---

### 2. Functional Requirements Specification

| Code | Title | Description | User Roles |
|---|---|---|---|
| **FR-01** | Authentication & RBAC | Login menggunakan email/username & password, penerbitan JWT bearer token, proteksi endpoint API, dan kontrol hak akses halaman berdasarkan Role (`ADMIN`, `STAFF`, `VILLAGE_DEAN`). Password di-hash menggunakan BCrypt. | All |
| **FR-02** | User Management | Manajemen akun pengguna internal (CRUD akun, aktifkan/nonaktifkan akun, pengaturan role, ganti/reset password). | ADMIN |
| **FR-03** | Student Management | Manajemen data mahasiswa outsider: NIM, Nama Lengkap, Program Studi, Fakultas, Nomor Telepon, Alamat Tinggal, Kategori Tempat Tinggal, Status Mahasiswa (`ACTIVE`, `INACTIVE`, `PROBATION`, `GRADUATED`), Token QR Code acak yang aman. | ADMIN, STAFF, VILLAGE_DEAN (Read) |
| **FR-04** | Residence Category Management | Pengelolaan master data kategori tempat tinggal (Outsider Dekat, Outsider Jauh, radius, deskripsi, status aktif). | ADMIN |
| **FR-05** | Worship Event Management | Manajemen jadwal kegiatan ibadah (Jumat Malam, Vesper, Ibadah Sabtu Pagi/Sabbath, Ibadah Sabtu Sore, WOP Pagi Senin-Jumat, WOP Malam Senin-Jumat, WOP Puncak Sabtu). Menentukan tanggal, waktu mulai/selesai, lokasi, kuota/kewajiban, status (`SCHEDULED`, `ONGOING`, `COMPLETED`, `CANCELLED`). | ADMIN, STAFF |
| **FR-06** | Attendance Rules | Konfigurasi dinamis kewajiban kehadiran per kategori tempat tinggal dan tipe ibadah dalam tabel `attendance_rules`. Menentukan apakah suatu ibadah wajib (`is_mandatory`) bagi Outsider Dekat atau Outsider Jauh. | ADMIN |
| **FR-07** | QR Attendance Scanning | Pencatatan kehadiran cepat menggunakan pemindai QR Code di kamera/browser. Memvalidasi secure token mahasiswa, memverifikasi kewajiban kehadiran pada event aktif, mencegah scan ganda (`duplicate check`), mencatat timestamp dan user pencatat. Menyediakan fallback input manual NIM jika QR bermasalah. | ADMIN, STAFF |
| **FR-08** | Attendance Management & Verification | Manajemen status kehadiran: `PRESENT`, `ABSENT`, `EXCUSED`, `SICK`, `PENDING_VERIFICATION`. Koreksi status kehadiran dengan catatan alasan dan audit log petugas. Ketidakhadiran berstatus pending tidak langsung menghasilkan poin pelanggaran. | ADMIN, STAFF |
| **FR-09** | Violation Point Computation | Perhitungan otomatis poin pelanggaran bagi mahasiswa yang `ABSENT` pada kegiatan yang berstatus `is_mandatory`. Izin (`EXCUSED`), Sakit (`SICK`), atau kegiatan yang dibatalkan (`CANCELLED`) tidak dikenakan poin. Aturan bobot poin dikonfigurasi dinamis di database. | System, ADMIN |
| **FR-10** | Violation History | Riwayat komprehensif pelanggaran mahasiswa: tanggal, nama event, poin yang didapat, status tindak lanjut, serta audit log koreksi poin manual oleh Admin/Staff. | ADMIN, STAFF, VILLAGE_DEAN |
| **FR-11** | Real-time Analytics Dashboard | Dashboard analitik berbasis data PostgreSQL aktual: total mahasiswa, sebaran Outsider Dekat vs Jauh, persentase kehadiran mingguan/bulanan, total pelanggaran aktif, sebaran level risiko ML (Low, Medium, High), dan daftar mahasiswa prioritas evaluasi. | All (Scoped) |
| **FR-12** | Machine Learning Risk Prediction | Prediksi risiko ketidakdisiplinan mahasiswa berbasis Python FastAPI + Scikit-Learn. Mengkategorikan mahasiswa ke dalam level risiko `LOW`, `MEDIUM`, atau `HIGH` dengan probabilitas detail untuk mendukung keputusan Village Dean. | ADMIN, VILLAGE_DEAN |
| **FR-13** | Student Welfare Reports | Pencatatan laporan bantuan dan kesejahteraan mahasiswa: masalah tempat tinggal, keamanan, finansial/makanan, kesehatan, atau keluhan lingkungan. Prioritas: `LOW`, `MEDIUM`, `HIGH`, `URGENT`. Status: `OPEN`, `IN_REVIEW`, `RESOLVED`, `CLOSED`. | ADMIN, STAFF, VILLAGE_DEAN |
| **FR-14** | Emergency Contacts | Pencatatan kontak darurat mahasiswa (Nama kontak, relasi keluarga/wali, nomor darurat, alamat wali). Diproteksi ketat hanya untuk staf berwenang. | ADMIN, STAFF, VILLAGE_DEAN |
| **FR-15** | Follow-up & Coaching Records | Fitur khusus Village Dean untuk meninjau mahasiswa berisiko tinggi atau berpoin pelanggaran tinggi, mencatat agenda pembinaan konseling, memberikan rekomendasi, dan memantau perkembangan status evaluasi (`SCHEDULED`, `COMPLETED`, `FOLLOW_UP_NEEDED`). | VILLAGE_DEAN, ADMIN |
| **FR-16** | Comprehensive Reporting & Export | Laporan rekapitulasi kehadiran, pelanggaran poin, hasil prediksi ML, dan laporan kesejahteraan dengan filter rentang tanggal, kategori tempat tinggal, dan status. | ADMIN, STAFF, VILLAGE_DEAN |
