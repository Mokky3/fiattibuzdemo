#!/usr/bin/env python3
import sqlite3

def check_receptionist():
    conn = sqlite3.connect('ehr.db')
    try:
        cur = conn.cursor()
        cur.execute('SELECT id, email, role, organization_id FROM users WHERE role = "receptionist" LIMIT 1')
        row = cur.fetchone()
        if row:
            print(f"Receptionist user: ID={row[0]}, Email={row[1]}, Role={row[2]}, Organization={row[3]}")
        else:
            print("No receptionist user found")
    finally:
        conn.close()

if __name__ == "__main__":
    check_receptionist()
