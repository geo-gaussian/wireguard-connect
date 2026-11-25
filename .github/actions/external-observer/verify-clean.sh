#!/bin/sh
set -eu

sudo install -d -m 700 /etc/wireguard
configurations=$(sudo find /etc/wireguard -maxdepth 1 -name 'wgc*.conf' -print)
if [ -n "$configurations" ]; then
  echo "An action configuration remains on the runner." >&2
  exit 1
fi

links=$(ip -o link show)
if printf '%s\n' "$links" | grep -Eq '[[:space:]]wgc[0-9a-f]{8}:'; then
  echo "An action interface remains on the runner." >&2
  exit 1
fi
