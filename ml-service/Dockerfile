FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY scripts ./scripts

RUN mkdir -p /app/artifacts \
    && addgroup --system mlgroup \
    && adduser --system --ingroup mlgroup mluser \
    && chown -R mluser:mlgroup /app

USER mluser
EXPOSE 8001

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 \
    CMD curl -fsS http://127.0.0.1:8001/health || exit 1

CMD ["sh", "-c", "if [ ! -f /app/artifacts/registry.json ] && [ -d \"${HISTORICAL_DATA_DIR:-/data/historical}\" ] && [ -n \"$(ls -A \"${HISTORICAL_DATA_DIR:-/data/historical}\" 2>/dev/null)\" ]; then python scripts/run_historical_ml_pipeline.py --select-recommended; fi && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001}"]
