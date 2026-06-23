#!/usr/bin/env bash
# Copy the latest pipeline output next to the dashboard and serve it.
set -euo pipefail
cd "$(dirname "$0")"
PORT="${1:-8800}"
rm -rf dashboard/output
cp -R output dashboard/output
echo "RISA GEO dashboard -> http://localhost:${PORT}"
echo "(needs internet: React/Recharts/Tailwind load from CDN)"
cd dashboard
python3 -m http.server "${PORT}"
