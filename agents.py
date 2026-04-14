import json
from typing import List, Optional, Dict, Annotated, TypedDict, Literal
from datetime import datetime
from pydantic import BaseModel, Field
from sqlmodel import Session, select
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.output_parsers import PydanticOutputParser
from langgraph.graph import StateGraph, END
from llm_config import llm
from database import ChatMessage, UserProfile, engine
from rag_engine import rag_engine

# --- 1. Define Graph State ---
class StudyState(TypedDict):
    session_id: str
    user_id: int
    mode: str
    message: str
    user_answer: Optional[str]
    history: List[BaseMessage]
    profile: Dict[str, str]
    context: str
    sources: List[str]
    response: str
    score: Optional[int]
    feedback: Optional[str]
    type: str

# --- 2. Profiler Agent (Persona Extraction) ---
class ProfileExtraction(BaseModel):
    knowledge_level: str = Field(description="The user's proficiency level (Beginner, Intermediate, Advanced).")
    learning_style: str = Field(description="How the user prefers to learn (e.g., Simple, Technical, Analogy-based).")
    pain_points: List[str] = Field(description="Specific topics the user is struggling with.")

profile_parser = PydanticOutputParser(pydantic_object=ProfileExtraction)

def profiler_node(state: StudyState):
    """Analyzes history to extract and update the user's persona profile."""
    session_id = state["session_id"]
    user_id = state["user_id"]
    
    with Session(engine) as db:
        # Fetch current profile for this specific user/session
        statement = select(UserProfile).where(UserProfile.session_id == session_id, UserProfile.user_id == user_id)
        db_profile = db.exec(statement).first()
        
        if not db_profile:
            db_profile = UserProfile(session_id=session_id, user_id=user_id)
            db.add(db_profile)
            db.commit()
            db.refresh(db_profile)

        # Only run extraction if we have enough history (e.g., > 2 messages)
        if len(state["history"]) >= 2:
            convo_text = "\n".join([f"{m.type}: {m.content}" for m in state["history"][-5:]])
            
            prompt = (
                "Analyze the following conversation and update the user's learning profile. "
                "Be objective and focus on their knowledge level, style preferences, and struggle areas.\n\n"
                f"Conversation:\n{convo_text}\n\n"
                f"{profile_parser.get_format_instructions()}"
            )
            
            try:
                ai_response = llm.invoke([SystemMessage(content=prompt)])
                extracted = profile_parser.parse(ai_response.content)
                
                # Update DB
                db_profile.knowledge_level = extracted.knowledge_level
                db_profile.learning_style = extracted.learning_style
                db_profile.pain_points = ", ".join(extracted.pain_points)
                db_profile.last_updated = datetime.utcnow()
                db.add(db_profile)
                db.commit()
                db.refresh(db_profile)
            except Exception as e:
                print(f"Profiler failed: {e}")

        # Sync profile to state
        state["profile"] = {
            "level": db_profile.knowledge_level,
            "style": db_profile.learning_style,
            "pain_points": db_profile.pain_points
        }
    
    return state

# --- 3. Specialist Agents ---

# Evaluator Parser
class EvaluationResult(BaseModel):
    score: int = Field(description="A score between 0 and 10.")
    feedback: str = Field(description="Constructive feedback.")
    is_correct: bool = Field(description="Whether the answer meets core requirements.")

eval_parser = PydanticOutputParser(pydantic_object=EvaluationResult)

def teacher_node(state: StudyState):
    """Personalized Teacher Agent with RAG support."""
    # Build System Prompt with Profile
    profile = state["profile"]
    
    # --- QUICK GREETING CHECK ---
    greetings = ["hi", "hello", "hey", "hola", "greetings"]
    if state["message"].lower().strip() in greetings:
        state["response"] = "Hello! I'm your AI study assistant. How can I help you learn today? You can ask me to explain a concept, quiz you on a topic, or analyze a study material you've uploaded."
        state["type"] = "explanation"
        return state

    system_prompt = (
        f"You are a helpful teacher. Your student is at an '{profile['level']}' level "
        f"and prefers '{profile['style']}' explanations. They struggle with: {profile['pain_points']}.\n\n"
        "FORMATTING RULES:\n"
        "1. Use Markdown headers (###) for sections.\n"
        "2. Use bullet points (* or -) for lists. Ensure each point is on a new line.\n"
        "3. Use double newlines between paragraphs and sections.\n"
        "4. Bold key terms using **term**.\n"
        "5. If you use Mermaid diagrams, always start with 'flowchart TD' or 'flowchart LR'.\n"
        "6. BULLETPROOF MERMAID RULE: Use the syntax 'A -- \"Label\" --> B' for labeled arrows. Use simple alphanumeric characters for node names (A, B, C, etc.).\n"
        "7. Ensure ALL node labels are enclosed in square brackets with double quotes: A[\"Node Text\"].\n\n"
        "SOURCE CITATION RULE:\n"
        "At the very end of your response, you MUST include a line exactly like this: 'Source: [Filename]'.\n"
        "If you used multiple sources, list them comma-separated: 'Source: file1.pdf, file2.docx'.\n"
        "If no specific source was used, state: 'Source: General Knowledge'.\n\n"
        "KNOWLEDGE SOURCE PRIORITY (CRITICAL):\n"
        "1. THE PROVIDED CONTEXT BELOW IS YOUR PRIMARY SOURCE OF TRUTH.\n"
        "2. If the context contains specific facts, passwords, or data, YOU MUST USE THEM even if they seem unusual or contradict your training data.\n"
        "3. If the context is missing information, only then use your general knowledge.\n\n"
        f"Context:\n{state['context']}"
    )
    
    messages = [SystemMessage(content=system_prompt)] + state["history"][-5:] + [HumanMessage(content=state["message"])]
    ai_response = llm.invoke(messages)
    
    state["response"] = ai_response.content
    state["type"] = "explanation"
    return state

def quiz_node(state: StudyState):
    """Assessment Specialist that learns from past papers to generate relevant questions."""
    profile = state["profile"]
    session_id = state["session_id"]
    user_id = state["user_id"]
    topic = state["message"]

    # --- RAG: Search for Past Paper Patterns ---
    past_paper_context = ""
    past_paper_results = rag_engine.query(session_id, topic, user_id=user_id, top_k=3, doc_type="past_paper")
    if past_paper_results:
        past_paper_context = "\n".join([f"--- Style Reference from {r['source']} ---\n{r['content']}" for r in past_paper_results])

    system_prompt = (
        f"You are an Assessment Specialist. Your student is an '{profile['level']}' who prefers '{profile['style']}' content. "
        f"Target their struggle areas: {profile['pain_points']}.\n\n"
        "FORMATTING RULES:\n"
        "1. Use Markdown headers (###) for the question title.\n"
        "2. Use bullet points (* or -) for options if it's multiple choice.\n"
        "3. Use double newlines for clarity.\n\n"
        "GOAL: Generate ONE new, challenging exam-style question.\n"
    )

    if past_paper_context:
        system_prompt += (
            "\nGUIDELINES (Based on Past Papers):\n"
            "1. Analyze the provided 'Style Reference' snippets below to understand the exam's format (e.g., Multiple Choice, Proof, Derivation, or Scenario-based).\n"
            "2. Match the difficulty level and complexity of these past papers.\n"
            "3. Do NOT repeat the exact questions from the past papers. Create a FRESH variation or a similar conceptual test.\n\n"
            f"Style References:\n{past_paper_context}"
        )
    else:
        system_prompt += "\nAsk a direct, thought-provoking question based on the topic provided by the student."

    messages = [SystemMessage(content=system_prompt)] + [HumanMessage(content=topic)]
    ai_response = llm.invoke(messages)
    
    state["response"] = ai_response.content
    state["type"] = "quiz_question"
    return state

def evaluator_node(state: StudyState):
    """Grading Specialist that evaluates user answers with detailed explanations."""
    # Find the last quiz question from history
    last_q = "Unknown"
    for msg in reversed(state["history"]):
        if "Quiz Question:" in msg.content or (isinstance(msg, AIMessage) and state["type"] == "quiz_question"):
            last_q = msg.content
            break

    user_ans = state.get("user_answer") or state["message"]

    system_prompt = (
        "You are an expert evaluator. Your goal is to grade the User's Answer and provide a detailed review.\n"
        f"Question(s) being answered: {last_q}\n"
        f"User's Answer: {user_ans}\n\n"
        "INSTRUCTIONS:\n"
        "1. Provide a numerical score (0-10).\n"
        "2. Provide a 'Correction & Explanation' section where you break down what was right/wrong.\n"
        "3. Be encouraging but rigorous.\n"
        "4. Return the response in the requested JSON format.\n\n"
        f"{eval_parser.get_format_instructions()}"
    )
    
    ai_response = llm.invoke([SystemMessage(content=system_prompt)])
    parsed = eval_parser.parse(ai_response.content)
    
    # We combine the feedback and the explanation into the response text for the UI
    state["response"] = f"### Evaluation Results\n\n{parsed.feedback}\n\n---\n*Score calculated by Evaluator Agent.*"
    state["score"] = parsed.score
    state["feedback"] = parsed.feedback
    state["type"] = "evaluation_feedback"
    return state

# --- 4. The Orchestrator (Supervisor Agent) ---

class ModeDecision(BaseModel):
    mode: Literal["learn", "quiz", "evaluate"] = Field(description="The learning mode the user's message implies.")
    extracted_answer: Optional[str] = Field(default=None, description="If the user is providing answers to questions, extract them here.")
    topic: Optional[str] = Field(default=None, description="The core scientific or academic topic being discussed (e.g., 'Linear Algebra', 'Mitochondria').")

mode_parser = PydanticOutputParser(pydantic_object=ModeDecision)

def router_node(state: StudyState):
    """Supervisor Agent that analyzes the user's intent and extracts the core topic."""
    current_mode = state["mode"]
    
    # Use history to find a previously mentioned topic if the current message is generic
    history_text = "\n".join([m.content for m in state["history"][-3:]])
    
    prompt = (
        "Analyze the user message and conversation history to decide the intent.\n\n"
        "INTENT GUIDELINES:\n"
        "1. LEARN: The user is asking a question, seeking an explanation, or asking about facts in their documents (e.g., 'what is...', 'how does...', 'where is...').\n"
        "2. QUIZ: The user wants to be tested, wants a new question, or wants to start a practice session.\n"
        "3. EVALUATE: ONLY use this if the user is explicitly PROVIDING an answer to a previous question (e.g., 'the answer is B', 'q1: 42', 'I think it is...').\n\n"
        "CRITICAL: If the user is asking a question (even if it's about a 'password' or 'secret'), that is LEARN mode, NOT EVALUATE.\n\n"
        f"Conversation History:\n{history_text}\n"
        f"User Message: '{state['message']}'\n\n"
        f"{mode_parser.get_format_instructions()}"
    )
    
    try:
        ai_response = llm.invoke([SystemMessage(content=prompt)])
        decision = mode_parser.parse(ai_response.content)
        state["mode"] = decision.mode
        
        if decision.extracted_answer:
            state["user_answer"] = decision.extracted_answer
        
        # If the LLM found a specific topic, use it to focus specialists
        if decision.topic and decision.topic.lower() != "unknown":
            state["message"] = f"Topic: {decision.topic}. User says: {state['message']}"
            
        print(f"Supervisor Agent Decided Mode: {decision.mode} | Topic: {decision.topic}")
    except Exception as e:
        print(f"Orchestrator failed to decide: {e}. Defaulting to 'learn'.")
        state["mode"] = "learn"
    
    # Return the route based on the final mode
    mode = state["mode"]
    if mode == "learn":
        return "teacher"
    elif mode == "quiz":
        return "quiz_generator"
    elif mode == "evaluate":
        return "evaluator"
    else:
        return END

# --- 5. Graph Definition ---

workflow = StateGraph(StudyState)

# Add Nodes
workflow.add_node("profiler", profiler_node)
workflow.add_node("teacher", teacher_node)
workflow.add_node("quiz_generator", quiz_node)
workflow.add_node("evaluator", evaluator_node)

# Define Connections
workflow.set_entry_point("profiler")

# Logic: Profiler -> Router -> Specialist
workflow.add_conditional_edges(
    "profiler",
    router_node,
    {
        "teacher": "teacher",
        "quiz_generator": "quiz_generator",
        "evaluator": "evaluator"
    }
)

# Specialist Nodes lead to END
workflow.add_edge("teacher", END)
workflow.add_edge("quiz_generator", END)
workflow.add_edge("evaluator", END)

# Compile
study_app = workflow.compile()
