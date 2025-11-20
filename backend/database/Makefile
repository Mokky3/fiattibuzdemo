DB_URL?=postgresql+psycopg://fiattib_app_rw:change_me_app_rw@localhost:5432/fiattib
PG_URL?=postgresql://fiattib_owner:NoGletcherGang52@localhost:5432/fiattib

db-up:
	cd db && docker compose -f docker-compose.db.yml up -d

db-down:
	cd db && docker compose -f docker-compose.db.yml down

db-revise:
	DATABASE_URL=$(DB_URL) bash db/scripts/revise.sh "auto"

db-migrate:
	DATABASE_URL=$(DB_URL) bash db/scripts/migrate.sh

db-seed:
	PGURL=$(PG_URL) bash db/scripts/seed.sh
