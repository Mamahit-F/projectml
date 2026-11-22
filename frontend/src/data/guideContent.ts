export type TooltipPlacement = 'bottom' | 'top' | 'right' | 'left';

export interface GuideStep {
  id: string;
  stepNumber: number;
  title: string;
  shortTitle: string;
  route: string;
  targetSelector: string;
  preferredPlacement?: TooltipPlacement;
  badge: string;
  summary: string;
  callToAction: string;
  actionSteps: string[];
  proTip: string;
}

export interface QuickWorkflowItem {
  order: string;
  title: string;
  description: string;
  route: string;
  stepIndex: number;
}

export interface GlossaryItem {
  term: string;
  category: 'Sistem' | 'Data & Kontinuitas' | 'Machine Learning';
  explanation: string;
}

export const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'sidebar-navigation',
    stepNumber: 1,
    title: 'Navigasi Menu Utama StudentInsight',
    shortTitle: 'Navigasi Menu',
    route: '/dashboard',
    targetSelector: '[data-guide="sidebar-nav"]',
    preferredPlacement: 'right',
    badge: 'Mulai di Sini',
    summary:
      'Semua fitur StudentInsight tersusun berurutan di menu kiri ini — mulai dari Dashboard, Unggah PDF, Direktori Mahasiswa, Deteksi Risiko, Pusat ML Historis, hingga Pembinaan dan Laporan Excel.',
    callToAction:
      'Gunakan menu di samping ini kapan saja untuk berpindah halaman, atau klik "Lanjut" untuk menelusuri tiap fitur satu per satu.',
    actionSteps: [
      'Alur dasar: Unggah PDF / Proses ML Historis → Pantau Dashboard & Risiko → Catat Pembinaan → Unduh Laporan.',
      'Anda bisa menekan tombol "Batalkan" atau tombol Esc kapan saja untuk keluar dari Mode Panduan.',
    ],
    proTip:
      'Di bagian bawah sidebar selalu tersedia tombol Mode Panduan agar Anda bisa membuka ulang panduan ini secara bebas.',
  },
  {
    id: 'dashboard-summary',
    stepNumber: 2,
    title: 'Ringkasan Mahasiswa & Pembaruan Analisis',
    shortTitle: 'Ringkasan Dashboard',
    route: '/dashboard',
    targetSelector: '[data-guide="dashboard-summary"]',
    preferredPlacement: 'right',
    badge: 'Dashboard',
    summary:
      'Kartu ini menampilkan total mahasiswa aktif yang sedang dipantau, jumlah mahasiswa yang sudah memiliki poin Sabat, serta ringkasan cepat 3 program studi teratas.',
    callToAction:
      'Klik tombol "Perbarui Analisis Risiko" di dalam kartu ini setelah mengunggah PDF baru atau mengubah jadwal semester.',
    actionSteps: [
      'Klik salah satu kotak Prodi di bagian bawah kartu untuk langsung menyaring daftar mahasiswa prodi tersebut.',
      'Klik label "Arsip PDF" di kanan atas kartu untuk meninjau riwayat file laporan yang sudah diunggah.',
    ],
    proTip:
      'Jika data masih kosong, tombol utama otomatis mengarahkan Anda ke halaman Unggah PDF Pertama.',
  },
  {
    id: 'dashboard-risk-tiles',
    stepNumber: 3,
    title: 'Kartu Indikator Risiko & Statistik Cepat',
    shortTitle: 'Indikator Risiko',
    route: '/dashboard',
    targetSelector: '[data-guide="dashboard-risk-tiles"]',
    preferredPlacement: 'bottom',
    badge: 'Dashboard',
    summary:
      'Menampilkan jumlah mahasiswa Risiko Tinggi (kartu oranye), rata-rata & poin tertinggi, jumlah mahasiswa Aman (0 poin), serta pembinaan/kesejahteraan aktif.',
    callToAction:
      'Klik langsung kotak "Risiko Tinggi" berwarna oranye untuk membuka daftar mahasiswa prioritas pembinaan.',
    actionSteps: [
      'Pantau persentase Risiko Tinggi setiap kali laporan PDF baru masuk.',
      'Gulir ke bawah di Dashboard untuk melihat grafik sebaran per Prodi dan tabel Mahasiswa Prioritas.',
    ],
    proTip:
      'Angka di sini otomatis terbarui setiap kali Anda mengimpor laporan PDF baru.',
  },
  {
    id: 'pdf-upload',
    stepNumber: 4,
    title: 'Unggah Laporan PDF Poin Sabat',
    shortTitle: 'Unggah PDF',
    route: '/pdf-reports',
    targetSelector: '[data-guide="pdf-dropzone"]',
    preferredPlacement: 'right',
    badge: 'Input Data',
    summary:
      'Area ini membaca tabel laporan poin Sabat berformat PDF dari Village Dean secara otomatis (mendukung format 6 kolom maupun 5 kolom tanpa input manual).',
    callToAction:
      'Klik atau seret file .pdf ke kotak bertitik ini untuk melihat Pratinjau otomatis sebelum menyimpan ke database.',
    actionSteps: [
      'Pilih file .pdf → periksa tabel pratinjau di sebelah kanan.',
      'Atur Tanggal Laporan dan Label Periode, lalu klik "Konfirmasi & Simpan".',
      'Sistem otomatis menambah/memperbarui data mahasiswa dan menghitung ulang kelompok risiko.',
    ],
    proTip:
      'Semua file yang pernah diunggah tersimpan di daftar Arsip di bagian bawah halaman ini.',
  },
  {
    id: 'students-filter',
    stepNumber: 5,
    title: 'Cari & Filter Direktori Mahasiswa',
    shortTitle: 'Cari Mahasiswa',
    route: '/students',
    targetSelector: '[data-guide="students-filter"]',
    preferredPlacement: 'bottom',
    badge: 'Data Master',
    summary:
      'Gunakan bilah pencarian dan filter ini untuk menemukan mahasiswa tertentu berdasarkan Nama, NIM, Program Studi, atau Tingkat Risiko.',
    callToAction:
      'Ketik nama atau NIM mahasiswa di kolom pencarian, lalu klik baris mahasiswa pada tabel untuk membuka profil lengkapnya.',
    actionSteps: [
      'Di halaman profil mahasiswa, Anda bisa melihat grafik riwayat poin, mencatat pembinaan, laporan kesejahteraan, dan kontak darurat.',
      'Gunakan tombol "Edit" untuk melengkapi alamat kos dan kategori tempat tinggal (Outsider Dekat/Jauh).',
    ],
    proTip:
      'Tabel secara default diurutkan dari mahasiswa dengan Poin Sabat tertinggi di urutan paling atas.',
  },
  {
    id: 'risk-run-button',
    stepNumber: 6,
    title: 'Jalankan Analisis Risiko Dinamis',
    shortTitle: 'Analisis Risiko',
    route: '/predictions',
    targetSelector: '[data-guide="risk-run-btn"]',
    preferredPlacement: 'bottom',
    badge: 'Peringatan Dini',
    summary:
      'Tombol ini memicu layanan Machine Learning (K-Means dinamis + proyeksi tutup absen) untuk menghitung ulang kategori risiko seluruh mahasiswa aktif.',
    callToAction:
      'Klik "Jalankan Analisis Ulang" kapan saja setelah mengubah jadwal tutup absen atau batas poin final semester.',
    actionSteps: [
      'Mahasiswa 0 poin otomatis ditempatkan di kelompok Aman.',
      'Mahasiswa berpoin dikelompokkan alami mengikuti sebaran aktual tanpa memerlukan batas baku di tengah semester.',
    ],
    proTip:
      'Hasil deteksi ini berfungsi sebagai pendukung keputusan pembinaan pastoral, bukan vonis hukuman otomatis.',
  },
  {
    id: 'risk-cards',
    stepNumber: 7,
    title: 'Filter Cepat Kelompok Risiko',
    shortTitle: 'Kartu Kelompok Risiko',
    route: '/predictions',
    targetSelector: '[data-guide="risk-cards"]',
    preferredPlacement: 'bottom',
    badge: 'Peringatan Dini',
    summary:
      'Keempat kartu ini menunjukkan jumlah, persentase, dan rentang poin alami masing-masing kelompok (Risiko Tinggi, Sedang, Rendah, dan Aman 0 Poin).',
    callToAction:
      'Klik salah satu kartu kategori untuk langsung menyaring tabel mahasiswa di bawahnya.',
    actionSteps: [
      'Klik kartu yang sama sekali lagi untuk menampilkan kembali seluruh mahasiswa.',
      'Perhatikan kolom "Proyeksi Akhir" untuk melihat perkiraan poin menjelang tanggal tutup absen.',
    ],
    proTip:
      'Ikon telepon hijau pada baris mahasiswa menandakan kontak darurat orang tua/wali sudah tersedia.',
  },
  {
    id: 'ml-process-data',
    stepNumber: 8,
    title: 'Proses Data Historis Multi-Semester (PDF & Excel)',
    shortTitle: 'ML: Proses Dataset',
    route: '/ml-analytics',
    targetSelector: '[data-guide="ml-process-btn"]',
    preferredPlacement: 'bottom',
    badge: 'Pusat ML Historis',
    summary:
      'Tombol ini memindai folder laporan historis (read-only), mengekstrak file PDF/Excel baru secara incremental (SHA-256), menyelesaikan identitas, dan mengaudit kualitas data.',
    callToAction:
      'Klik "Proses Data Historis" setiap kali Anda menambahkan folder tanggal laporan semester baru.',
    actionSteps: [
      'File asli tidak pernah diubah atau dihapus.',
      'Konflik NIM-Nama otomatis dikarantina sebagai IDENTITY_UNCERTAIN agar tidak merusak pelatihan model.',
    ],
    proTip:
      'Pemrosesan ulang file yang tidak berubah berlangsung sangat cepat berkat cache SHA-256.',
  },
  {
    id: 'ml-tabs-bar',
    stepNumber: 9,
    title: 'Jelajahi 8 Tab Analitik Machine Learning',
    shortTitle: 'ML: 8 Tab Analitik',
    route: '/ml-analytics',
    targetSelector: '[data-guide="ml-tabs"]',
    preferredPlacement: 'bottom',
    badge: 'Pusat ML Historis',
    summary:
      'Bilah tab ini memisahkan seluruh siklus ML secara transparan: Ringkasan, Dataset & Kualitas, Kontinuitas Mahasiswa (7 kategori), Klastering Pola, Pelatihan & Seleksi Model, Evaluasi Temporal, Pusat Prediksi, dan Riwayat.',
    callToAction:
      'Pilih tab sesuai kebutuhan — buka "Kontinuitas Mahasiswa" untuk melihat pola hadir/absen (missing ≠ 0 poin) atau "Evaluasi Temporal" untuk metrik model.',
    actionSteps: [
      'Tab "Pelatihan & Model": latih ulang clustering/regresi/klasifikasi lalu klik "Aktifkan Model" secara sadar setelah meninjau metrik.',
      'Tab "Klastering Pola": lihat profil kelompok poin (bersifat statistik, bukan klaim risiko disiplin resmi).',
    ],
    proTip:
      'Model baru yang dilatih tidak pernah menimpa model aktif secara diam-diam tanpa persetujuan Anda.',
  },
  {
    id: 'ml-predict-button',
    stepNumber: 10,
    title: 'Buka Pusat Prediksi Periode Mendatang',
    shortTitle: 'ML: Pusat Prediksi',
    route: '/ml-analytics',
    targetSelector: '[data-guide="ml-predict-btn"]',
    preferredPlacement: 'bottom',
    badge: 'Pusat ML Historis',
    summary:
      'Pintasan langsung menuju Pusat Prediksi untuk melihat riwayat poin historis seorang mahasiswa sekaligus estimasi poin & kategori periode berikutnya.',
    callToAction:
      'Klik "Prediksi Mahasiswa", cari NIM/nama mahasiswa, lalu pilih skenario semester berikutnya untuk melihat estimasi.',
    actionSteps: [
      'Tampilkan estimasi angka poin (Regresi), probabilitas LOW/MEDIUM/HIGH (Klasifikasi), profil klaster, dan fitur yang dipakai.',
      'Mahasiswa yang tidak terobservasi pada periode terbaru otomatis ditandai tidak layak prediksi otomatis.',
    ],
    proTip:
      'Semua prediksi adalah estimasi statistik untuk pembinaan proaktif, bukan jaminan atau bukti pelanggaran.',
  },
  {
    id: 'followup-action',
    stepNumber: 11,
    title: 'Catat Sesi Pembinaan & Konseling',
    shortTitle: 'Pembinaan',
    route: '/follow-up',
    targetSelector: '[data-guide="followup-action"]',
    preferredPlacement: 'bottom',
    badge: 'Tindak Lanjut',
    summary:
      'Dokumentasikan jadwal konseling, topik yang dibahas, rencana tindakan (action plan), dan hasil evaluasi perkembangan mahasiswa.',
    callToAction:
      'Klik "Catat Sesi Pembinaan" untuk menambahkan catatan pendampingan baru bagi mahasiswa prioritas.',
    actionSteps: [
      'Pilih mahasiswa melalui kolom pencarian nama/NIM, lalu isi tanggal dan rencana tindakan.',
      'Perbarui status menjadi "Selesai" beserta catatan evaluasi setelah konseling dilaksanakan.',
    ],
    proTip:
      'Catatan pembinaan juga otomatis muncul di halaman Profil Detail mahasiswa.',
  },
  {
    id: 'welfare-action',
    stepNumber: 12,
    title: 'Buat Laporan Kesejahteraan & Keamanan',
    shortTitle: 'Kesejahteraan',
    route: '/welfare',
    targetSelector: '[data-guide="welfare-action"]',
    preferredPlacement: 'bottom',
    badge: 'Dukungan Mahasiswa',
    summary:
      'Kelola laporan kendala indekos, keamanan lingkungan, kesehatan, atau finansial mahasiswa di luar asrama beserta tingkat prioritasnya.',
    callToAction:
      'Klik "Buat Laporan Kasus" saat menerima laporan kendala mahasiswa yang memerlukan perhatian dan penyelesaian.',
    actionSteps: [
      'Tentukan jenis kasus dan prioritas (Rendah hingga Mendesak).',
      'Gunakan filter status (Terbuka / Dalam Penanganan / Selesai) untuk memantau progres penanganan.',
    ],
    proTip:
      'Banyak kasus absensi berulang berkaitan dengan kendala kesehatan atau tempat tinggal — pantau bersama data poin.',
  },
  {
    id: 'emergency-action',
    stepNumber: 13,
    title: 'Kelola Kontak Darurat Orang Tua / Wali',
    shortTitle: 'Kontak Darurat',
    route: '/emergency-contacts',
    targetSelector: '[data-guide="emergency-action"]',
    preferredPlacement: 'bottom',
    badge: 'Komunikasi Cepat',
    summary:
      'Simpan dan cari nomor telepon orang tua atau wali mahasiswa agar mudah dihubungi ketika diperlukan komunikasi cepat atau kondisi darurat.',
    callToAction:
      'Klik "Tambah Kontak Wali" untuk mendaftarkan nomor telepon dan hubungan keluarga wali mahasiswa.',
    actionSteps: [
      'Gunakan kotak pencarian di bawahnya untuk mencari kontak lewat nama mahasiswa, NIM, atau nama wali.',
    ],
    proTip:
      'Kontak darurat juga bisa langsung dilihat dari halaman Profil Detail tiap mahasiswa.',
  },
  {
    id: 'semester-settings',
    stepNumber: 14,
    title: 'Atur Jadwal Semester & Unduh Laporan Excel',
    shortTitle: 'Laporan & Semester',
    route: '/reports-settings',
    targetSelector: '[data-guide="semester-form"]',
    preferredPlacement: 'top',
    badge: 'Ekspor & Pengaturan',
    summary:
      'Atur tanggal mulai semester, tanggal tutup absen, serta batas poin final opsional untuk perhitungan proyeksi. Di bagian bawah halaman ini Anda juga bisa mengunduh 5 jenis laporan Excel (.xlsx).',
    callToAction:
      'Pastikan tanggal tutup absen sesuai kalender akademik, lalu gulir ke bawah bila ingin mengekspor rekap Excel.',
    actionSteps: [
      'Biarkan "Batas Poin Final" kosong saat tengah semester; isi ketika batas resmi akhir semester ditetapkan.',
      'Selesai! Klik "Selesai" untuk mulai menggunakan StudentInsight. Mode Panduan selalu bisa dibuka kembali kapan saja.',
    ],
    proTip:
      'Anda dapat menekan tombol "Mode Panduan" di pojok kanan bawah atau sidebar kapan pun butuh pengingat cepat.',
  },
];

export const QUICK_WORKFLOW: QuickWorkflowItem[] = [
  {
    order: 'Langkah 1',
    title: 'Siapkan Data Laporan (PDF / Historis)',
    description:
      'Unggah laporan PDF terbaru di "Unggah & Arsip PDF", atau proses seluruh folder laporan historis lintas semester di "Pusat ML Historis".',
    route: '/pdf-reports',
    stepIndex: 3,
  },
  {
    order: 'Langkah 2',
    title: 'Pantau Ringkasan & Deteksi Risiko',
    description:
      'Buka "Dashboard" dan "Deteksi Risiko" untuk melihat sebaran poin per prodi, mahasiswa risiko tinggi, serta proyeksi menjelang tutup absen.',
    route: '/dashboard',
    stepIndex: 1,
  },
  {
    order: 'Langkah 3',
    title: 'Analisis Pola & Estimasi Masa Depan (ML)',
    description:
      'Gunakan "Pusat ML Historis" untuk mengecek kontinuitas mahasiswa, melihat profil klaster, mengevaluasi model, dan melihat estimasi periode berikutnya.',
    route: '/ml-analytics',
    stepIndex: 7,
  },
  {
    order: 'Langkah 4',
    title: 'Lakukan Pembinaan & Unduh Laporan',
    description:
      'Catat konseling di "Pembinaan", tangani kendala di "Kesejahteraan", hubungi wali di "Kontak Darurat", lalu ekspor Excel di "Laporan & Semester".',
    route: '/follow-up',
    stepIndex: 10,
  },
];

export const GLOSSARY_ITEMS: GlossaryItem[] = [
  {
    term: 'Poin Sabat',
    category: 'Sistem',
    explanation:
      'Akumulasi poin ketidakhadiran/pelanggaran kegiatan peribadatan Sabat pada semester berjalan. Nilai 0 berarti mahasiswa bersih dari poin.',
  },
  {
    term: 'Deteksi Risiko Dinamis (Tanpa Batas Baku)',
    category: 'Sistem',
    explanation:
      'Pengelompokan otomatis mengikuti sebaran poin aktual pada laporan PDF terbaru, karena batas poin resmi sering kali baru ditetapkan menjelang akhir semester.',
  },
  {
    term: 'Data Hilang vs 0 Poin',
    category: 'Data & Kontinuitas',
    explanation:
      'Jika mahasiswa tidak muncul di suatu laporan periode (tanda "—"), sistem mencatatnya sebagai tidak terobservasi (missing), BUKAN 0 poin.',
  },
  {
    term: 'INACTIVE_OR_GRADUATED_UNCONFIRMED',
    category: 'Data & Kontinuitas',
    explanation:
      'Mahasiswa hadir di periode awal lalu tidak muncul lagi di periode terbaru. Riwayatnya tetap disimpan, tetapi sistem tidak mengklaim kelulusan resmi.',
  },
  {
    term: 'IDENTITY_UNCERTAIN',
    category: 'Data & Kontinuitas',
    explanation:
      'Rekaman yang dikarantina karena konflik NIM-Nama pada file sumber atau NIM kosong yang ambigu, sehingga tidak digabung otomatis dan tidak merusak pelatihan ML.',
  },
  {
    term: 'Silhouette & Davies-Bouldin (Clustering)',
    category: 'Machine Learning',
    explanation:
      'Metrik kualitas pengelompokan klaster: Silhouette lebih tinggi (mendekati 1) dan Davies-Bouldin lebih rendah menunjukkan klaster yang lebih terpisah jelas.',
  },
  {
    term: 'MAE, RMSE & R² (Regresi)',
    category: 'Machine Learning',
    explanation:
      'MAE/RMSE mengukur rata-rata selisih estimasi poin dari nilai aktual (makin kecil makin akurat). R² mendekati 1 berarti model menjelaskan variasi data dengan lebih baik.',
  },
  {
    term: 'Macro F1 & Recall HIGH (Klasifikasi)',
    category: 'Machine Learning',
    explanation:
      'Macro F1 menyeimbangkan akurasi semua kelas (LOW/MEDIUM/HIGH) meski jumlahnya tidak seimbang. Recall HIGH mengukur seberapa banyak kasus poin tinggi yang berhasil tertangkap.',
  },
  {
    term: 'Model CANDIDATE vs ACTIVE',
    category: 'Machine Learning',
    explanation:
      'Setiap kali melatih model baru, model disimpan sebagai CANDIDATE agar tidak menimpa model aktif secara diam-diam. Administrator memilih "Aktifkan Model" setelah meninjau evaluasi.',
  },
];
