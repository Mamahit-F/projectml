#!/bin/sh
set -eu

LISTEN_PORT="${PORT:-80}"
UPSTREAM="${BACKEND_UPSTREAM:-}"

IPV6_LISTEN=""
if [ -f /proc/net/if_inet6 ]; then
    IPV6_LISTEN="    listen [::]:${LISTEN_PORT};"
fi

RESOLVER_LINE=""
RAW_NS="$(awk '/^nameserver[ \t]+/{print $2; exit}' /etc/resolv.conf 2>/dev/null || true)"
if [ -n "${RAW_NS}" ]; then
    case "${RAW_NS}" in
        *:*) RESOLVER_LINE="    resolver [${RAW_NS}] valid=30s;" ;;
        *)   RESOLVER_LINE="    resolver ${RAW_NS} valid=30s;" ;;
    esac
fi

cat > /etc/nginx/conf.d/default.conf <<EOF
server {
    listen ${LISTEN_PORT};
${IPV6_LISTEN}
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    client_max_body_size 30M;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1024;
EOF

if [ -n "${UPSTREAM}" ]; then
    UPSTREAM_CLEAN="${UPSTREAM%/}"
    cat >> /etc/nginx/conf.d/default.conf <<EOF
${RESOLVER_LINE}

    location /api/ {
        set \$backend_upstream "${UPSTREAM_CLEAN}";
        proxy_pass \$backend_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 180s;
        proxy_send_timeout 180s;
    }
EOF
fi

cat >> /etc/nginx/conf.d/default.conf <<EOF

    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

exec nginx -g "daemon off;"
