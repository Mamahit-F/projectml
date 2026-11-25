# Struktur Workflow Sistem — StudentInsight

Dokumentasi ini merangkum seluruh alur kerja (*workflow*) arsitektur, autentikasi, pemrosesan data berbasis PDF, Machine Learning, Asisten AI **Jago**, manajemen database **Supabase**, hingga pipeline deployment **Railway** pada proyek **StudentInsight** (Sistem Monitoring Poin Sabat & Deteksi Risiko Mahasiswa Universitas Klabat).

---

## 1. Arsitektur & Alur Sistem End-to-End

```mermaid
flowchart LR
    U["Pengguna (Browser)"] -->|HTTPS| APP["Railway All-in-One Container - Spring Boot 3.3 + Embedded React SPA"]
    APP -->|"Loopback 127.0.0.1:8001 (X-ML-API-Key)"| ML["FastAPI ML & PDF Service (pdfplumber + Scikit-learn)"]
    APP -->|"JDBC TLS sslmode=require (HikariCP + Bulk SQL)"| DB[("Supabase PostgreSQL 17 - Flyway V1-V8 + 24 Tabel RLS")]
    APP -->|"HTTPS REST API (Retry + Failover)"| LLM["Gemini / DeepSeek LLM (Asisten AI Jago)"]
```

| Lapisan | Teknologi | Peran Utama |
|---|---|---|
| **Frontend (SPA)** | React 18, TypeScript, Vite, Tailwind CSS | Dashboard analitik, unggah/arsip PDF, direktori mahasiswa, pusat ML, Mode Panduan Interaktif, modal Reset Password, dan workspace chat Jago. |
| **Backend API** | Spring Boot 3.3 (Java 17), Spring Security JWT, Flyway | Autentikasi JWT, orkestrasi impor/hapus PDF (*bulk SQL* + *JDBC batch*), manajemen pembinaan/kesejahteraan/kontak darurat, ekspor Excel, dan orkestrasi Jago AI. |
| **ML & PDF Service** | Python 3.11, FastAPI, `pdfplumber`, Scikit-learn | Ekstraksi tabel PDF Village Dean, *Dynamic K-Means Risk Clustering*, proyeksi akhir semester, serta pipeline ML Historis (*clustering* & prediksi temporal). |
| **Cloud Database** | Supabase PostgreSQL 17 (Session Pooler) | Penyimpanan terpusat seluruh entitas dengan enkripsi TLS dan **Row Level Security (RLS)** aktif pada seluruh 24 tabel (`0` akses publik `anon`/`authenticated`). |

---

## 2. Workflow Autentikasi, Otorisasi & Reset Password

```mermaid
sequenceDiagram
    autonumber
    actor User as Pengguna
    participant UI as React SPA
    participant API as Spring Boot Security (JWT)
    participant DB as Supabase PostgreSQL

    User->>UI: Masukkan username & password di /login
    UI->>API: POST /api/v1/auth/login
    API->>DB: Validasi akun aktif & hash BCrypt (users)
    alt Kredensial Tidak Valid
        API-->>UI: 401 Unauthorized
    else Kredensial Valid
        API-->>UI: 200 OK + JWT Bearer Token (ROLE_USER, 24 jam)
        UI->>API: Request /api/v1/** dengan Header Authorization Bearer
        API->>API: JwtAuthenticationFilter validasi signature & expiry
        API-->>UI: 200 OK (Data Live)
    end

    Note over User,DB: Alur Reset Password dari Kartu Akun Sidebar
    User->>UI: Klik "Reset Password" & isi sandi lama + sandi baru
    UI->>API: POST /api/v1/auth/change-password (JWT)
    API->>DB: Verifikasi sandi lama (BCrypt), panjang >= 8 & konfirmasi cocok
    API->>DB: Simpan hash BCrypt baru & catat ke audit_logs
    API-->>UI: 200 OK (Password Berhasil Diperbarui)
```

- Seluruh endpoint `/api/**` dan `/actuator/**` (kecuali `/api/v1/auth/login`, `/api/v1/auth/logout`, dan `/actuator/health`) **wajib JWT valid**.
- Akun demo warisan (`admin`, `staff`, `dean`) telah dihapus permanen melalui migrasi `V8` sehingga hanya akun resmi yang dapat mengakses sistem.

---

## 3. Workflow Utama: Siklus Hidup Data Berbasis PDF (Upload, Sync & Delete)

StudentInsight menggunakan arsitektur **100% PDF-driven** — data mahasiswa di direktori selalu sinkron dengan arsip PDF yang diunggah.

```mermaid
sequenceDiagram
    autonumber
    actor User as Pengguna (Village Dean / Staff)
    participant UI as Halaman Unggah & Arsip PDF
    participant API as Spring Boot (PdfReportService)
    participant ML as FastAPI ML Service
    participant DB as Supabase PostgreSQL

    User->>UI: Pilih / Drag-and-Drop file PDF Poin Sabat
    UI->>API: POST /api/v1/pdf-reports/preview (multipart)
    API->>ML: POST /parse-pdf (Header X-ML-API-Key)
    ML-->>API: Daftar mahasiswa terbaca, fakultas, prodi, & ringkasan poin
    API-->>UI: 200 OK (Preview Tabel Sebelum Simpan)

    User->>UI: Konfirmasi Simpan & Analisis
    UI->>API: POST /api/v1/pdf-reports/import
    API->>ML: POST /parse-pdf
    API->>DB: Bulk INSERT/UPDATE students & student_point_records (JDBC Batch)
    API->>ML: POST /analyze-risk (Dynamic K-Means + Proyeksi Cutoff Semester)
    ML-->>API: Kategori risiko (SAFE/LOW/MEDIUM/HIGH) & proyeksi akhir semester
    API->>DB: Bulk UPDATE students & Bulk INSERT ml_predictions + audit_logs
    API-->>UI: 201 Created (Data Tersimpan & Risiko Diperbarui)

    Note over User,DB: Alur Penghapusan Arsip PDF (Sinkron Otomatis)
    User->>UI: Klik Hapus pada salah satu Arsip PDF
    UI->>API: DELETE /api/v1/pdf-reports/{id}
    API->>DB: Bulk DELETE ml_predictions, student_point_records, & pdf_reports
    alt Mahasiswa Hanya Ada di PDF Ini
        API->>DB: Bulk DELETE students (ON DELETE CASCADE ke tabel anak)
    else Mahasiswa Juga Ada di PDF Lain
        API->>DB: Hitung ulang delta, poin terbaru, & jalankan ulang analisis risiko
    end
    alt Tidak Ada PDF Tersisa (remainingReportsCount = 0)
        API->>DB: Bersihkan seluruh sisa students & ml_predictions (0 mahasiswa)
    end
    API-->>UI: 200 OK (Ringkasan Mahasiswa Terhapus & Tersinkronisasi)
```

---

## 4. Workflow Machine Learning (Deteksi Risiko Dinamis & Pusat ML Historis)

```mermaid
flowchart TD
    START["Data Poin Sabat Mahasiswa"] --> MODE{"Jalur Analisis ML"}

    MODE -->|"Jalur 1: Live PDF Snapshot"| DYN["POST /analyze-risk - Dynamic K-Means Clustering"]
    DYN --> CUT["Hitung Proyeksi Akhir Semester dari semester_settings"]
    CUT --> TIER["Klasifikasi 4 Klaster Risiko (SAFE, LOW, MEDIUM, HIGH)"]
    DYN -.->|"Jika ML Service Tidak Aktif"| FB["Dynamic Quantile Fallback (Spring Boot Built-in)"]
    FB --> TIER
    TIER --> SAVE1[("Simpan ke students & ml_predictions")]

    MODE -->|"Jalur 2: Pusat ML Historis"| ING["Ingest Dataset Historis Multi-Periode"]
    ING --> CONT["Tracking Kontinuitas Mahasiswa (ml_student_continuity)"]
    CONT --> CLUS["Unsupervised Profile Clustering (ml_cluster_assignments)"]
    CONT --> SUP["Temporal Supervised Training & Seleksi Model Terbaik"]
    SUP --> REG[("Versioned Model Registry (ml_models, ml_training_runs, ml_prediction_logs)")]
    CLUS --> UIML["Dashboard 8-Tab /ml-analytics"]
    REG --> UIML
```

---

## 5. Workflow Operasional Monitoring & Intervensi Mahasiswa

```mermaid
flowchart LR
    PDF["1. Unggah PDF Poin (/pdf-reports)"] --> DASH["2. Pantau Ringkasan (/dashboard)"]
    DASH --> DIR["3. Direktori Mahasiswa (/students)"]
    DASH --> RISK["4. Prioritas Risiko Tinggi (/predictions)"]
    RISK --> FU["5. Pembinaan & Konseling (/follow-up)"]
    RISK --> WEL["6. Laporan Kesejahteraan (/welfare)"]
    DIR --> EC["7. Kontak Darurat (/emergency-contacts)"]
    DASH --> REP["8. Cutoff Semester & Ekspor Excel (/reports-settings)"]
```

- **Mode Panduan Interaktif (*Spotlight Guide*)**: Tersedia langsung dari Sidebar (*Tur Aktif* & *Panduan*) untuk menyorot elemen layar langkah demi langkah di setiap halaman.

---

## 6. Workflow Asisten AI "Jago"

```mermaid
flowchart TD
    Q["Pengguna Mengirim Pertanyaan di Workspace Jago"] --> API["POST /api/v1/assistant/chat (JWT)"]
    API --> GUARD{"Relevan dengan Domain StudentInsight?"}
    GUARD -- "Tidak (Luar Konteks)" --> DENY["Tolak dengan Sopan (Strict Domain Guardrail)"]
    GUARD -- "Ya" --> CTX["Kumpulkan Live Context dari Supabase (Mahasiswa, Risiko, NIM/Nama, Status ML)"]
    CTX --> ROUTER{"Routing Provider LLM (ASSISTANT_PROVIDER)"}
    ROUTER -->|"Gemini / Auto"| GEM["Gemini Interactions API (gemini-3.5-flash-lite + Retry & Failover)"]
    ROUTER -->|"DeepSeek"| DS["DeepSeek Chat Completions API"]
    GEM -.->|"Fallback jika Timeout/Error"| LOCAL["Smart Local Context Responder"]
    DS -.->|"Fallback jika 401/Error"| GEM
    GEM --> ANS["Jawaban Akurat Berbasis Data Live"]
    LOCAL --> ANS
    ANS --> HIST["Simpan Riwayat Percakapan di Browser localStorage"]
```

---

## 7. Workflow Evolusi Database (Flyway `V1`–`V8`) & Keamanan Supabase

Setiap kali Spring Boot dijalankan, Flyway otomatis memvalidasi dan menerapkan migrasi secara berurutan:

| Versi | File Migrasi | Ringkasan Perubahan |
|---|---|---|
| `V1` | `V1__init_schema.sql` | Inisialisasi 13 tabel inti (`users`, `students`, `residence_categories`, `attendances`, `violation_points`, `welfare_reports`, `follow_up_records`, `emergency_contacts`, `ml_predictions`, `audit_logs`, dll.) dengan relasi `ON DELETE CASCADE`. |
| `V2` | `V2__seed_initial_data.sql` | Seed data referensi awal (kategori tempat tinggal, aturan kehadiran/poin, data demo awal v1). |
| `V3` | `V3__pdf_monitoring_overhaul.sql` | Transisi ke monitoring berbasis PDF: tambah `semester_settings`, `pdf_reports`, `student_point_records`, serta kolom proyeksi/delta pada `students` dan `ml_predictions`. |
| `V4` | `V4__ml_historical_subsystem.sql` | Tambah 7 tabel subsistem ML Historis (`ml_dataset_versions`, `ml_reporting_periods`, `ml_student_continuity`, `ml_training_runs`, `ml_models`, `ml_cluster_assignments`, `ml_prediction_logs`). |
| `V5` | `V5__normalize_legacy_user_roles.sql` | Normalisasi seluruh role akun ke skema single-role `ROLE_USER`. |
| `V6` | `V6__enable_rls_security.sql` | Aktifkan **Row Level Security (RLS)** pada seluruh tabel aplikasi dan cabut hak akses `anon` & `authenticated` dari Data API publik Supabase. |
| `V7` | `V7__remove_legacy_demo_students.sql` | Hapus 6 mahasiswa dummy warisan `V2` beserta data relasinya agar database bersih (`0` mahasiswa) sampai PDF diunggah. |
| `V8` | `V8__remove_legacy_demo_users.sql` | Hapus akun demo lama (`admin`, `staff`, `dean`) dengan password bawaan lemah demi keamanan produksi. |

---

## 8. Workflow Pengembangan & Deployment (Local → GitHub → Railway + Supabase)

```mermaid
flowchart LR
    DEV["1. Dev Lokal - npm run dev (dev-all.mjs + Supabase .env)"] --> TEST["2. Uji Otomatis - mvn test (25 Test) & npm run build"]
    TEST --> GIT["3. Push ke GitHub (branch master)"]
    GIT --> DOCKER["4. Multi-Stage Docker Build Railway (Node 20 -> Maven Java 17 -> Python 3.11 + JRE 17)"]
    DOCKER --> START["5. Container Boot (start-allinone.sh: Uvicorn 127.0.0.1:8001 + Spring Boot :PORT)"]
    START --> LIVE["6. Healthcheck /actuator/health -> Live HTTPS di Railway"]
```

- **Development Lokal**: Jalankan `npm run dev` di folder `frontend/` — skrip [dev-all.mjs](frontend/scripts/dev-all.mjs) otomatis membaca `.env`, mendeteksi koneksi remote **Supabase** (melewati PostgreSQL lokal), lalu menyalakan ML Service (`:8001`), Backend (`:8080`), dan Vite (`:5173`) sekaligus.
- **Production Cloud**: Deploy berjalan dalam 1 container terpadu ([Dockerfile](Dockerfile)) di Railway dengan database cloud terpusat di Supabase (panduan lengkap tersedia di [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md)).
