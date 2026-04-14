import os
import getpass
from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv()

# Enable LangSmith Tracing
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_ENDPOINT"] = "https://api.smith.langchain.com"
os.environ["LANGCHAIN_API_KEY"] = os.getenv("LANGSMItH_API_KEY")
os.environ["LANGCHAIN_PROJECT"] = "AIStudy_Assistant"

if "GROQ_API_KEY" not in os.environ:
    # Use a dummy key if not found, or raise an error. 
    # In a real app, you'd want to ensure this is set in .env.
    os.environ["GROQ_API_KEY"] = "your_groq_api_key_here"

llm = ChatGroq(
    model="llama-3.3-70b-versatile", # Changed to a valid Groq model
    temperature=0,
    max_tokens=None,
    timeout=None,
    max_retries=2,
)
