# Project Status

## Current State (May 23, 2026)

- **Project root:** `c:\Users\Nikhil\plotiq`
- **Frontend:** The real application is in `frontend/`.
  - `frontend/src/App.js` is the main app file.
  - The app is a pure client-side React application using `react-scripts`.
  - Only network access in the frontend is for a local static asset: `fetch('/wards.geojson')`.
  - `frontend/package.json` includes dependencies: `react`, `react-dom`, `react-scripts`, `axios`, and `lucide-react`.
- **Backend:** `backend/` exists but is an unused stub.
  - `backend/src/app.py` is a FastAPI/OpenAI/pdfplumber scaffold.
  - The `backend` service is not required for the frontend app to run.
  - `backend/requirements.txt` lists `fastapi`, `uvicorn`, `pdfplumber`, `openai`, and `pydantic`.
- **Run status:** The frontend is ready to run locally with `cd frontend && npm start`.
- **Recent change:** A landing page has been added in `frontend/src/App.js` to lead users into the report generator tool.
- **Notes:** `HANDOFF.md` explicitly states the backend is unused and the frontend is the main app.

## What is working

- React app is present and runnable.
- Static ward geojson lookup is available locally.
- No production backend/API integration is currently wired into the UI.

## Recommended next steps

1. Keep the focus on `frontend/src/App.js` for feature work.
2. Ignore the `backend/` folder unless backend services are intentionally added.
3. If you want to add APIs later, plan a clean separation and only add backend calls where needed.

## Summary

This project is effectively a frontend-only React MVP with a non-functional backend stub. The current work should proceed inside `frontend/` unless you want to deliberately add backend functionality.
