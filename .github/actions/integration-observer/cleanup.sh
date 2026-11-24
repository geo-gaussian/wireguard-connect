#!/bin/sh
set -u

directory="${RUNNER_TEMP:?}/wireguard-integration"
failed=0

for action_directory in "${TMPDIR:-/tmp}"/wireguard-connect-*; do
  if [ -e "$action_directory" ]; then
    echo "The action did not remove its configuration directory." >&2
    failed=1
  fi
done
links=$(ip -o link show) || failed=1
if printf '%s\n' "$links" | grep -E '[[:space:]]wgc[0-9a-f]{8}:'; then
  echo "The action did not remove its interface." >&2
  failed=1
fi
domains=$(resolvectl domain) || failed=1
if printf '%s\n' "$domains" | grep -F '~internal.test'; then
  echo "The action did not revert its DNS domain." >&2
  failed=1
fi

for pid_file in "$directory/service.pid" "$directory/dnsmasq.pid"; do
  if [ -f "$pid_file" ]; then
    pid=$(cat "$pid_file")
    case "$pid" in
      '' | *[!0-9]*) echo "Invalid test service PID." >&2; failed=1 ;;
      *) sudo kill "$pid" || failed=1 ;;
    esac
  fi
done
namespaces=$(sudo ip netns list) || failed=1
if printf '%s\n' "$namespaces" | grep -q '^wgc-peer\( \|$\)'; then
  sudo ip netns delete wgc-peer || failed=1
fi
if ip link show dev wgc-host >/dev/null 2>&1; then
  sudo ip link delete wgc-host || failed=1
fi
if [ -f "$directory/peer-directory" ]; then
  peer_directory=$(cat "$directory/peer-directory")
  suffix=${peer_directory#/tmp/wgc-peer.}
  case "$peer_directory:$suffix" in
    /tmp/wgc-peer.????????:*[!a-zA-Z0-9]* | /tmp/wgc-peer.????????:) 
      echo "Invalid peer directory." >&2
      failed=1 ;;
    /tmp/wgc-peer.????????:*)
      sudo rm -f "$peer_directory/server.key" || failed=1
      sudo rmdir "$peer_directory" || failed=1 ;;
    *)
      echo "Invalid peer directory." >&2
      failed=1 ;;
  esac
fi
if [ -d "$directory" ]; then
  rm -f "$directory/client.key" "$directory/server.key" "$directory/client.pub" \
    "$directory/server.pub" "$directory/service.pid" "$directory/dnsmasq.pid" \
    "$directory/peer-directory" || failed=1
  rmdir "$directory" || failed=1
fi
exit "$failed"
