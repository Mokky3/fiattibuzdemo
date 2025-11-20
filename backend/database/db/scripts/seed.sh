#!/usr/bin/env bash
set -euo pipefail
PGURL="${PGURL:-postgresql://fiattib_owner:change_me_now@localhost:5432/fiattib}"
for f in $(ls -1 db/seeds/*.sql | sort); do
  echo ">> seeding $f"
  psql "$PGURL" -v ON_ERROR_STOP=1 -f "$f"
done
