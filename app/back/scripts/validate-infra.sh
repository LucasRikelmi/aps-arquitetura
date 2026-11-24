#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONF="$ROOT/deploy/nginx/benigno.conf"
UNIT="$ROOT/deploy/systemd/benigno-api.service"
grep -q 'listen 443 ssl' "$CONF"
grep -q 'http2 on;' "$CONF"
grep -q 'ssl_protocols TLSv1.3;' "$CONF"
grep -q 'client_max_body_size 1k;' "$CONF"
grep -q 'proxy_pass http://127.0.0.1:3000;' "$CONF"
grep -q 'ExecStart=/usr/bin/node' "$UNIT"
grep -q 'User=benigno' "$UNIT"
if command -v systemd-analyze >/dev/null 2>&1; then
  systemd-analyze verify "$UNIT" || true # depende de caminhos do host real
fi
printf 'Inspeções estáticas OK. Teste nginx -t no host com certificado e snippets instalados.\n'
