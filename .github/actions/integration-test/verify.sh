#!/bin/sh
set -eu

case "$SCENARIO:$TUNNEL_OUTCOME" in
  success:success | failure:failure) ;;
  *) echo "Unexpected integration scenario outcome." >&2; exit 1 ;;
esac

count=0
for config in "${TMPDIR:-/tmp}"/wireguard-connect-*/wgc*.conf; do
  if [ -f "$config" ]; then
    count=$((count + 1))
    interface=$(basename "$config" .conf)
    if [ "$(stat -c %a "$config")" != 600 ]; then
      echo "The action configuration does not have mode 0600." >&2
      exit 1
    fi
  fi
done
if [ "$count" -ne 1 ]; then
  echo "Expected exactly one action configuration." >&2
  exit 1
fi

ip link show dev "$interface"
resolvectl dns "$interface" | grep -F '10.99.0.1'
resolvectl domain "$interface" | grep -F '~internal.test'
resolvectl query service.internal.test | grep -F '10.99.0.1'
response=$(curl --fail --silent --show-error --noproxy '*' http://service.internal.test:8080/health)
if [ "$response" != wireguard-ok ]; then
  echo "The private service returned an unexpected response." >&2
  exit 1
fi
