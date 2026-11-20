# Fixing Error and Bug

**Tanggal:** 20 November 2026  
**Proyek:** StudentInsight (Frontend React + Vite, Backend Spring Boot, ML Service FastAPI, Database PostgreSQL)

---

## 1. Ringkasan Bug & Error yang Ditemukan

Dari hasil *blackbox testing* pada alur API dan UI browser (`http://localhost:5173`), ditemukan sejumlah error dan ketidaksesuaian kontrak (*endpoint* & *field mismatch*) antara Frontend dan Backend:

### A. Error Kritis (Crash & HTTP 500)
1. **Crash Layar Putih di `/follow-up`:** `FollowUpList.tsx` membaca `data.content`, padahal `GET /api/v1/follow-ups` mengembalikan array langsung sehingga memicu `TypeError`.
2. **Riwayat Pelanggaran (`/violations`) HTTP 500:** Endpoint `GET /api/v1/violation-points` dan `POST /adjust/{studentId}` tidak tersedia di backend.
3. **Ekspor Laporan (`/reports`) HTTP 500:** Endpoint `GET /reports/attendance`, `/reports/violations`, dan `/reports/students` belum tersedia; sedangkan `/reports/comprehensive` error `LazyInitializationException`.
4. **QR Code Mahasiswa (`/students/:id`) HTTP 500:** Endpoint `GET /api/v1/students/{id}/qr-code` belum tersedia (serta ketidaksesuaian rute `/regenerate-qr`, `/deactivate`, dan `/worship-events/{id}/cancel`).
5. **Logout HTTP 500:** Endpoint `POST /api/v1/auth/logout` belum tersedia di backend.
6. **Status Code Route Tidak Ditemukan:** `NoResourceFoundException` dikembalikan sebagai `HTTP 500`, bukan `HTTP 404`.

### B. Bug Alur, Form & Keamanan
7. **Login Password Salah Gagal Diam-Diam:** Interceptor Axios me-reload `/login` saat menerima `401` sehingga pesan error tidak sempat tampil.
8. **Form Tambah/Edit Mahasiswa Gagal HTTP 400:** `StudentForm.tsx` tidak memiliki field `faculty` dan mengirim nama field yang berbeda (`programStudy`, `residenceAddress`, `emergencyContacts`) dari DTO backend (`studyProgram`, `currentAddress`, `emergencyContactName`).
9. **Kelola Pengguna (`/users`) Gagal HTTP 500 & Status Salah:** UI mengirim role tanpa prefix `ROLE_` dan membaca `u.enabled` (backend mengirim `u.active`).
10. **Aturan Presensi (`/attendance-rules`) Tampil Salah & Gagal HTTP 400:** Ketidakcocokan field `isMandatory` / `violationPoints` vs `mandatory` / `pointPenaltyWeight`.
11. **Simulasi Cepat QR Scanner (`/attendance/scan`) Selalu 404:** Token simulasi hardcoded (`QR-STU-<NIM>`) tidak sesuai format token database, dan dropdown masih menampilkan event `COMPLETED`.
12. **Filter Kegiatan Presensi (`/attendance`) Tidak Berfungsi:** Frontend mengirim parameter `eventId`, sedangkan backend membaca `worshipEventId`.
13. **Laporan Kesejahteraan (`/welfare`) Gagal Buat/Simpan Catatan:** Mismatch field `category`/`title`/`resolution` vs `reportType`/`resolutionNotes`, serta filter status `IN_PROGRESS` vs `IN_REVIEW`.
14. **Data Kosong di Dashboard, Prediksi ML, Mahasiswa & Kontak Darurat:** Perbedaan nama field antara respon API dan komponen UI (termasuk `openWelfareReports` & `attendanceTrend` yang belum dikirim `/dashboard/overview`).
15. **Celah RBAC Backend:** Endpoint `GET /api/v1/predictions/summary`, `/latest`, dan `/student/{id}` belum dibatasi `@PreAuthorize` sehingga masih dapat diakses role `STAFF`.
16. **Navigasi & Teks Internal:** Sorotan ganda sidebar pada `/attendance/scan`, route `/settings` tidak memiliki menu navigasi dan terbuka untuk `STAFF`, serta teks catatan dev internal pada halaman `/violations` & `/predictions`.

---

## 2. Perbaikan yang Dilakukan

- **Backend (`studentinsight/backend`):**
  - Menambahkan handler `NoResourceFoundException` (`404`) dan payload error (`400`) di `GlobalExceptionHandler`.
  - Menambahkan `POST /api/v1/auth/logout` di `AuthController`.
  - Menambahkan `@PreAuthorize("hasAnyRole('ADMIN', 'VILLAGE_DEAN')")` pada seluruh endpoint `GET` di `MLPredictionController`.
  - Membuat generator QR Code PNG pure-Java (`QrCodeGenerator`) serta menambahkan `GET /students/{id}/qr-code`, `POST /{id}/regenerate-qr`, `PATCH /{id}/deactivate`, dan `PATCH /worship-events/{id}/cancel`.
  - Menambahkan `GET /api/v1/violation-points` terpaginasi di `ViolationPointController`.
  - Memperbaiki `/reports/comprehensive` (`@Transactional(readOnly = true)`) dan menambahkan endpoint ekspor CSV `/reports/attendance`, `/reports/violations`, serta `/reports/students` di `ReportController`.
  - Melengkapi `DashboardService` & `DashboardOverviewDTO` dengan `openWelfareReports` dan `attendanceTrend`.
- **Frontend (`studentinsight/frontend`):**
  - Memperbaiki interceptor `401` di `api.ts` agar error login salah password tampil di `/login`.
  - Menyelaraskan `attendanceService.ts`, `violationService.ts`, `services/index.ts` (normalisasi array `follow-ups` & prefix `ROLE_` pada create user).
  - Menyelaraskan pemetaan field dan form pada `Dashboard.tsx`, `StudentList.tsx`, `StudentForm.tsx`, `StudentDetail.tsx`, `EmergencyContacts.tsx`, `QRScanner.tsx`, `AttendanceList.tsx`, `AttendanceRules.tsx`, `ViolationList.tsx`, `PredictionPage.tsx`, `WelfareList.tsx`, `FollowUpList.tsx`, `UserManagement.tsx`, dan `EventList.tsx`.
  - Memperbaiki highlight aktif `Sidebar.tsx`, menambahkan menu **Pengaturan Sistem** (`/settings`), dan membatasi akses `/settings` untuk `ADMIN` & `VILLAGE_DEAN`.

---

## 3. Hasil Audit Ulang

- **Kompilasi:** `mvn compile` (**BUILD SUCCESS**, 99 file Java) dan `npx tsc --noEmit` (**Exit 0**, tanpa error TypeScript).
- **Blackbox API & RBAC:** **42 / 42 test case PASS** (`0` gagal), seluruh 12 alur mutasi CRUD/presensi/pelanggaran/welfare/follow-up berhasil (`200`/`201`), `/reports/comprehensive` (`200 OK`), dan `STAFF` ditolak (`403`) pada `/predictions/*`.
- **Audit UI Browser (`http://localhost:5173`):** Seluruh halaman dan alur utama lulus tanpa *console error* maupun *HTTP 500/4xx* tak terduga.
