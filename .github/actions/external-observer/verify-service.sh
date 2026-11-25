#!/bin/sh
set -eu

if [ -z "${INTERFACE:-}" ] || [ -z "${PRIVATE_SERVICE_URL:-}" ]; then
  echo "The tunnel interface and private service URL are required." >&2
  exit 1
fi

status=$(curl --fail --silent --show-error --noproxy '*' --proto '=http,https' \
  --interface "$INTERFACE" --connect-timeout 10 --max-time 30 \
  --output /dev/null --write-out '%{http_code}' -- "$PRIVATE_SERVICE_URL")
case "$status" in
  2[0-9][0-9]) echo "The private service responded successfully through the tunnel." ;;
  *) echo "The private service did not return a successful HTTP status." >&2; exit 1 ;;
esac
