from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.database import Base
from app.main import app
from app.db.database import get_db

# 🚫 Don't touch your production DB — use SQLite in-memory
SQLALCHEMY_TEST_DB_URL = "sqlite:///./test.db"  # or use sqlite:///:memory:
engine = create_engine(SQLALCHEMY_TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 🧱 Create fresh schema
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

# ⚙️ Dependency override
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
