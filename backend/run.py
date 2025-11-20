import uvicorn
import os
from dotenv import load_dotenv

if __name__ == "__main__":
    # Load environment variables from .env file
    load_dotenv()
    
    # Ensure DATABASE_URL is set for PostgreSQL
    if not os.getenv("DATABASE_URL"):
        os.environ["DATABASE_URL"] = "postgresql+psycopg://fiattib_app_rw:change_me_app_rw@localhost:5432/fiattib"
    
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) 