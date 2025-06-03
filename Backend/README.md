# AKFA MEDLINE Backend

A FastAPI backend for the AKFA MEDLINE patient portal.

## Setup

1. Create a virtual environment (recommended):
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   The project uses a `.env` file for configuration. You can modify the existing one or create your own:
   ```
   SECRET_KEY=your_super_secret_key_change_this_in_production
   DEBUG=True
   ```

## Running the Application

Run the application with:
```
python run.py
```

This will start the server at http://localhost:8000

## API Documentation

FastAPI automatically generates API documentation:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Endpoints

- `GET /`: Check if API is running
- `POST /token`: Login and get access token
- `GET /users/me`: Get current user details
- `POST /register`: Register new user 