#!/usr/bin/env bash
set -euo pipefail
export DATABASE_URL="${DATABASE_URL:-postgresql+psycopg://fiattib_app_rw:change_me_app_rw@localhost:5432/fiattib}"
alembic -c alembic.ini upgrade head
