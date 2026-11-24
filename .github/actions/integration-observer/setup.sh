#!/bin/sh
set -eu

if [ "${RUNNER_ENVIRONMENT:-}" != github-hosted ] || [ "${RUNNER_OS:-}" != Linux ]; then
  echo "Integration tests require a GitHub-hosted Linux runner." >&2
  exit 1
fi

directory="${RUNNER_TEMP:?}/wireguard-integration"
mkdir -m 700 "$directory"
umask 077

for action_directory in "${TMPDIR:-/tmp}"/wireguard-connect-*; do
  if [ -e "$action_directory" ]; then
    echo "An existing action directory prevents isolation." >&2
    exit 1
  fi
done

sudo apt-get update
sudo apt-get install -y wireguard-tools dnsmasq-base

wg genkey > "$directory/client.key"
wg genkey > "$directory/server.key"
wg pubkey < "$directory/client.key" > "$directory/client.pub"
wg pubkey < "$directory/server.key" > "$directory/server.pub"
client_private=$(cat "$directory/client.key")
client_public=$(cat "$directory/client.pub")
server_public=$(cat "$directory/server.pub")
printf '::add-mask::%s\n' "$client_private"
printf 'private-key=%s\npublic-key=%s\n' "$client_private" "$server_public" >> "$GITHUB_OUTPUT"

sudo ip netns add wgc-peer
sudo ip link add wgc-host type veth peer name wgc-remote
sudo ip link set wgc-remote netns wgc-peer
sudo ip addr add 198.18.0.1/30 dev wgc-host
sudo ip link set wgc-host up
sudo ip -n wgc-peer addr add 198.18.0.2/30 dev wgc-remote
sudo ip -n wgc-peer link set wgc-remote up
sudo ip -n wgc-peer link set lo up
sudo ip -n wgc-peer link add wgcpeer type wireguard
sudo ip -n wgc-peer addr add 10.99.0.1/24 dev wgcpeer
sudo ip netns exec wgc-peer wg set wgcpeer private-key "$directory/server.key" \
  listen-port 51820 peer "$client_public" allowed-ips 10.99.0.2/32
sudo ip -n wgc-peer link set wgcpeer up

sudo ip netns exec wgc-peer dnsmasq --no-hosts --no-resolv --bind-interfaces \
  --listen-address=10.99.0.1 --address=/service.internal.test/10.99.0.1 \
  --pid-file="$directory/dnsmasq.pid"
sudo ip netns exec wgc-peer env SERVICE_PID_FILE="$directory/service.pid" \
  node "$GITHUB_WORKSPACE/.github/actions/integration-observer/service.cjs" &

attempt=0
while [ ! -s "$directory/service.pid" ]; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 20 ]; then
    echo "The private test service did not start." >&2
    exit 1
  fi
  sleep 1
done
