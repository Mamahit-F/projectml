# StudentInsight Historical Machine Learning Subsystem (v3.0)

Dokumentasi teknis dan operasional lengkap untuk subsistem analisis data historis, kontinuitas mahasiswa, *unsupervised clustering*, prediksi poin *supervised* kronologis, serta manajemen model terversi pada **StudentInsight** (Universitas Klabat).

---

## 1. Arsitektur Machine Learning & Integrasi Sistem

StudentInsight mempertahankan arsitektur 3 lapis yang sudah ada dan memperluasnya dengan subsistem ML historis terintegrasi:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  React + TypeScript + Recharts Frontend (:5173)                         │
│  /ml-analytics (Pusat ML Historis — 8 Tab) + /predictions (Eksisting)   │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ JWT Bearer Auth (/api/v1/ml/**)
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Spring Boot 3.3.5 Backend (:8080)                                      │
│  - Autentikasi JWT & otorisasi                                          │
│  - MlHistoricalController -> MlHistoricalService -> MlClientService     │
│  - PostgreSQL + Flyway V4 (ml_dataset_versions, ml_reporting_periods,   │
│    ml_student_continuity, ml_training_runs, ml_models,                  │
│    ml_cluster_assignments, ml_prediction_logs) + AuditLogService        │
│  - Degradasi aman (HTTP 503 / fallback status) jika ML Service offline  │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ HTTP + X-ML-API-Key (/ml/**)
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Python FastAPI + Scikit-learn ML Service (:8001)                       │
│  - extractor.py  : Read-only PDF/XLSX scanner + SHA-256 cache           │
│  - identity.py   : Normalisasi & resolusi identitas hati-hati           │
│  - continuity.py : Pelacakan kehadiran historis & kelayakan 7 kategori  │
│  - quality.py    : Audit kualitas data & diagnosis outlier              │
│  - features.py   : Rekayasa fitur bebas kebocoran (clustering & T->T+1) │
│  - clustering.py : K-Means (K=2..8), Agglomerative, DBSCAN + PCA 2D     │
│  - supervised.py : Regresi & Klasifikasi dengan validasi kronologis     │
│  - registry.py   : Versi dataset, artefak .joblib, seleksi eksplisit    │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ Read-Only
                               ▼
         D:\from c\Documents\holyyy\ML\Data Poin Mahasiswa\
```

---

## 2. Proses Pemrosesan Laporan Historis (PDF & XLSX)

- **Sumber Data**: `D:\from c\Documents\holyyy\ML\Data Poin Mahasiswa` (akses **read-only** — file asli tidak pernah diubah, dipindahkan, atau dihapus).
- **Format Didukung**:
  - `.pdf` (28 file di folder `09-03-2026`, `29-04-2026`, `01-10-2026`, `06-11-2026`) — seluruhnya mengandung teks terpilih (*selectable text*, 0 halaman gambar/scan). Jika di masa depan ditemukan PDF hasil pindai tanpa teks, parser secara eksplisit melaporkan kebutuhan OCR dan tidak pernah memalsukan data.
  - `.xlsx` (7 file di folder `20-11-2025`) — diekstrak langsung menggunakan parser XML standar tanpa ketergantungan eksternal berat, menangani kolom offset (seperti Pertanian yang mulai di Kolom B), baris catatan kaki `NOTE : ...`, dan variasi header (`NO REGIS`, `STUDENT_REG_NUMBER`, `LAST_NAME`, `FIRST_NAME`, `POIN SABAT`).
- **Deteksi Struktur Tabel Dinamis**:
  - Parser mendeteksi peta indeks kolom langsung dari baris header tiap tabel sehingga file **5 kolom tanpa PRODI** (`[NO, NIM, LAST NAME, FIRST NAME, POIN SABAT]`) tidak pernah salah dibaca sebagai kolom PRODI.
  - Menangani anomali PDF riil: kebocoran header `NUMBER\nS22219008` di baris 1, teks berjarak `I l m u K e p e r a w a t a n`, serta luapan huruf nama depan ke kolom prodi (`suIlmmau Keperawatan`, `faiAthgroteknologi`, `u Informatika`).
  - Normalisasi nama fakultas (mis. `FAKULTAS TEKNIK` pada `09-03-2026` diselaraskan dengan `Fakultas Arsitektur`, `FEKON` → `Fakultas Ekonomi dan Bisnis`, `FILKOM` → `Fakultas Ilmu Komputer`, `FKEP` → `Fakultas Keperawatan`, `FKIP` → `Fakultas Keguruan dan Ilmu Pendidikan`).
- **Incremental Processing berbasis SHA-256**: Setiap file dihitung hash SHA-256 dan disimpan di `ml-service/artifacts/extraction_cache/<sha256>.json`. Pemrosesan ulang otomatis mendeteksi `new_files`, `modified_files`, `unchanged_files`, dan `removed_files`.

---

## 3. Skema Dataset Terpadu

Setiap rekaman hasil ekstraksi dan resolusi identitas dinormalisasi ke skema seragam:

| Field | Tipe | Keterangan |
|---|---|---|
| `internal_student_id` | string | Pengenal internal stabil berbasis hash (`STU-XXXXXXXXXXXX`) |
| `resolved_nim` | string \| null | NIM/Student Reg Number terverifikasi (hanya untuk pencocokan, **BUKAN fitur ML**) |
| `canonical_student_name` | string | Nama mahasiswa terstandarisasi (hanya tampilan/audit, **BUKAN fitur ML**) |
| `faculty` | string | Nama fakultas terstandarisasi (7 fakultas) |
| `study_program` | string | Program studi (diisi balik dari periode 6-kolom jika tersedia) |
| `reporting_date` | ISO date | Tanggal laporan terurut kronologis (`2025-11-20` s.d. `2026-11-06`) |
| `academic_semester` | string | Semester akademik (`2025-2026_SEM1`, `2025-2026_SEM2`, `2026-2027_SEM1`) |
| `total_points` | int | Total Poin Sabat pada snapshot laporan (`>= 0`) |
| `source_file` | string | Path relatif file sumber |
| `identity_status` | string | `VERIFIED_BY_NIM`, `VERIFIED_BY_NIM_MINOR_SPELLING_VARIANT`, `MATCHED_BY_EXACT_NAME_MISSING_NIM`, atau `IDENTITY_UNCERTAIN` |

---

## 4. Logika Resolusi Identitas Mahasiswa

1. **Kunci Utama (NIM + Validasi Konsensus Nama)**:
   - Setiap NIM dibangun profil nama konsensus lintas seluruh periode (mengelompokkan ejaan minor/terpotong dengan ambang kemiripan `>= 0.72`).
   - Jika pada satu file tertentu sebuah NIM tiba-tiba tercatat dengan nama orang yang sepenuhnya berbeda (mis. akibat pergeseran urutan kolom saat sort Excel pada `06-11-2026` Filsafat dan sebagian FILKOM — terdeteksi **84 rekaman konflik**), sistem **TIDAK menggabungkannya secara diam-diam**. Rekaman tersebut dikarantina sebagai `IDENTITY_UNCERTAIN` dan dilaporkan pada audit kualitas data untuk tinjauan manual.
2. **Penanganan NIM Kosong (Cautious Name Matching)**:
   - Normalisasi Unicode NFKD, huruf kecil, hapus tanda baca, rapikan spasi.
   - Hanya dicocokkan jika terdapat **tepat satu** NIM unik dengan nama ternormalisasi identik pada fakultas yang sama (contoh riil: *Etha Oktovina Yewen* di `20-11-2025` FEKON dicocokkan eksak ke NIM `12510690`). Jika tidak unik, ditandai `IDENTITY_UNCERTAIN`.
3. **Nama Sama dengan NIM Berbeda**:
   - Terdeteksi 1 pasangan nama identik pada dua NIM berbeda (`12410376`, `12610568`); sistem **tidak** menggabungkannya otomatis dan menandainya untuk tinjauan manual.

---

## 5. Logika Kontinuitas Mahasiswa, Data Hilang & Kriteria Kelayakan

**Prinsip Utama Data Hilang**: Ketidakhadiran mahasiswa dalam suatu laporan periode dicatat sebagai `status: "ABSENT", total_points: null` — **TIDAK PERNAH diubah menjadi 0 poin**.

| Kategori Kontinuitas | Definisi Algoritmik | Layak Clustering | Layak Pelatihan Supervised | Layak Prediksi Mendatang |
|---|---|---|---|---|
| `CONTINUOUSLY_OBSERVED` | Hadir di seluruh 5 periode (`PPPPP`) | Ya | Ya | Ya |
| `TEMPORARY_GAP_RETURNED` | Sempat hilang lalu kembali 1 siklus (`PPAPP`, dll.) | Ya | Ya (hanya pasangan `T->T+1` yang keduanya hadir) | Ya |
| `NEWLY_OBSERVED` | Absen di periode awal, hadir terus hingga periode terbaru (`AAAPP`, `AAAAP`) | Ya | Ya jika `>=2` periode berurutan | Ya |
| `INTERMITTENT_OBSERVATION` | Lebih dari 1 siklus hilang-kembali (`PAPAP`) | Ya | Hanya jika ada pasangan `T->T+1` berurutan | Ya jika hadir di periode terbaru |
| `INACTIVE_OR_GRADUATED_UNCONFIRMED` | Hadir di awal lalu tidak pernah muncul lagi di periode terbaru (`PPAAA`) — **BUKAN konfirmasi kelulusan resmi** | Ya (untuk analisis historis) | Ya untuk transisi historis valid sebelum hilang; **tidak** menghasilkan target kosong | **Tidak** (tidak diprediksi otomatis) |
| `INSUFFICIENT_HISTORY` | Hanya 1 observasi terisolasi di tengah | Ya | **Tidak** | **Tidak** |
| `IDENTITY_UNCERTAIN` | Konflik NIM-Nama atau identitas ambigu | **Tidak** | **Tidak** | **Tidak** |

---

## 6. Rekayasa Fitur (Bebas Kebocoran Data)

- **Identitas yang Dilarang sebagai Fitur**: `nim`, `student_name`, `internal_student_id`, `student_id`.
- **Fitur Clustering (14 fitur numerik per mahasiswa terverifikasi)**:
  `mean_points`, `max_points`, `min_points`, `std_points`, `latest_points`, `mean_period_percentile`, `max_period_percentile`, `point_trend_slope`, `avg_point_change`, `observed_periods_count`, `missing_periods_count`, `freq_positive_periods`, `freq_high_point_periods`, `freq_point_increases`.
- **Fitur Prediksi Supervised (22 fitur kronologis pada waktu `T` untuk memprediksi `T+1`)**:
  Seluruh agregasi dihitung **ketat dari periode `<= T`**: `current_points`, `current_period_percentile`, `current_points_to_period_mean`, `current_is_zero`, `prev_points` (`NaN` jika observasi pertama — diimputasi median *training fold* saja), `has_prev_observation`, `last_point_change`, `historical_mean/max/min/std_points`, `historical_mean/max_percentile`, `historical_percentile_trend`, `observed_periods_so_far`, `missing_periods_so_far`, `freq_positive/high_point/point_increases_so_far`, plus metadata kalender yang diketahui pada waktu prediksi (`current_period_position_in_semester`, `is_same_semester_transition`, `days_to_next_period`).

---

## 7. Metodologi Unsupervised Clustering (Pipeline A)

- **Algoritma**: K-Means (`K = 2..8`, `n_init=20`, `random_state=42`) dengan praproses `SimpleImputer(median) + StandardScaler`, dibandingkan terhadap `AgglomerativeClustering (Ward)` dan `DBSCAN`.
- **Evaluasi**: Silhouette Score, Davies-Bouldin Index, Calinski-Harabasz Score, ukuran klaster minimum, keseimbangan klaster, dan keterbacaan profil.
- **Hasil pada Dataset Riil (`2,827` mahasiswa layak)**:
  - K-Means `K=7` mencapai Silhouette `0.3849`, Davies-Bouldin `1.0380`, Calinski-Harabasz `1310.51`, ukuran klaster minimum `117` (`4.14%`), membentuk 7 profil akumulasi poin deskriptif dari *Minimal / Zero Point Accumulation Profile* (`avg=0.2`) hingga *Very High Point Accumulation Profile* (`avg=109.49`).
- **Disclaimer**: Klaster statistik tidak boleh disajikan sebagai klasifikasi risiko disiplin resmi.

---

## 8. Metodologi Prediksi Supervised & Validasi Temporal (Pipeline B)

- **Strategi Validasi Kronologis (Bukan Random Split)**:
  - `T1`: `2025-11-20 → 2026-03-09` (`1,589` sampel, lintas semester) — **Train**
  - `T2`: `2026-03-09 → 2026-04-29` (`1,928` sampel, dalam semester) — **Train**
  - `T3`: `2026-04-29 → 2026-10-01` (`1,284` sampel, lintas semester) — **Train**
  - `T4`: `2026-10-01 → 2026-11-06` (`1,797` sampel, dalam semester) — **Chronological Holdout Test**
  - Dilengkapi **Expanding-Window Temporal CV** (`[T1]→T2`, `[T1,T2]→T3`, `[T1,T2,T3]→T4`) serta evaluasi terpisah per subgrup riwayat (`PREVIOUSLY_OBSERVED_CONTINUOUS`, `NEWLY_OBSERVED_AT_T`, `INCOMPLETE_HISTORY_WITH_GAP`).
- **Target A — Regresi (`next_period_total_points`)**:
  - `RandomForestRegressor` (**Model Aktif Terpilih**): **MAE=21.65, RMSE=34.49, R²=0.5626, CV RMSE=31.47** (stabil terhadap pergeseran skala antar periode dan melampaui `MeanBaseline` RMSE=55.79 serta `PersistenceBaseline` RMSE=52.02).
  - `DecisionTreeRegressor`: MAE=21.91, RMSE=34.77, R²=0.5555, CV RMSE=33.23.
  - `LinearRegression (Ridge alpha=500)`: MAE=23.81, RMSE=35.85, R²=0.5275 (regularisasi L2 kuat diterapkan untuk mencegah pembalikan tanda koefisien akibat multikolinearitas antara poin mentah dan rasio poin per periode).
- **Target B — Klasifikasi (`next_period_point_tier`: `LOW`, `MEDIUM`, `HIGH`)**:
  - Ambang diturunkan **ketat dari data latih** (`Q50=8.0`, `Q80=40.0` → `LOW <= 8`, `MEDIUM 8–40`, `HIGH > 40`) dan dapat dikonfigurasi ulang.
  - `DecisionTreeClassifier`: **Accuracy=73.01%, Macro F1=0.6897, Balanced Accuracy=0.6938, HIGH Recall=0.8172** (baseline mayoritas: Macro F1=0.1820).
  - `RandomForestClassifier`: **Accuracy=72.01%, Macro F1=0.7042, Balanced Accuracy=0.7031, HIGH Recall=0.7069, CV Macro F1=0.6213**.
  - `LogisticRegression`: Accuracy=69.78%, Macro F1=0.6251, Balanced Accuracy=0.6462, HIGH Recall=0.7855.

---

## 9. Manajemen Model & Versi Artefak

- Artefak disimpan di `ml-service/artifacts/models/<model_id>.joblib` (berisi seluruh `Pipeline`: imputer, scaler, model, daftar fitur, dan konfigurasi threshold) beserta `<model_id>_evaluation.json`.
- Metadata terpusat di `ml-service/artifacts/registry.json` dan disinkronkan ke tabel PostgreSQL (`ml_dataset_versions`, `ml_training_runs`, `ml_models`, `ml_prediction_logs`).
- **Perlindungan Model Aktif**: Pelatihan baru selalu mendaftarkan model sebagai `CANDIDATE` dan **tidak pernah menimpa model `ACTIVE` secara diam-diam**. Aktivasi dilakukan eksplisit lewat `POST /api/v1/ml/models/select` atau tombol **Aktifkan Model** pada dashboard.

---

## 10. Referensi API

Semua endpoint backend dilindungi JWT (`Authorization: Bearer <token>`), dan meneruskan `X-ML-API-Key` ke FastAPI:

| Method | Backend Endpoint (`/api/v1/...`) | FastAPI Endpoint | Fungsi |
|---|---|---|---|
| `GET` | `/api/v1/ml/status` | `/ml/status` | Status layanan ML, versi dataset, model aktif |
| `GET` | `/api/v1/ml/dataset/summary` | `/ml/dataset/summary` | Ringkasan dataset, tren periode, log file |
| `GET` | `/api/v1/ml/dataset/quality` | `/ml/dataset/quality` | Laporan kualitas data, konflik NIM, outlier |
| `GET` | `/api/v1/ml/students/continuity` | `/ml/students/continuity` | Daftar kontinuitas & kelayakan mahasiswa (filter/paging) |
| `POST` | `/api/v1/ml/process-data` | `/ml/process-data` | Pindai & proses ulang folder data historis (read-only) |
| `POST` | `/api/v1/ml/train/clustering` | `/ml/train/clustering` | Latih eksperimen clustering |
| `POST` | `/api/v1/ml/train/prediction` | `/ml/train/prediction` | Latih eksperimen regresi & klasifikasi temporal |
| `POST` | `/api/v1/ml/train/all` | `/ml/train/all` | Jalankan seluruh pipeline ML |
| `GET` | `/api/v1/ml/models` | `/ml/models` | Daftar seluruh versi model |
| `GET` | `/api/v1/ml/models/compare` | `/ml/models/compare` | Perbandingan metrik antar model |
| `GET` | `/api/v1/ml/models/selected` | `/ml/models/selected` | Model aktif untuk Clustering, Regression, Classification |
| `POST` | `/api/v1/ml/models/select` | `/ml/models/select` | Aktivasi eksplisit model terpilih setelah evaluasi |
| `POST` | `/api/v1/ml/predict` | `/ml/predict` | Estimasi prediksi satu mahasiswa |
| `POST` | `/api/v1/ml/predict/batch` | `/ml/predict/batch` | Estimasi prediksi batch |
| `GET` | `/api/v1/ml/training/history` | `/ml/training/history` | Riwayat training run & versi dataset |
| `GET` | `/api/v1/ml/clusters` | `/ml/clusters` | Profil klaster & koordinat PCA 2D |
| `GET` | `/api/v1/ml/evaluation` | `/ml/evaluation` | Detail evaluasi temporal, confusion matrix, residual |

---

## 11. Panduan Operasional (Semester Baru, Retraining, Evaluasi, Seleksi, Prediksi)

### Variabel Lingkungan
- `HISTORICAL_DATA_DIR` — lokasi direktori laporan historis (default: `D:\from c\Documents\holyyy\ML\Data Poin Mahasiswa`)
- `ML_ARTIFACTS_DIR` — lokasi penyimpanan artefak model & dataset (default: `ml-service/artifacts`)
- `ML_SERVICE_URL` — URL layanan FastAPI (default: `http://localhost:8001`)
- `ML_SERVICE_API_KEY` / `API_SECRET_KEY` — kunci rahasia komunikasi backend ↔ ML service
- `ML_RANDOM_STATE` — seed reproduksibilitas (default: `42`)

### Memproses Laporan Semester Baru
1. Tambahkan folder tanggal baru berformat `DD-MM-YYYY` (mis. `15-03-2027`) berisi laporan PDF/XLSX di `Data Poin Mahasiswa`.
2. Di aplikasi web **StudentInsight → Pusat ML Historis → Dataset & Kualitas**, klik **Deteksi & Proses File Baru** (atau via CLI: `.\.venv\Scripts\python.exe scripts\run_historical_ml_pipeline.py`).
3. Hanya file baru/berubah yang diparsing; dataset versi baru dibuat dan kualitas/kontinuitas dihitung ulang.

### Melatih Ulang, Mengevaluasi & Memilih Model Aktif
1. Buka tab **Pelatihan & Model**, atur parameter (rentang `K`, tugas regresi/klasifikasi, ambang kustom bila diperlukan), lalu klik mulai pelatihan.
2. Buka tab **Evaluasi Temporal** untuk meninjau metrik kronologis, *confusion matrix*, *residual*, dan performa subgrup.
3. Kembali ke tab **Pelatihan & Model**, tinjau baris kandidat baru pada tabel **Registri Model**, lalu klik **Aktifkan Model** hanya bila hasil evaluasi memuaskan.

### Membuat Prediksi
1. Buka tab **Pusat Prediksi**, cari mahasiswa berdasarkan NIM atau nama, pilih skenario target (semester baru atau akhir semester sama).
2. Sistem menampilkan riwayat poin observasi, estimasi poin regresi, probabilitas kategori klasifikasi, profil klaster statistik, serta daftar fitur yang dipakai.

---

## 12. Keterbatasan, Privasi & Etika ML

- **Keterbatasan Data**: Saat ini tersedia 5 snapshot (4 transisi). Lonjakan skala poin dari awal semester (`P4`, maks 66) ke akhir semester (`P5`, maks 213) menyebabkan *scale shift* yang membuat model linear lebih stabil untuk ekstrapolasi dibanding pohon keputusan pada regresi. Selain itu, terdapat 84 baris konflik NIM-Nama pada file sumber `06-11-2026` (Filsafat/FILKOM) yang sengaja dikarantina agar tidak merusak integritas pelatihan.
- **Privasi**: Seluruh endpoint `/api/v1/ml/**` mewajibkan autentikasi JWT; log pelatihan tidak mencetak daftar nama mahasiswa; nama/NIM tidak pernah dijadikan fitur ML.
- **Etika**: Output model bukan keputusan hukuman otomatis. Klaster adalah profil statistik dan prediksi adalah estimasi probabilistik untuk membantu pembinaan pastoral/konseling secara manusiawi.
