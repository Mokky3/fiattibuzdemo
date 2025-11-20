#!/usr/bin/env bash
PGURL="${PGURL:-postgresql://fiattib_owner:change_me_now@localhost:5432/fiattib}"
psql "$PGURL"
