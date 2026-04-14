from pydantic import BaseModel
from typing import Literal, Optional, List

class ChatRequest(BaseModel):
    session_id: str
    message: str
    mode: Optional[Literal["learn", "quiz", "evaluate", "auto"]] = "auto"
    user_answer: Optional[str] = None # New field for quiz answers

class ChatResponse(BaseModel):
    response: str
    type: Literal["explanation", "quiz_question", "question", "feedback", "evaluation_feedback"]
    score: Optional[int] = None
    feedback: Optional[str] = None
    sources: Optional[List[str]] = None # New field for RAG sources

class TranslationRequest(BaseModel):
    text: str
