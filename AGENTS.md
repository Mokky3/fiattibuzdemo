# Repository Guidelines

This document provides contributors with practical instructions for working in this repository. Follow the conventions below to ensure consistent, maintainable code and smooth collaboration.

## Project Structure & Module Organization
- Root folders split the stack:  
  - `backend/` — FastAPI API  
  - `frontend/` — React + Vite client  
  - `public/` — shared static assets served by Firebase  
  - Workflows are in `.github/workflows/`
- Backend (`backend/app/`):  
  - `main.py` wires routes  
  - `common/` for helpers, `crud/` for DB access, `services/` for business logic, `portals/` for portal-specific flows  
  - Tests live in `app/tests/`
- `backend/scripts/` stores operational scripts (seeders, utilities). Ignore runtime files like `ehr.db` and uploads.
- Frontend (`frontend/src/`):  
  - Components in `components/`  
  - API hooks in `services/`  
  - Localization in `i18n.js`  
  - Styling via Tailwind (`App.css`, `tailwind.config.js`)

## Build, Test, and Development Commands
- Backend:  
  - `python -m venv backend\venv` && `backend\venv\Scripts\activate` → create/activate virtualenv  
  - `pip install -r backend/requirements.txt` → install deps  
  - `python backend/run.py` → start FastAPI server (port 8000, hot reload)  
  - `pytest backend/app/tests` → run tests; add `-k name` to filter
- Frontend:  
  - `npm install --prefix frontend` → install deps  
  - `npm run dev --prefix frontend` → run dev server (http://localhost:5173)  
  - `npm run build --prefix frontend` → build production assets  
  - `npm run lint --prefix frontend` → enforce ESLint rules

## Coding Style & Naming Conventions
- **Python**: PEP 8, 4-space indentation. Use `snake_case` for functions, PascalCase for Pydantic models/services. Always type-hint. Reuse from `app/common`.  
- **React**: Default-export functional components in PascalCase. Align filenames with component names (`PatientNavbar.jsx`). Use Tailwind utilities; avoid inline styles unless dynamic.

## Testing Guidelines
- Backend: Pytest. Place tests in `backend/app/tests/test_<area>.py`, functions as `test_<condition>`. Use FastAPI’s `TestClient` + fixtures (avoid production `ehr.db`).  
- Frontend: Automated tests not yet in place. For future, use Vitest + Testing Library in `src/__tests__/`.

## Commit & Pull Request Guidelines
- Commits: Imperative present. Prefer Conventional Commits when helpful (`feat:`, `fix:`, `refactor:`). Example: `refactor: add reusable patient navbar`.  
- Pull Requests: Keep focused. Include a short description, link Jira/GitHub issues, and attach screenshots (UI) or API samples (backend).  
- Run `pytest` and `npm run lint && npm run build` before opening a PR. CI (GitHub Actions) runs builds and deploys previews.

## Environment & Deployment Notes
- Use sample `.env` files in `backend/.env` and `frontend/.env`. Never commit secrets.  
- Firebase config lives in `firebase.json` and `.firebaserc`.  
- SQLite (`backend/ehr.db`) and logs are for local dev only—clear before pushing branches.

## Agent-Specific Instructions: Frontend–Backend Router Sync
The repository includes an AI agent that helps keep backend routes aligned with frontend components, especially in radiology modules.

1. **Analyze Frontend Files**  
   - Inspect `frontend/src/components/radiology/` for `.jsx` or `.tsx` UI files.  
   - Detect API usage (e.g., hooks in `src/services/`) and derive required backend endpoints.

2. **Generate Backend Routers**  
   - For each UI file, create a matching router in:  
     ```
     backend/app/portals/radiology/router/<entity>.py
     ```
   - Routers must define FastAPI endpoints (`GET`, `POST`, etc.), import from `services/` and `crud/`, and use Pydantic schemas from `app/common/schemas/`.

   **Example (`radiology_reports.py`):**
   ```python
   from fastapi import APIRouter
   from app.services import radiology_service
   from app.common.schemas.radiology import RadiologyReport, RadiologyReportCreate

   router = APIRouter(prefix="/radiology", tags=["radiology"])

   @router.get("/", response_model=list[RadiologyReport])
   def list_reports():
       return radiology_service.get_all_reports()

   @router.post("/", response_model=RadiologyReport)
   def create_report(report: RadiologyReportCreate):
       return radiology_service.create_report(report)
