# System Workflows & Business Logic
## StudentInsight: Smart Student Monitoring & Prediction System

### 1. Workflow: Pencatatan Kehadiran QR & Validasi Kewajiban
```mermaid
sequenceDiagram
    autonumber
    actor Petugas as Petugas (Staff/Admin)
    participant UI as React QR Scanner
    participant Backend as Spring Boot API
    participant DB as PostgreSQL

    Petugas->>UI: Buka Halaman Scanner & Pilih Event Ibadah
    UI->>UI: Aktifkan Kamera & Baca QR Code Mahasiswa
    UI->>Backend: POST /api/v1/attendances/scan-qr (token, eventId)
    Backend->>DB: Query Student by qr_token & Event by eventId
    alt Mahasiswa / Event Tidak Ditemukan
        Backend-->>UI: 404 Not Found (Invalid QR Token / Event)
    else Cek Apakah Sudah Absen
        Backend->>DB: Query Attendance (student_id, event_id)
        alt Sudah Tercatat Hadir
            Backend-->>UI: 409 Conflict (Sudah tercatat sebelumnya pada jam X)
        else Belum Tercatat
            Backend->>DB: Cek Aturan Kehadiran (attendance_rules)
            Backend->>DB: Simpan Presensi status = 'PRESENT', method = 'QR_SCAN'
            Backend-->>UI: 201 Created (Presensi Berhasil: Nama Mahasiswa, Kategori, Waktu)
            UI-->>Petugas: Tampilkan Notifikasi Sukses Hijau + Suara Beep
        end
    end
```

---

### 2. Workflow: Penghitungan Poin Pelanggaran Otomatis
1. **Pemicu**: Kegiatan ibadah telah berakhir atau admin menjalankan aksi "Finalisasi Presensi Kegiatan" (`POST /api/v1/worship-events/{id}/finalize`).
2. **Identifikasi Kewajiban**:
   - Sistem mengambil daftar mahasiswa aktif.
   - Untuk setiap mahasiswa, sistem mencocokkan `residence_category` dengan `attendance_rules` untuk `event_type` terkait.
   - Jika `is_mandatory == false`, mahasiswa tidak wajib hadir dan tidak ada sanksi.
3. **Pengecekan Kehadiran**:
   - Jika mahasiswa wajib hadir dan belum memiliki catatan kehadiran, sistem membuat catatan kehadiran `ABSENT`.
   - Jika status kehadiran adalah `EXCUSED` (Izin), `SICK` (Sakit), atau `PENDING_VERIFICATION`, maka **tidak dikenakan poin**.
   - Jika status kehadiran adalah `ABSENT`:
     - Sistem mengambil bobot poin dari `attendance_rules` atau `violation_point_rules`.
     - Sistem membuat entri di tabel `violation_points`.
     - Sistem menambahkan nilai poin ke `students.total_violation_points`.
     - Sistem mencatat aktivitas di `audit_logs`.

---

### 3. Workflow: Prediksi Risiko Machine Learning
```mermaid
flowchart TD
    A[Village Dean / Admin Buka Menu Prediksi] --> B[Pilih Mahasiswa atau Batch 'Run All Predictions']
    B --> C[Spring Boot Mengambil Metrik Historis Mahasiswa]
    C --> D[Fitur: attendance_rate, required_count, absences, consecutive_absences, prev_points, wop_rate]
    D --> E[Spring Boot memanggil REST POST /predict ke Python ML Service]
    E --> F{ML Service Online?}
    F -- Ya --> G[Model Pipeline Scikit-Learn Menghitung Probabilitas]
    G --> H[Return JSON: risk_category, probabilities LOW/MED/HIGH]
    H --> I[Spring Boot Menyimpan ke Tabel ml_predictions]
    I --> J[Tampilkan Hasil di Dashboard & Profil Mahasiswa]
    F -- Tidak --> K[Fallback Handling: Log Warning, tampilkan status ML Offline tanpa merusak sistem]
```
