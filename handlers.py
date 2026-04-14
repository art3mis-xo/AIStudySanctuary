from typing import List, Optional, Dict
from sqlmodel import Session, select
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from llm_config import llm
from database import ChatMessage
from rag_engine import rag_engine
from agents import study_app # Import the LangGraph agent
import json

def manage_context(session_id: str, db: Session, user_id: int, threshold: int = 10, archive_batch: int = 5):
    """Automatically archives old messages to RAG if history gets too long."""
    statement = select(ChatMessage).where(
        ChatMessage.session_id == session_id,
        ChatMessage.user_id == user_id,
        ChatMessage.archived == False
    ).order_by(ChatMessage.timestamp)
    
    messages = db.exec(statement).all()
    
    if len(messages) > threshold:
        to_archive = messages[:archive_batch]
        archive_data = [{"role": m.role, "content": m.content} for m in to_archive]
        rag_engine.archive_chat_messages(session_id, user_id, archive_data)
        
        for msg in to_archive:
            msg.archived = True
            db.add(msg)
        db.commit()

def orchestrate(session_id: str, mode: str, message: str, db: Session, user_id: int, user_answer: Optional[str] = None) -> dict:
    """Invokes the LangGraph Agentic Flow to handle the request."""

    # 1. Archive old history if needed
    manage_context(session_id, db, user_id)

    # 2. Retrieve ACTIVE History (unarchived) for this user
    statement = select(ChatMessage).where(
        ChatMessage.session_id == session_id,
        ChatMessage.user_id == user_id,
        ChatMessage.archived == False
    ).order_by(ChatMessage.timestamp)
    db_messages = db.exec(statement).all()

    langchain_history: List[BaseMessage] = []
    for db_msg in db_messages:
        if db_msg.role == "human":
            langchain_history.append(HumanMessage(content=db_msg.content))
        elif db_msg.role == "ai":
            langchain_history.append(AIMessage(content=db_msg.content))
        elif "quiz_question" in db_msg.role:
            langchain_history.append(AIMessage(content=f"Quiz Question: {db_msg.content}"))

    # 3. RAG Context Retrieval (Always enabled, isolated by user)
    context_str = ""
    sources = []
    print(f"DEBUG: Starting RAG Query for message: {message[:50]}...")
    rag_results = rag_engine.query(session_id, message, user_id=user_id)
    
    if rag_results:
        print(f"DEBUG: Found {len(rag_results)} RAG results.")
        context_str = "\n".join([f"--- Context from {r['source']} ---\n{r['content']}" for r in rag_results])
        sources = list(set([r["source"] for r in rag_results]))
    else:
        print("DEBUG: No RAG results found. Using general knowledge.")
        sources = ["General Knowledge"]

    # 4. Prepare Initial State for LangGraph
    initial_state = {
        "session_id": session_id,
        "user_id": user_id,
        "mode": mode,
        "message": message,
        "user_answer": user_answer,
        "history": langchain_history,
        "profile": {}, # Will be filled by Profiler Node
        "context": context_str,
        "sources": sources,
        "response": "",
        "score": None,
        "feedback": None,
        "type": ""
    }

    # 5. Execute Graph
    try:
        print("DEBUG: Invoking LangGraph...")
        final_state = study_app.invoke(initial_state)
        print("DEBUG: LangGraph execution complete.")
    except Exception as e:
        print(f"ERROR in LangGraph execution: {e}")
        import traceback
        traceback.print_exc()
        raise e

    # 6. Save results to DB for persistence
    db_human = ChatMessage(session_id=session_id, user_id=user_id, role="human", content=message)
    db.add(db_human)
    
    db_ai_role = final_state["type"]
    db_ai_content = final_state["response"]
    
    # --- Extract sources from text if LLM cited them ---
    import re
    source_match = re.search(r"Source:\s*(.+)", db_ai_content, re.IGNORECASE)
    
    # Start with the RAG sources we found
    final_sources = [s for s in sources if s != "General Knowledge"]
    
    if source_match:
        extracted = [s.strip() for s in source_match.group(1).split(",")]
        for s in extracted:
            if s.lower() != "general knowledge" and s not in final_sources:
                final_sources.append(s)
    
    # If still no sources, fallback to general knowledge
    if not final_sources:
        final_sources = ["General Knowledge"]

    if final_state["type"] == "evaluation_feedback":
        db_ai_content = f"Score: {final_state['score']}, Feedback: {final_state['feedback']}"

    # Format sources for DB storage
    sources_to_save = []
    for s in final_sources:
        if isinstance(s, str):
            sources_to_save.append({"label": s, "snippet": "Information from knowledge base." if s != "General Knowledge" else "Information from AI training data."})
        else:
            sources_to_save.append(s)

    db_ai = ChatMessage(
        session_id=session_id,
        user_id=user_id,
        role=db_ai_role, 
        content=db_ai_content,
        sources_json=json.dumps(sources_to_save)
    )
    db.add(db_ai)
    db.commit()

    return {
        "response": final_state["response"],
        "type": final_state["type"],
        "score": final_state["score"],
        "feedback": final_state["feedback"],
        "sources": sources_to_save # Return the formatted sources list
    }

response_type_map = {
    "learn": "explanation",
    "quiz": "quiz_question", # Map quiz mode to quiz_question type
    "evaluate": "evaluation_feedback", # Map evaluate mode to evaluation_feedback type
}