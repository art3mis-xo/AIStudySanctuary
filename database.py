import os
from typing import List, Optional
from sqlmodel import Field, SQLModel, create_engine, Session
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Get the directory where this file is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Use absolute path for chat_history.db
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'chat_history.db')}"

# connect_args={"check_same_thread": False} is only needed for SQLite
engine_args = {"connect_args": {"check_same_thread": False}}

engine = create_engine(DATABASE_URL, echo=False, **engine_args)

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChatMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    session_id: str = Field(index=True)
    role: str 
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    archived: bool = Field(default=False)
    sources_json: Optional[str] = Field(default=None)

class UserProfile(SQLModel, table=True):
    session_id: str = Field(primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    knowledge_level: str = Field(default="Beginner")
    learning_style: str = Field(default="Standard")
    pain_points: str = Field(default="None")
    last_updated: datetime = Field(default_factory=datetime.utcnow)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
