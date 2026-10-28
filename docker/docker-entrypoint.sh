#!/bin/sh
set -e

PORT="${PORT:-9290}"

sed "s/\${PORT}/${PORT}/g" /etc/nginx/templates/nginx.conf.template > /etc/nginx/http.d/default.conf

(cd /app/backend && PORT=3000 npm run start) &
BACKEND_PID=$!

nginx -g 'daemon off;' &
NGINX_PID=$!

terminate() {
  kill -TERM "$BACKEND_PID" 2>/dev/null
  kill -TERM "$NGINX_PID" 2>/dev/null
}
trap terminate TERM INT

wait
