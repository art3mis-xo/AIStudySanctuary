import os
import json
import asyncio
from typing import List
from fastapi import FastAPI, Depends, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from models import ChatRequest, ChatResponse
from handlers import orchestrate
from database import create_db_and_tables, get_session, UserProfile, ChatMessage, User
from rag_engine import rag_engine
from auth import get_password_hash, verify_password, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta

app = FastAPI()

# Enable CORS for React Frontend (Vite port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temporary storage for uploaded files
UPLOAD_DIR = "./temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# ===== AUTH Endpoints =====

@app.post("/signup")
def signup(username: str = Form(...), email: str = Form(...), password: str = Form(...), db: Session = Depends(get_session)):
    # Check if user exists
    existing_user = db.exec(select(User).where((User.username == username) | (User.email == email))).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    hashed_pwd = get_password_hash(password)
    new_user = User(username=username, email=email, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully", "user_id": new_user.id}

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_session)):
    user = db.exec(select(User).where(User.username == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"username": current_user.username, "email": current_user.email}

# ===== API Endpoints (Protected) =====

@app.get("/profile/{session_id}")
def get_user_profile(session_id: str, db: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """Fetches the current persona/profile for a session."""
    statement = select(UserProfile).where(UserProfile.session_id == session_id, UserProfile.user_id == current_user.id)
    profile = db.exec(statement).first()
    
    # We want to return a format that the React frontend expects
    if not profile:
        return {
            "name": current_user.username,
            "initials": current_user.username[0].upper(),
            "levels": {"beginner": 0, "intermediate": 0, "advanced": 0},
            "style": "Standard",
            "struggles": [],
            "stats": {"sessions": 1, "streak": 1, "mastered": 0, "rating": "0"},
            "lastUpdated": "just now"
        }
    
    # Map backend string "Beginner" to the levels object the frontend needs
    levels = {"beginner": 0, "intermediate": 0, "advanced": 0}
    lvl = profile.knowledge_level.lower()
    if lvl == "beginner": levels["beginner"] = 80
    elif lvl == "intermediate": levels["intermediate"] = 80
    elif lvl == "advanced": levels["advanced"] = 80
    
    struggles = [s.strip() for s in profile.pain_points.split(",") if s.strip() and s.strip() != "None"]
    
    # Mock some stats for now as they aren't fully in the DB yet
    return {
        "name": current_user.username,
        "initials": current_user.username[0].upper(),
        "levels": levels,
        "style": profile.learning_style,
        "struggles": struggles,
        "stats": {"sessions": 5, "streak": 3, "mastered": 2, "rating": "8.5"},
        "lastUpdated": profile.last_updated.strftime("%Y-%m-%d %H:%M:%S")
    }

@app.get("/sessions")
def list_sessions(db: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """Returns a list of session objects for the current user."""
    # Get unique session IDs for THIS user
    statement = select(ChatMessage.session_id).where(ChatMessage.user_id == current_user.id).distinct()
    session_ids = db.exec(statement).all()
    
    results = []
    for sid in session_ids:
        # Get the first human message to create a title
        title_stmt = select(ChatMessage.content).where(
            ChatMessage.session_id == sid,
            ChatMessage.role == "human",
            ChatMessage.user_id == current_user.id
        ).order_by(ChatMessage.timestamp).limit(1)
        first_msg = db.exec(title_stmt).first()
        
        # Create a 4-5 word summary or fallback to ID
        title = " ".join(first_msg.split()[:5]) + "..." if first_msg else sid
        results.append({"id": sid, "name": title})
    
    return {"sessions": results}

@app.get("/session/{session_id}/history")
def get_session_history(session_id: str, db: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """Fetches full chat history for a session for the current user."""
    statement = select(ChatMessage).where(ChatMessage.session_id == session_id, ChatMessage.user_id == current_user.id).order_by(ChatMessage.timestamp)
    history = db.exec(statement).all()
    
    # Format for frontend
    formatted = []
    for m in history:
        # Determine role and type for the frontend
        role = "user" if m.role == "human" else "ai"
        formatted.append({
            "id": f"h_{m.id}",
            "role": role,
            "content": m.content,
            "type": m.role if role == "ai" else "text",
            "sources": json.loads(m.sources_json) if m.sources_json else []
        })
    return formatted

@app.delete("/session/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """Completely deletes a session for the current user."""
    # 1. Delete SQL History
    msgs_stmt = select(ChatMessage).where(ChatMessage.session_id == session_id, ChatMessage.user_id == current_user.id)
    msgs = db.exec(msgs_stmt).all()
    for m in msgs:
        db.delete(m)

    # 2. Delete Persona
    profile_stmt = select(UserProfile).where(UserProfile.session_id == session_id, UserProfile.user_id == current_user.id)
    profile = db.exec(profile_stmt).first()
    if profile:
        db.delete(profile)

    db.commit()

    # 3. Delete RAG data
    rag_engine.delete_session(session_id, user_id=current_user.id)

    return {"message": f"Session '{session_id}' deleted successfully."}

@app.post("/upload")
async def upload_files(session_id: str = Form(...), files: List[UploadFile] = File(...), is_past_paper: bool = Form(False), current_user: User = Depends(get_current_user)):
    """Uploads multiple files and indexes them with user isolation."""
    uploaded_filenames = []
    for file in files:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())
        
        # Process and index the file in RAG engine with user_id metadata
        rag_engine.process_file(file_path, session_id, user_id=current_user.id, is_past_paper=is_past_paper)
        uploaded_filenames.append(file.filename)
    
    return {"message": f"Files {uploaded_filenames} successfully uploaded and indexed for session '{session_id}'."}

@app.get("/debug/rag/{session_id}")
def debug_rag(session_id: str):
    """Debug endpoint to check indexed documents for a session."""
    try:
        # Check if collection exists
        results = rag_engine.collection.get(where={"session_id": session_id})
        return {
            "count": len(results["ids"]),
            "metadatas": results["metadatas"],
            "documents": [d[:100] + "..." for d in results["documents"]]
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """Handles standard (non-streaming) chat requests."""
    orchestrate_result = orchestrate(
        request.session_id,
        request.mode,
        request.message,
        db,
        current_user.id,
        request.user_answer
    )
    
    return ChatResponse(
        response=orchestrate_result["response"],
        type=orchestrate_result["type"],
        score=orchestrate_result.get("score"),
        feedback=orchestrate_result.get("feedback"),
        sources=orchestrate_result.get("sources")
    )

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest, db: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """Streams the AI response with user context."""
    
    async def event_generator():
        # Pass user_id to orchestrate
        try:
            result = await asyncio.to_thread(orchestrate, request.session_id, request.mode, request.message, db, current_user.id, request.user_answer)
        except Exception as e:
            print(f"ERROR in chat_stream orchestrate: {e}")
            yield f"data:ERROR: {str(e)}\n\n"
            return
        
        # Prepare metadata and format sources for the frontend
        raw_sources = result.get("sources") or []
        formatted_sources = []
        for s in raw_sources:
            if isinstance(s, dict):
                label = s.get("label", "Source")
                snippet = s.get("snippet", "Information retrieved from indexed study materials.")
                formatted_sources.append({"label": label, "snippet": snippet})
            else:
                formatted_sources.append({"label": str(s), "snippet": "Information retrieved from indexed study materials."})

        if not formatted_sources:
            formatted_sources = [{"label": "General Knowledge", "snippet": "Answer generated from AI training data."}]

        # Simulate chunks for the UI effect
        import re
        response_text = result["response"]
        
        # Split into tokens but preserve spaces
        tokens = re.findall(r'\S+|\s+', response_text)
        
        for token in tokens:
          if token:
              # Escape newlines to prevent them from breaking SSE formatting
              yield f"data:{token.replace('\n', '<BR>')}\n\n"
              await asyncio.sleep(0.01)
        
        # Finally send the metadata (sources, score, etc.)
        metadata = {
            "type": result["type"],
            "score": result.get("score"),
            "feedback": result.get("feedback"),
            "sources": formatted_sources
        }
        yield f"data:[METADATA]{json.dumps(metadata)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
