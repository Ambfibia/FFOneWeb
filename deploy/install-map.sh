#!/usr/bin/env bash
set -euo pipefail
sudo install -m 644 /opt/FFOneWeb/deploy/ffone-map.service /etc/systemd/system/ffone-map.service
sudo systemctl daemon-reload
sudo systemctl enable --now ffone-map.service
config=/etc/nginx/sites-available/slavicfall.ru
sudo cp "$config" "$config.before-map"
sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-available/slavicfall.ru')
text = p.read_text()
if 'location /map-api/' not in text:
    text = text.replace('    location / {', '''    location /map-api/ {
        proxy_pass http://127.0.0.1:8890/;
        proxy_read_timeout 10s;
    }

    location / {''', 1)
    p.write_text(text)
PY
if sudo nginx -t; then
    sudo systemctl reload nginx
else
    sudo cp "$config.before-map" "$config"
    exit 1
fi
curl --fail --silent http://127.0.0.1:8890/players
