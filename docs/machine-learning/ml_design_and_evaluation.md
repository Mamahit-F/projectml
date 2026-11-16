# Machine Learning Design, Leakage Prevention & Evaluation Plan
## StudentInsight: Smart Student Monitoring & Prediction System

### 1. Problem Framing & Objective
Tujuan Machine Learning adalah memprediksi **Risiko Ketidakdisiplinan Kehadiran Mahasiswa Outsider** untuk periode mendatang ke dalam 3 kelas:
- `LOW`: Mahasiswa konsisten memenuhi kewajiban kehadiran (risiko pelanggaran rendah).
- `MEDIUM`: Mahasiswa dengan tren kehadiran fluktuatif, sesekali alpa atau memiliki tren keterlambatan/absen parsial.
- `HIGH`: Mahasiswa dengan frekuensi absensi tinggi, akumulasi poin pelanggaran signifikan, atau absensi berturut-turut pada kegiatan puncak (Sabbath/WOP).

Model ini berfungsi sebagai **Early Warning System (EWS)** untuk Village Dean dalam memberikan pembinaan proaktif, bukan sebagai instrumen vonis hukuman otomatis.

---

### 2. Pencegahan Data Leakage (Target & Temporal Leakage)
1. **Pemisahan Periode Observasi vs Periode Outcome**:
   - Fitur dibentuk dari data historis jendela waktu **Observasi** (misal: Minggu ke-1 hingga Minggu ke-4).
   - Label risiko (`risk_category`) ditentukan berdasarkan frekuensi pelanggaran pada jendela waktu **Outcome** (misal: Minggu ke-5 hingga Minggu ke-8).
   - Hal ini memastikan model tidak "mencontek" label dari fitur masa kini (mencegah trivial leakage seperti `if attendance_rate < 50% then HIGH`).
2. **Normalisasi Kewajiban Dinamis**:
   - Denominator kehadiran mahasiswa Outsider Dekat dan Outsider Jauh berbeda secara fundamental (Outsider Dekat memiliki kewajiban lebih banyak termasuk ibadah Jumat malam dan WOP malam).
   - Fitur `attendance_rate` dihitung secara proporsional terhadap `required_attendance` masing-masing kategori, bukan angka absolut seragam.
3. **Pemisahan Data Tanpa Kebocoran (Group Split)**:
   - Pembagian data Train/Validation/Test menggunakan teknik Stratified Split atau Group Split berdasarkan `student_id` agar data profil mahasiswa yang sama tidak muncul sekaligus di data latih dan data uji.

---

### 3. Definisi Fitur Input
| Nama Fitur | Tipe Data | Deskripsi |
|---|---|---|
| `residence_category` | Categorical | `OUTSIDER_DEKAT` (1) atau `OUTSIDER_JAUH` (0) |
| `required_attendance` | Integer | Jumlah kegiatan wajib mahasiswa dalam periode observasi |
| `present_count` | Integer | Jumlah kehadiran aktual yang valid |
| `absence_count` | Integer | Jumlah ketidakhadiran tanpa keterangan |
| `attendance_rate` | Float | Persentase kehadiran aktual terhadap kewajiban (0 - 100%) |
| `consecutive_absences` | Integer | Jumlah ketidakhadiran berturut-turut tertinggi terakhir |
| `previous_violation_points` | Integer | Akumulasi poin pelanggaran dari periode sebelumnya |
| `wop_attendance_rate` | Float | Persentase kehadiran spesifik kegiatan WOP (Week of Prayer) |

---

### 4. Algoritma yang Dibandingkan
1. **Random Forest Classifier**:
   - Mampu menangkap interaksi non-linear antara persentase kehadiran, bobot tempat tinggal, dan pola ketidakhadiran beruntun. Robust terhadap outlier.
2. **Decision Tree Classifier**:
   - Model berbasis pohon keputusan tunggal yang sangat mudah diinterpretasikan oleh pihak akademis/Village Dean.
3. **Logistic Regression (Multinomial)**:
   - Baseline linear classifier dengan regularisasi L2 dan standard scaling.

---

### 5. Metrik Evaluasi
- **Macro F1-Score**: Metrik utama untuk menyeimbangkan performa antar kelas tanpa terbias pada kelas mayoritas.
- **Recall pada Kelas HIGH**: Sangat krusial agar sistem tidak melewatkan mahasiswa yang benar-benar membutuhkan perhatian khusus (*low false negatives for high risk*).
- **Confusion Matrix & Classification Report**: Untuk analisis distribusi kesalahan klasifikasi per kelas.
