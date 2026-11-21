# STUDENTINSIGHT v2.0
## Sistem Pemantauan Keamanan, Kedisiplinan, dan Kesejahteraan Mahasiswa Berbasis Laporan PDF & Deteksi Risiko Dinamis
### Universitas Klabat

Sistem informasi cerdas berbasis web dengan **1 peran tunggal (`User`)** untuk membaca laporan PDF poin Sabat mahasiswa dari *Village Dean*, memvisualisasikan sebaran poin per program studi, mendeteksi kelompok risiko secara dinamis tanpa batas baku di tengah semester, memproyeksikan poin akhir menjelang tutup absen semester, serta mengelola pembinaan pastoral, laporan kesejahteraan, dan kontak darurat orang tua/wali.

---

## 🔑 Akun Default (Single Role: `User`)

| Peran | Username | Password | Deskripsi Hak Akses |
|---|---|---|---|
| **User** | `user` | `password` | Akses penuh seluruh sistem (Unggah PDF, Dashboard, Mahasiswa, Deteksi Risiko, Pembinaan, Kesejahteraan, Kontak Darurat, Laporan & Semester). |

---

## 🚀 Cara Menjalankan Sistem (1 Perintah Saja)

Cukup jalankan `npm run dev` di folder `frontend`, maka seluruh layanan (**Pembaca PDF & Prediksi** port `8001`, **Server Utama** port `8080`, dan **Antarmuka Web** port `5173`) akan otomatis menyala bersamaan (dan otomatis mengecek / menyalakan PostgreSQL jika belum aktif):

```powershell
cd studentinsight\frontend
npm run dev
```

Setelah siap, buka di browser: `http://localhost:5173` lalu masuk dengan `user` / `password`.
Tekan `Ctrl + C` di terminal untuk menghentikan seluruh layanan secara bersih.
