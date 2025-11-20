import sys

# Ensure backend package is importable when running from repo root
import os
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

try:
    from app.main import app
    from fastapi.testclient import TestClient
except Exception as e:
    print(f"IMPORT_ERROR: {e}")
    sys.exit(2)


def main() -> int:
    try:
        client = TestClient(app)
    except Exception as e:
        print(f"APP_INIT_ERROR: {e}")
        return 3

    # Health
    try:
        health = client.get("/health")
        print(f"HEALTH {health.status_code}")
    except Exception as e:
        print(f"HEALTH_ERROR: {e}")

    # API info
    try:
        api = client.get("/api/v1")
        print(f"API_INFO {api.status_code}")
    except Exception as e:
        print(f"API_INFO_ERROR: {e}")

    # Admin GET: /api/v1/admin/stats
    try:
        admin_get = client.get("/api/v1/admin/stats")
        print(f"ADMIN_GET_STATS {admin_get.status_code}")
    except Exception as e:
        print(f"ADMIN_GET_ERROR: {e}")

    # Admin POST: /api/v1/admin/alerts/{id}/mark-read
    try:
        admin_post = client.post("/api/v1/admin/alerts/test-alert/mark-read")
        print(f"ADMIN_POST_MARK_READ {admin_post.status_code}")
    except Exception as e:
        print(f"ADMIN_POST_ERROR: {e}")

    return 0


if __name__ == "__main__":
    sys.exit(main())



