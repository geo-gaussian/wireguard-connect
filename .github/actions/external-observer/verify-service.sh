#!/bin/sh
set -eu

if [ -z "${INTERFACE:-}" ] || [ -z "${PRIVATE_SERVICE_URL:-}" ]; then
  echo "The tunnel interface and private service URL are required." >&2
  exit 1
fi

token=$(od -An -N16 -tx1 /dev/urandom | tr -d '[:space:]')
case "$token" in
  *[!0-9a-f]* | '') echo "Could not generate a log command token." >&2; exit 1 ;;
esac
if [ "${#token}" -ne 32 ]; then
  echo "Could not generate a log command token." >&2
  exit 1
fi

echo "Response body:"
printf '::stop-commands::%s\n' "$token"
# Keep untrusted response output between the command-disable markers on stdout.
exec 3>&1
curl_exit=0
# Send the body to the original stdout and capture the status and diagnostics.
status=$(curl --silent --show-error --noproxy '*' --proto '=http,https' \
  --interface "$INTERFACE" --connect-timeout 10 --max-time 30 \
  --output - --write-out '%{stderr}%{http_code}' -- "$PRIVATE_SERVICE_URL" 2>&1 1>&3) || curl_exit=$?
if [ "$curl_exit" -ne 0 ]; then
  printf '\n%s\n' "$status"
fi
printf '\n::%s::\n' "$token"
exec 3>&-
if [ "$curl_exit" -ne 0 ]; then
  echo "The private service request failed." >&2
  exit 1
fi
printf 'HTTP status: %s\n' "$status"
case "$status" in
  [23][0-9][0-9]) echo "The private service responded successfully through the tunnel." ;;
  *) echo "The private service did not return a successful HTTP status." >&2; exit 1 ;;
esac
