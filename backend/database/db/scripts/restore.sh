#!/usr/bin/env bash
set -euo pipefail
DUMP="${1:-/mnt/data/fiattib_dump_latest.dump}"
PGURL="${PGURL:-postgresql://fiattib_owner:change_me_now@localhost:5432/fiattib}"
pg_restore -c -d "$PGURL" "$DUMP"
