#!/bin/sh
set -eu

export ML_SERVICE_URL="${ML_SERVICE_URL:-http://127.0.0.1:8001}"
export API_SECRET_KEY="${API_SECRET_KEY:-${ML_SERVICE_API_KEY:-}}"
export ML_ARTIFACTS_DIR="${ML_ARTIFACTS_DIR:-/app/ml-service/artifacts}"
mkdir -p "${ML_ARTIFACTS_DIR}"

echo "[StudentInsight] Starting internal ML & PDF service on 127.0.0.1:8001..."
(
    cd /app/ml-service
    unset PORT
    exec uvicorn app.main:app --host 127.0.0.1 --port 8001 --workers 1
) &
ML_PID=$!

i=0
while [ "$i" -lt 25 ]; do
    if curl -fsS http://127.0.0.1:8001/health >/dev/null 2>&1; then
        echo "[StudentInsight] Internal ML & PDF service is UP."
        break
    fi
    i=$((i + 1))
    sleep 1
done

cleanup() {
    echo "[StudentInsight] Stopping internal ML & PDF service (PID ${ML_PID})..."
    kill "${ML_PID}" 2>/dev/null || true
}
trap cleanup TERM INT

LISTEN_PORT="${PORT:-8080}"
echo "[StudentInsight] Starting Spring Boot Web + API server on port ${LISTEN_PORT}..."
java \
    -XX:+UseContainerSupport \
    -XX:InitialRAMPercentage=20.0 \
    -XX:MaxRAMPercentage=55.0 \
    -XX:MaxMetaspaceSize=110m \
    -XX:+UseSerialGC \
    -Dserver.port="${LISTEN_PORT}" \
    -jar /app/app.jar &
JAVA_PID=$!

wait "${JAVA_PID}"
EXIT_CODE=$?
cleanup
exit "${EXIT_CODE}"
