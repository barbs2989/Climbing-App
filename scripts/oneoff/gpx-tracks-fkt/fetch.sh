#!/bin/bash
# For each slug in $1 (one per line): fetch the FKT route page, take its GPS Track link, download the GPX.
# 1 request/s to FKT. Writes gpx/<slug>.gpx and pages/<slug>.title. Skips slugs already fetched.
cd "$(dirname "$0")"; mkdir -p gpx pages
while read -r slug; do
  [ -z "$slug" ] && continue
  [ -s "gpx/$slug.gpx" ] && continue
  page=$(curl -sL -m 60 "https://fastestknowntime.com/route/$slug")
  url=$(printf '%s' "$page" | grep -o 'https://fastestknowntime.com/system/files/routes/gps_data/[^"]*\.gpx' | head -1)
  title=$(printf '%s' "$page" | grep -o '<title>[^<]*' | head -1 | sed 's/<title>//')
  printf '%s\t%s\t%s\n' "$slug" "$title" "$url" >> pages/index.tsv
  if [ -n "$url" ]; then
    curl -sL -m 120 -o "gpx/$slug.gpx" "$url" || rm -f "gpx/$slug.gpx"
  fi
  sleep 1
done < "$1"
echo fetched
