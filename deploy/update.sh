#!/usr/bin/env bash
set -euo pipefail
export PATH="/opt/ffone-node/bin:$PATH"
export ASTRO_TELEMETRY_DISABLED=1
cd /opt/FFOneWeb
exec 9>/opt/FFOneWeb/.deploy.lock
flock -n 9 || { echo 'Another deployment is running.'; exit 1; }
git pull --ff-only origin main
npm ci
npm run check
npm run build
revision=$(git rev-parse --short HEAD)
release="/var/www/ffone/releases/$(date -u +%Y%m%dT%H%M%SZ)-$revision"
mkdir -p "$release"
cp -a dist/. "$release/"
chmod -R a+rX "$release"
ln -s "$release" /var/www/ffone/current.next
mv -Tf /var/www/ffone/current.next /var/www/ffone/current
if systemctl is-enabled --quiet ffone-map.service; then
    sudo systemctl restart ffone-map.service
fi
echo "Published $revision to $release"
