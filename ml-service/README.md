# StudentInsight Python ML Service (v3.0)

Layanan FastAPI + Scikit-learn untuk ekstraksi laporan historis PDF/XLSX, resolusi identitas, pelacakan kontinuitas mahasiswa, clustering profil akumulasi poin, prediksi supervised kronologis, dan manajemen model terversi.

## Menjalankan Layanan

```powershell
cd ml-service
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

## Menjalankan Pipeline ML Historis via CLI

```powershell
cd ml-service
.\.venv\Scripts\python.exe scripts\run_historical_ml_pipeline.py --select-recommended
```

## Menjalankan Pengujian Otomatis

```powershell
cd ml-service
.\.venv\Scripts\python.exe -m pytest -v
```

Lihat dokumentasi lengkap di [docs/machine-learning/historical_ml_subsystem.md](../docs/machine-learning/historical_ml_subsystem.md).
