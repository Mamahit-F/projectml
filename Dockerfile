# ====================================================================
# StudentInsight All-in-One Production Dockerfile (Railway Free Plan)
# Bundles React SPA + Spring Boot API + Internal FastAPI ML/PDF Parser
# into a single memory-tuned container connecting to Supabase Postgres.
# ====================================================================

# Stage 1: Build React + TypeScript SPA
FROM node:20-alpine AS frontend-builder
WORKDIR /build/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend ./
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# Stage 2: Build Spring Boot JAR with bundled React SPA static assets
FROM maven:3.9.9-eclipse-temurin-17-alpine AS backend-builder
WORKDIR /build/backend

COPY backend/pom.xml ./
RUN mvn -B -q dependency:go-offline

COPY backend/src ./src
COPY --from=frontend-builder /build/frontend/dist ./src/main/resources/static
RUN mvn -B clean package -DskipTests

# Stage 3: Unified Runtime (Python 3.11 + OpenJDK 17 JRE Headless)
FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openjdk-17-jre-headless curl \
    && rm -rf /var/lib/apt/lists/*

COPY ml-service/requirements.txt /app/ml-service/requirements.txt
RUN pip install --no-cache-dir -r /app/ml-service/requirements.txt

COPY ml-service/app /app/ml-service/app
COPY ml-service/scripts /app/ml-service/scripts
COPY --from=backend-builder /build/backend/target/studentinsight-backend-*.jar /app/app.jar
COPY deploy/start-allinone.sh /app/start.sh

RUN sed -i 's/\r$//' /app/start.sh \
    && chmod +x /app/start.sh \
    && mkdir -p /app/ml-service/artifacts \
    && addgroup --system appgroup \
    && adduser --system --ingroup appgroup appuser \
    && chown -R appuser:appgroup /app

USER appuser
EXPOSE 8080

HEALTHCHECK --interval=20s --timeout=5s --start-period=60s --retries=5 \
    CMD sh -c 'curl -fsS "http://127.0.0.1:${PORT:-8080}/actuator/health" || exit 1'

ENTRYPOINT ["/app/start.sh"]
