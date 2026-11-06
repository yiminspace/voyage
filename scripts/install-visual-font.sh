#!/bin/sh
set -eu

# Match the Ubuntu 26.04 runner's monospace fallback for the existing snapshots.
font_package=fonts-dejavu-mono_2.37-8build1_all.deb
font_sha256=bf5ad873961972ea8f1299ef99c1854715e68d9aa798830fb78c5b222ddeb4b9
font_dir=$(mktemp -d)
trap 'rm -rf "$font_dir"' EXIT

curl -fsSL --retry 2 --max-time 20 \
  "https://archive.ubuntu.com/ubuntu/pool/main/f/fonts-dejavu/$font_package" \
  -o "$font_dir/$font_package"
printf '%s  %s\n' "$font_sha256" "$font_dir/$font_package" | sha256sum -c -
dpkg -i "$font_dir/$font_package"
