#!/usr/bin/env bash
set -euo pipefail
OUT="${OUT:-/mnt/data/fiattib_dump_$(date +%F).dump}"
PGURL="${PGURL:-postgresql://fiattib_owner:change_me_now@localhost:5432/fiattib}"
pg_dump -Fc "$PGURL" > "$OUT"
echo "Dump written to $OUT"
