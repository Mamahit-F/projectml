# STUDENTINSIGHT
## Smart Student Monitoring and Prediction System
### Full-Stack Web Application + Machine Learning Integration

Sistem informasi cerdas berbasis web untuk pengawasan, pencatatan presensi peribadatan, penghitungan poin pelanggaran otomatis, dan deteksi dini risiko ketidakhadiran mahasiswa **Outsider Dekat** dan **Outsider Jauh** di **Universitas Klabat**.

---

## 🏛️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│               React 18 + Vite Frontend                  │
│       Tailwind CSS • Recharts • Lucide React (5173)     │
└───────────────────────────┬─────────────────────────────┘
                            │ REST API / JSON (JWT Bearer)
┌───────────────────────────▼─────────────────────────────┐
│          Java 17 + Spring Boot 3.3.5 Backend            │
│       Spring Security • Spring Data JPA • Flyway (8080) │
└─────────────┬─────────────────────────────┬─────────────┘
              │                             │ REST API
┌─────────────▼─────────────┐ ┌─────────────▼─────────────┐
│    PostgreSQL 18 Database │ │  Python FastAPI ML Service│
│ 16 Tabel Relasional (5432)│ │ Scikit-Learn Model (8001) │
└───────────────────────────┘ └───────────────────────────┘
```

---

## 🔑 Akun Demo (Development Credentials)

Semua akun demo telah di-seed ke dalam database PostgreSQL `studentinsight_db`:

| Role | Username | Password | Deskripsi Hak Akses |
|---|---|---|---|
| **ADMIN** | `admin` | `password` | Akses penuh seluruh sistem, aturan, user management, dan kategori. |
| **STAFF** | `staff` | `password` | Pencatatan presensi via QR scan, input manual, dan laporan bantuan. |
| **VILLAGE_DEAN** | `dean` | `password` | Evaluasi pembinaan pastoral, hasil prediksi ML, dan kontak darurat. |

---

## 🚀 Panduan Menjalankan Sistem Secara Lokal

### 1. Database PostgreSQL
Pastikan service PostgreSQL berjalan di port 5432 dengan database `studentinsight_db`:
```bash
# PostgreSQL berjalan secara lokal (port 5432, user: postgres, pass: postgres)
# Migrasi Flyway V1 & V2 otomatis diaplikasikan saat backend dimulai.
```

### 2. Python FastAPI ML Service
Jalankan service Machine Learning pada port **8001**:
```powershell
cd studentinsight\ml-service
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8001
```
*Health Check ML:* `http://127.0.0.1:8001/health`

### 3. Java Spring Boot Backend
Jalankan backend Spring Boot pada port **8080**:
```powershell
cd studentinsight\backend
mvn -s D:\m2_repo\settings.xml package -DskipTests
java -Xms128m -Xmx384m -jar target\studentinsight-backend-1.0.0.jar
```
*API Base URL:* `http://localhost:8080/api/v1`

### 4. React Vite Frontend
Jalankan frontend React pada port **5173**:
```powershell
cd studentinsight\frontend
npm run dev
```
*Akses antarmuka web:* `http://localhost:5173`

---

## 📊 Modul & Fitur yang Berfungsi (100% Functional)

1. **Autentikasi & Autorisasi (FR-01)**: Stateless JWT, role-based access control (ADMIN, STAFF, VILLAGE_DEAN).
2. **Manajemen Pengguna (FR-02)**: Tambah, edit, aktif/nonaktifkan akun petugas dan pembina.
3. **Manajemen Mahasiswa (FR-03)**: Profil mahasiswa outsider, NIM, program studi, status, dan token QR unik terenkripsi.
4. **Kategori Tempat Tinggal (FR-04)**: Outsider Dekat (≤700m) dan Outsider Jauh dengan batas jarak yang dapat dikonfigurasi admin.
5. **Jadwal Kegiatan Ibadah (FR-05)**: Penjadwalan Vesper Jumat, Sabat Pagi, Sabat Sore, WOP Pagi, WOP Malam, dan WOP Puncak.
6. **Aturan Presensi Dinamis (FR-06)**: Matriks kewajiban fleksibel per kategori tempat tinggal, bobot poin dapat diatur di tabel `attendance_rules`.
7. **Pindai Presensi QR Code (FR-07)**: Pemindaian token QR acak aman (`QR-STU-...`), pencegahan absen ganda, audit waktu dan petugas.
8. **Manajemen Kehadiran (FR-08)**: Status PRESENT, ABSENT, EXCUSED, SICK, PENDING_VERIFICATION. Fitur koreksi presensi resmi dengan audit notes.
9. **Penghitungan Poin Pelanggaran (FR-09 & FR-10)**: Otomatis dihitung hanya dari kegiatan wajib; penyesuaian poin manual admin tercatat di audit log.
10. **Prediksi Risiko Machine Learning (FR-12)**: Model Random Forest terbaik (Macro F1 0.718, Recall High Risk 73.68%) dengan pencegahan kebocoran target (non-leakage temporal split).
11. **Bantuan & Kesejahteraan Mahasiswa (FR-13)**: Pelaporan kendala kesehatan, finansial, sosial/kos, dan tracking status RESOLVED oleh Village Dean.
12. **Buku Kontak Darurat (FR-14)**: Direktori nomor darurat orang tua/wali khusus untuk Village Dean & Admin.
13. **Evaluasi & Pembinaan Pastoral (FR-15)**: Catatan bimbingan rohani dan konseling kedisiplinan Village Dean.
14. **Pusat Laporan & Ekspor (FR-16)**: Unduh rekapitulasi presensi, pelanggaran, dan master data dalam format CSV/Excel.
15. **Dashboard Analitik Dinamis (FR-11)**: Menampilkan statistik real-time dari PostgreSQL, grafik distribusi risiko Recharts, dan tren kehadiran.

---

## 🧪 Hasil Pengujian (Test Results)

- **Backend Unit Tests**: 4/4 Passed (JUnit 5 + Mockito)
- **ML Service Pytest**: 5/5 Passed (Endpoint /health, /model/info, /predict, /retrain security)
- **Frontend Build**: TypeScript & Vite production build `dist/` sukses tanpa error (`tsc && vite build`)
- **Integration Test**: Spring Boot berhasil memanggil ML Service via REST API, menerima hasil prediksi Random Forest, dan menyimpannya ke tabel `ml_predictions` PostgreSQL.

---

## ⚠️ Catatan & Penanda Konfigurasi Kampus
- Bobot poin ketidakhadiran dan aturan matriks ibadah saat ini berstatus **DEMO/UNVERIFIED** dan dapat disesuaikan melalui menu **Aturan Presensi** tanpa mengubah kode program.
- Hasil prediksi Machine Learning hanya berfungsi sebagai **Sistem Pendukung Keputusan (Decision Support)** bagi Village Dean dan **bukan dasar hukuman otomatis**.
