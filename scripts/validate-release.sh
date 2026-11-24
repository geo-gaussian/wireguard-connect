#!/bin/sh
set -eu

if [ "${GITHUB_REF:-}" != refs/heads/main ]; then
  echo "Release tags must be prepared from main." >&2
  exit 1
fi

case "${RELEASE_TAG:-}" in
  *[!v0-9.]*)
    echo "Release tag must be a version such as v0.1.0." >&2
    exit 1 ;;
esac
if ! printf '%s\n' "${RELEASE_TAG:-}" | grep -Eq '^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'; then
  echo "Release tag must be a version such as v0.1.0." >&2
  exit 1
fi
