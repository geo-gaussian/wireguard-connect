#!/bin/sh
set -eu

sh scripts/validate-release.sh

git diff --quiet
git diff --cached --quiet
git fetch origin main
if [ "$(git rev-parse HEAD)" != "$(git rev-parse FETCH_HEAD)" ]; then
  echo "Main changed during release preparation; start a new run." >&2
  exit 1
fi
existing_tag=$(git ls-remote --tags origin "refs/tags/$RELEASE_TAG")
if [ -n "$existing_tag" ]; then
  echo "The release tag already exists." >&2
  exit 1
fi

git add --force dist/main/index.js dist/post/index.js
git -c user.name='github-actions[bot]' \
  -c user.email='41898282+github-actions[bot]@users.noreply.github.com' \
  commit -m "Prepare $RELEASE_TAG" \
  -m 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>'
git tag "$RELEASE_TAG"
git push origin "refs/tags/$RELEASE_TAG"
