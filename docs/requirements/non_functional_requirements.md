# Non-Functional Requirements (NFR) Document
## StudentInsight: Smart Student Monitoring & Prediction System

### 1. Usability & UI/UX (NFR-01)
- Desain antarmuka bersih, modern, dan minimalis dengan palet dominan warna hijau tua (*Emerald/Teal 800-900*), putih, dan netral slate/zinc.
- Memberikan umpan balik visual instan (toast notification, form error alert, spinner saat memuat data, modal konfirmasi aksi berbahaya).
- Indikator badge warna untuk kategori tempat tinggal (Outsider Dekat vs Jauh) dan status kehadiran/risiko (Hijau untuk Present/Low, Kuning/Orange untuk Medium/Pending, Merah untuk High/Absent).

### 2. Responsiveness & Multi-Device Accessibility (NFR-02)
- Layout responsif optimal di layar desktop, tablet, dan smartphone (mobile layout untuk petugas scan kehadiran di lapangan).
- Komponen QR scanner kompatibel dengan kamera mobile maupun input barcode scanner / manual fallback.

### 3. Security & Access Control (NFR-03)
- Autentikasi berbasis stateless JSON Web Token (JWT) dengan signature HMAC-SHA256.
- Password dienkripsi menggunakan standar industri BCrypt dengan work factor 10-12.
- Role-Based Access Control (RBAC) diimplementasikan pada Spring Security level method (`@PreAuthorize`) dan filter level HTTP.
- Token QR code mahasiswa di-hash / random UUID token aman, bukan data identitas mentah seperti NIM atau No HP.
- Proteksi CORS ketat yang hanya mengizinkan origin frontend terdaftar.

### 4. Performance & Efficiency (NFR-04)
- Response time endpoint API REST di bawah 200 ms untuk query operasional standar.
- Endpoint dashboard analitik dioptimalkan dengan aggregation query native / JPA query terindeks untuk menghindari full table scans.
- Service Machine Learning diisolasi secara asinkron/REST dengan latency prediksi di bawah 100 ms per inferensi.

### 5. Data Reliability & Transactional Consistency (NFR-05)
- Operasi database yang memutasi status kehadiran dan akumulasi poin dibungkus dalam Spring `@Transactional` untuk mencegah *race condition* atau data parsial saat presensi massal.
- Flyway database migration memastikan versioning skema konsisten antar lingkungan development dan production.

### 6. Maintainability & Code Quality (NFR-06)
- Struktur arsitektur berlapis (Clean Layered Architecture): Controller -> Service -> Repository -> Entity.
- Pemisahan DTO (*Data Transfer Object*) dan Entity JPA untuk membatasi over-fetching dan mencegah *mass assignment vulnerability*.
- Modularitas komponen React dengan Custom Hooks dan TypeScript type safety end-to-end.

### 7. Privacy & Sensitive Data Protection (NFR-07)
- Informasi kontak darurat dan alamat pribadi mahasiswa hanya dapat diakses oleh role yang terotorisasi (Admin dan Village Dean).
- Fitur Machine Learning tidak menggunakan data suku, ras, gender, atau data sensitif yang melanggar etika privasi.

### 8. Auditability & Traceability (NFR-08)
- Seluruh mutasi kritis (koreksi status absensi, penyesuaian poin pelanggaran, catatan pembinaan dekan) dicatat di tabel `audit_logs` lengkap dengan `user_id`, `action`, `entity_name`, `old_value`, `new_value`, dan `timestamp`.

### 9. Data Integrity & Constraints (NFR-09)
- Penegakan integritas data pada tingkat database PostgreSQL: Foreign Key constraints dengan aturan *ON DELETE RESTRICT* untuk data historis, *UNIQUE* constraints pada NIM, Email pengguna, dan kombinasi `(student_id, worship_event_id)` untuk mencegah scan duplikat.
