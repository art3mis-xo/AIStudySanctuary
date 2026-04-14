# Study Sanctuary: AI Study Assistant

An advanced, personalized AI study assistant that uses Retrieval-Augmented Generation (RAG) and Agentic Workflows to help students learn more effectively. The system adapts to your learning style, tracks your knowledge level, and can even generate and grade practice quizzes based on your uploaded study materials.

## 🚀 Key Features

- **Personalized Learning:** The Profiler Agent analyzes your interactions to determine your knowledge level and learning style.
- **Agentic Workflow:** Powered by LangGraph, the system orchestrates between Teacher, Quiz, and Evaluator specialists.
- **RAG Engine:** Upload PDFs, DOCX, PPTX, and even Excel files to build a local knowledge base.
- **Interactive Diagrams:** Automatically generates Mermaid.js flowcharts for complex concepts with a click-to-zoom feature.
- **Quiz & Evaluation:** Generate exam-style questions from your documents and get detailed feedback on your answers.
- **Secure Auth:** Full user authentication with JWT tokens and bcrypt password hashing.

## 🛠️ Tech Stack

- **Backend:** FastAPI, LangChain, LangGraph, SQLModel (SQLite).
- **LLM:** Groq (Llama 3.3 70B).
- **Vector DB:** ChromaDB (Local) or Pinecone (Cloud).
- **Frontend:** React (Vite), Framer Motion, Lucide Icons, Mermaid.js, Tailwind-like CSS.

---

## 🔧 Installation & Setup

### 1. Prerequisites
- Python 3.9+
- Node.js & npm
- A Groq API Key (get one at [console.groq.com](https://console.groq.com))

### 2. Backend Setup
```bash
# Clone the repository (if applicable)
# cd Project1_AIStudy

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create a .env file
echo "GROQ_API_KEY=your_api_key_here" > .env
# Optional: Add PINECONE_API_KEY and PINECONE_INDEX_NAME for cloud storage
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Running the Application
1. Start the backend: `python main.py` (Server runs on `http://localhost:8000`)
2. Access the frontend: `http://localhost:5173`

---

## 📝 Usage Guide

1. **Sign Up:** Create an account and log in.
2. **New Session:** Start a new study session.
3. **Upload Materials:** Use the paperclip icon to upload your lecture notes or past papers.
4. **Learn:** Ask questions like "Explain the KDD lifecycle" to see adapted explanations and diagrams.
5. **Quiz Me:** Type "quiz me on [topic]" to start a practice session.
6. **Zoom Diagrams:** Click on any generated flowchart to view it in full screen.

## 🧪 Stress Testing
You can run a performance test on the backend using the provided script:
```bash
python stress_test.py
```
