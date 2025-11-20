import os
import sqlite3


def main() -> None:
    db_path = os.path.join(os.path.dirname(__file__), "ehr.db")
    if not os.path.exists(db_path):
        print("DB_NOT_FOUND", db_path)
        return

    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cur.fetchall()]
        print("TABLES", ",".join(tables))

        # Inspect users
        if "users" in tables:
            # Print columns
            cur.execute("PRAGMA table_info(users)")
            print("USERS_COLS", [c[1] for c in cur.fetchall()])
            cur.execute("SELECT id, email, role FROM users LIMIT 10")
            rows = cur.fetchall()
            for r in rows:
                print("USER", r[0], r[1], r[2])

        # Inspect doctors
        if "doctors" in tables:
            cur.execute("PRAGMA table_info(doctors)")
            print("DOCTORS_COLS", [c[1] for c in cur.fetchall()])
            cur.execute("SELECT id, user_id FROM doctors LIMIT 10")
            rows = cur.fetchall()
            for r in rows:
                print("DOCTOR", r[0], r[1])
    finally:
        conn.close()


if __name__ == "__main__":
    main()


