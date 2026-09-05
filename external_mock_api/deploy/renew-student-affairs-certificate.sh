#!/bin/sh
set -eu

# 证书剩余不足 30 天时才续期，避免无意义地触发 CA 限额。
certificate=/etc/nginx/ssl/demo-api.serendipituwpt.art/fullchain.crt
if [ ! -r "$certificate" ] || ! openssl x509 -checkend 2592000 -noout -in "$certificate" >/dev/null; then
  ACME_DOMAIN=demo-api.serendipituwpt.art \
  ACME_CHALLENGE_ROOT=/var/lib/acme/student-affairs-api \
  ACME_CERTIFICATE_PATH="$certificate" \
  ACME_PRIVATE_KEY_PATH=/etc/nginx/ssl/demo-api.serendipituwpt.art/private.key \
  ACME_ACCOUNT_KEY_PATH=/etc/student-affairs-api/acme-account.pem \
  /usr/bin/node /opt/student-affairs-demo-api/deploy/acme-http01.mjs
  nginx -t
  systemctl reload nginx
fi
