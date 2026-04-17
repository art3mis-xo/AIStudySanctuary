# Project Context: Study Sanctuary (AI Study Assistant)

## Tech Stack
- **Backend**: FastAPI (Python)
- **Frontend**: React (Vite)
- **Database**: SQLite (SQLModel) - **Note**: Render filesystem is ephemeral; SQLite database is wiped on redeploy.
- **Vector DB**: ChromaDB (Local) or Pinecone (Cloud)
- **Deployment**: Render (Two services: Frontend and Backend)

## Architecture & Configuration
- **CORS**: Managed in `main.py`. Currently set to `allow_origins=["*"]` for debugging Render connectivity.
- **Request Logging**: A middleware in `main.py` logs the method, path, and `Origin` header of every request.
- **API Base**: Frontend uses `import.meta.env.VITE_API_URL` or defaults to localhost.

## Persistent Reminders
- If Signup works but Login fails (or Signup response is blocked), it is almost always a CORS issue.
- Render frontend and backend are on different domains; ensure the backend accepts the frontend's specific `.onrender.com` URL.
- Use the browser's "Inspect -> Console" and "Inspect -> Network" tabs to verify if the browser is blocking requests.
- Remind the user that SQLite data is lost on Render restarts unless a Persistent Disk is used.
- **Maintenance**: Always maintain and update `constraints.md` in the project root to document technical limitations (like Render's memory limits) and the architectural/code changes made to address them.
