# API Contracts Documentation
## StudentInsight: Smart Student Monitoring & Prediction System

Base URL: `/api/v1`
Authorization: Header `Authorization: Bearer <jwt-token>`

---

### 1. Authentication (`/api/v1/auth`)
- `POST /auth/login`
  - Request: `{"username": "admin", "password": "password"}`
  - Response (200): `{"token": "ey...", "tokenType": "Bearer", "user": {"id": 1, "username": "admin", "role": "ROLE_ADMIN", "fullName": "Administrator"}}`
- `GET /auth/me`
  - Response (200): Profil pengguna yang sedang login.

### 2. User Management (`/api/v1/users`)
- `GET /users` (Role: ADMIN) - Daftar user internal.
- `POST /users` (Role: ADMIN) - Tambah staf/dekan baru.
- `PUT /users/{id}` (Role: ADMIN) - Ubah profil/role user.
- `PATCH /users/{id}/status` (Role: ADMIN) - Aktifkan/nonaktifkan user.

### 3. Student Management (`/api/v1/students`)
- `GET /students` - Pencarian & filter mahasiswa (keyword, kategori tempat tinggal, status).
- `GET /students/{id}` - Detail lengkap mahasiswa (riwayat absensi, poin, kontak darurat, prediksi ML).
- `POST /students` - Pendaftaran mahasiswa baru (otomatis generate `qrToken`).
- `PUT /students/{id}` - Pembaharuan data mahasiswa.
- `DELETE /students/{id}` - Arsip/nonaktifkan data mahasiswa.
- `GET /students/by-qr/{qrToken}` - Cari mahasiswa berdasarkan token QR scanner.

### 4. Residence Categories (`/api/v1/residence-categories`)
- `GET /residence-categories` - Daftar kategori tempat tinggal.
- `PUT /residence-categories/{id}` - Konfigurasi radius / batas jarak.

### 5. Worship Events (`/api/v1/worship-events`)
- `GET /worship-events` - Daftar kegiatan ibadah dengan filter tanggal & status.
- `POST /worship-events` - Buat kegiatan baru.
- `PUT /worship-events/{id}` - Ubah detail kegiatan.
- `POST /worship-events/{id}/finalize` - Finalisasi absensi & kalkulasi poin otomatis bagi yang mangkir.

### 6. Attendance Rules (`/api/v1/attendance-rules`)
- `GET /attendance-rules` - Daftar matriks aturan kewajiban kehadiran per kategori & jenis ibadah.
- `PUT /attendance-rules/{id}` - Ubah status kewajiban (`isMandatory`) dan bobot penalti poin.

### 7. Attendance Operations (`/api/v1/attendances`)
- `POST /attendances/scan-qr`
  - Request: `{"qrToken": "uuid-token", "worshipEventId": 12}`
  - Response (201): Data presensi berhasil dicatat.
- `POST /attendances/manual`
  - Request: `{"studentId": 5, "worshipEventId": 12, "status": "PRESENT", "notes": "Hadir telat 5 mnt"}`
- `PUT /attendances/{id}` - Koreksi kehadiran (status `EXCUSED`, `SICK`, dll + alasan).
- `GET /attendances/event/{eventId}` - Daftar presensi seluruh mahasiswa pada event tertentu.

### 8. Violation Points (`/api/v1/violation-points`)
- `GET /violation-points/student/{studentId}` - Riwayat poin pelanggaran mahasiswa.
- `POST /violation-points/manual-adjustment` - Koreksi penyesuaian poin dengan alasan dan audit log.
- `GET /violation-points/rules` - Daftar konfigurasi bobot poin pelanggaran.

### 9. Machine Learning Integration (`/api/v1/predictions`)
- `GET /predictions/student/{studentId}` - Hasil prediksi risiko terkini untuk mahasiswa.
- `POST /predictions/predict/{studentId}` - Picu inferensi model untuk 1 mahasiswa.
- `POST /predictions/predict-all` - Picu batch prediksi risiko untuk seluruh mahasiswa aktif.
- `GET /predictions/summary` - Rekapitulasi distribusi risiko (LOW, MEDIUM, HIGH) untuk dashboard.

### 10. Student Welfare (`/api/v1/welfare-reports`)
- `GET /welfare-reports` - Daftar laporan bantuan & kesejahteraan mahasiswa.
- `POST /welfare-reports` - Buat laporan baru.
- `PUT /welfare-reports/{id}` - Update status atau catatan tindak lanjut.

### 11. Follow-up & Village Dean Coaching (`/api/v1/follow-ups`)
- `GET /follow-ups` - Riwayat sesi pembinaan dan konseling mahasiswa.
- `POST /follow-ups` - Catat agenda/hasil konseling pembinaan.

### 12. Dashboard & Analytics (`/api/v1/dashboard`)
- `GET /dashboard/overview` - Mengembalikan metrik ringkas: total mahasiswa, outsider dekat vs jauh, total event, tingkat kehadiran rata-rata, total poin pelanggaran, sebaran risiko ML, dan daftar mahasiswa yang perlu perhatian khusus.
