# Stage 1: Build static React + TypeScript bundle
FROM node:20-alpine AS builder
WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# Stage 2: Serve SPA & optional /api reverse-proxy via Nginx (Railway & Docker compatible)
FROM nginx:1.27-alpine

ENV PORT=80
ENV BACKEND_UPSTREAM=""

RUN rm -f /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /studentinsight-entrypoint.sh
RUN sed -i 's/\r$//' /studentinsight-entrypoint.sh && chmod +x /studentinsight-entrypoint.sh
COPY --from=builder /build/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD sh -c 'wget -qO- "http://127.0.0.1:${PORT:-80}/" > /dev/null || exit 1'

ENTRYPOINT ["/studentinsight-entrypoint.sh"]
