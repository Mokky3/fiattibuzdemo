# FIATTIB Database

## Quick start (dev)
```bash
cd db
docker compose -f docker-compose.db.yml up -d
```

pgAdmin: http://localhost:8081  (login: admin@fiattib.local / admin123)

## Migrations
```bash
make db-revise   # autogenerate new migration from models
make db-migrate  # upgrade to head
```

## Seeds
```bash
make db-seed
```

## Notes
- `db/init/*` runs only on first container start (bootstrap).
- Use Alembic for all schema changes after day 1 (keeps history).
- Keep seeds **idempotent**.
