#!/bin/sh
set -eu

git ls-files --error-unmatch dist/main/index.js dist/post/index.js
git diff --exit-code -- dist
