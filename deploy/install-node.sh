#!/usr/bin/env bash
set -euo pipefail
# Isolated build runtime from the official Node.js distribution.
version=v24.13.0
case $(uname -m) in
  x86_64) arch=x64 ;;
  aarch64) arch=arm64 ;;
  *) echo 'Unsupported architecture'; exit 1 ;;
esac
archive="node-$version-linux-$arch.tar.xz"
tempdir=$(mktemp -d)
trap 'rm -rf "$tempdir"' EXIT
cd "$tempdir"
curl -fSLO "https://nodejs.org/dist/$version/$archive"
curl -fsSL "https://nodejs.org/dist/$version/SHASUMS256.txt" | grep " $archive\$" > SHA256SUM
sha256sum -c SHA256SUM
sudo install -d -m 755 /opt/ffone-node
sudo tar -xJf "$archive" --strip-components=1 -C /opt/ffone-node
/opt/ffone-node/bin/node --version
