# Panduan Deploy StudentInsight ke Railway + Supabase

Arsitektur production StudentInsight menggunakan **3 service** dalam 1 Railway Project (dari repo GitHub yang sama) yang terhubung ke database cloud **Supabase PostgreSQL**:

```
Browser Pengguna
      │
      ▼
[frontend] (Nginx SPA + Reverse Proxy /api)  ──► Public Domain Railway
      │  (Private Network Railway)
      ▼
[backend] (Spring Boot 3.3 / Java 17)  ────────► Supabase PostgreSQL (TLS + RLS)
      │  (Private Network Railway)
      ▼
[ml-service] (FastAPI / Python 3.11)
```

---

## Langkah 1: Buat Project di Railway
1. Login ke [railway.com](https://railway.com) → klik **New Project** → **Deploy from GitHub repo** → pilih repo `Mamahit-F/projectml`.
2. Buat **3 service** terpisah dari repo yang sama dengan **Root Directory** masing-masing:
   - Service 1: `ml-service` → Root Directory: `/ml-service`
   - Service 2: `backend` → Root Directory: `/backend`
   - Service 3: `frontend` → Root Directory: `/frontend`
   *(Setiap folder sudah memiliki `Dockerfile` dan `railway.json` sehingga Railway otomatis mendeteksi builder & healthcheck.)*

---

## Langkah 2: Atur Environment Variables

> Siapkan 2 kunci acak kuat terlebih dahulu (mis. `openssl rand -hex 32`):
> - `JWT_SECRET` (minimal 64 karakter hex)
> - `ML_SHARED_KEY` (nilai yang **sama persis** untuk `API_SECRET_KEY` di `ml-service` dan `ML_SERVICE_API_KEY` di `backend`)

### A. Service `ml-service` (Root: `/ml-service`)
*Tidak perlu Public Domain — diakses internal oleh `backend`.*
```env
API_SECRET_KEY=<ML_SHARED_KEY>
ML_RANDOM_STATE=42
ML_CORS_ALLOWED_ORIGINS=http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:${{backend.PORT}}
```

### B. Service `backend` (Root: `/backend`)
*Boleh tetap private (di-proxy lewat `frontend`) atau beri Public Domain jika ingin diakses terpisah.*
```env
SPRING_DATASOURCE_URL=jdbc:postgresql://aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
SPRING_DATASOURCE_USERNAME=postgres.<project-ref>
SPRING_DATASOURCE_PASSWORD=<SUPABASE_DB_PASSWORD>
SPRING_DATASOURCE_HIKARI_MAX_POOL_SIZE=6

ML_SERVICE_URL=http://${{ml-service.RAILWAY_PRIVATE_DOMAIN}}:${{ml-service.PORT}}
ML_SERVICE_API_KEY=<ML_SHARED_KEY>

JWT_SECRET=<64_HEX_RANDOM_SECRET>
JWT_EXPIRATION_MS=86400000

CORS_ALLOWED_ORIGINS=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}

APP_BOOTSTRAP_DEFAULT_USER_ENABLED=false

ASSISTANT_PROVIDER=gemini
GEMINI_API_KEY=<GEMINI_API_KEY>
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_FALLBACK_MODELS=gemini-3.5-flash-lite,gemini-3.8-flash,gemini-3.1-flash-lite
APP_LOG_LEVEL=INFO
```

### C. Service `frontend` (Root: `/frontend`)
*Klik **Settings → Networking → Generate Domain** pada service `frontend` agar dapat URL publik HTTPS.*
```env
VITE_API_BASE_URL=/api/v1
BACKEND_UPSTREAM=http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:${{backend.PORT}}
```
*(Alternatif: jika tidak menggunakan private proxy `BACKEND_UPSTREAM`, kosongkan `BACKEND_UPSTREAM` dan isi `VITE_API_BASE_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}/api/v1` pada Build & Runtime Variables.)*

---

## Langkah 3: Verifikasi Setelah Deploy
1. Pastikan ketiga service berstatus **Active / Healthy** di Railway Dashboard.
2. Buka domain publik `https://<frontend-domain>.up.railway.app`.
3. Login dengan akun utama StudentInsight Anda, lalu uji unggah 1 file PDF → cek Dashboard → hapus PDF → pastikan data kembali bersih.

## Catatan Pusat ML Historis
Semua fitur utama (Unggah PDF, Dashboard, Direktori Mahasiswa, Deteksi Risiko K-Means Dinamis, Pembinaan, Kesejahteraan, Ekspor Excel, dan Jago AI) langsung berjalan penuh di Railway. Khusus tab **Pusat ML Historis** yang bergantung pada file historis lokal, tambahkan Railway Volume di `/app/artifacts` pada service `ml-service` jika ingin menyimpan artefak model terlatih secara permanen.
