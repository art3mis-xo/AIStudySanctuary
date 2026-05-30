# Study Sanctuary

**Study Sanctuary** is an Agentic RAG (Retrieval-Augmented Generation) orchestration system designed to provide a personalized, sovereign learning environment. It leverages advanced multi-agent workflows to transform static study materials into interactive, adaptive educational experiences.

Powered by **Llama 3.3 70B** via Groq, Study Sanctuary delivers low-latency, high-reasoning capabilities for document analysis, conceptual mapping, and automated assessment without the overhead of traditional LMS platforms.

## 🧠 Core Architecture

### LLM Backbone: Llama 3.3 70B (Versatile)
*   **Provider:** Groq Cloud Inference
*   **Inference Speed:** Sub-second TTFT (Time To First Token)
*   **Context Strategy:** Dynamic RAG injection with recursive character splitting

### Agentic Workflow: LangGraph Orchestration
The system utilizes a directed acyclic graph (DAG) to manage state and transition between specialized AI personas:
*   **Profiler Agent:** Extracts user learning styles, knowledge gaps, and proficiency levels from conversation history.
*   **Teacher Specialist:** Generates personalized explanations and **Mermaid.js** conceptual flowcharts based on retrieved context.
*   **Assessment Specialist:** Synthesizes exam-style questions by analyzing patterns in uploaded past papers and lecture notes.
*   **Evaluator Agent:** Performs deterministic grading and constructive feedback loops on user submissions.

### Hybrid RAG Infrastructure
*   **Vector Engine:** Dual-support for **ChromaDB** (Local/Edge) and **Pinecone** (Cloud).
*   **Embedding Model:** `BAAI/bge-small-en-v1.5` via FastEmbed for efficient local vectorization.
*   **Multi-Modal Parsing:** Specialized extractors for PDF, DOCX, PPTX, XLSX, and CSV, including Camelot-powered table extraction.

## 🛠️ Technical Stack

| Component | Technology |
| :--- | :--- |
| **Backend** | FastAPI (Asynchronous Python) |
| **Orchestration** | LangGraph & LangChain |
| **Database** | SQLModel (SQLite) with JWT Authentication |
| **Vector Store** | ChromaDB / Pinecone |
| **Frontend** | React + Vite + Framer Motion |
| **Visualization** | Mermaid.js (Dynamic Flowcharts) |
| **Monitoring** | LangSmith (Full-stack Tracing) |

## 🧪 Performance & Stress Testing

Study Sanctuary includes a dedicated telemetry and stress-testing suite (`stress_test.py`) to validate system stability under concurrent load.

### Key Metrics (Benchmarked on Groq Llama 3.3):
*   **Concurrency:** Validated for 50+ simultaneous agentic sessions.
*   **Throughput:** Optimized for high-request volume with asynchronous SSE (Server-Sent Events) streaming.
*   **Latency:** Average response time < 2s for complex RAG-based queries.

Run the stress test suite:
```bash
python stress_test.py
```

## 🚀 Deployment & Security

### Sovereign Design
*   **Identity Isolation:** User-level metadata filtering in Vector DB ensures data privacy across sessions.
*   **Security Audit:** Bcrypt password hashing and JWT-based session management.
*   **Ephemeral Deployment:** Optimized for Render (Frontend/Backend) with configurable CORS and environment-level scaling.

### Quick Start
1.  **Backend:**
    ```bash
    pip install -r requirements.txt
    python main.py
    ```
2.  **Frontend:**
    ```bash
    cd frontend && npm install && npm run dev
    ```

## 📋 Constraints & Maintenance
For detailed information on architectural limitations, Render memory management, and persistent storage strategies, refer to:
*   `GEMINI.md` - Development workflows and repo-specific mandates.
*   `constraints.md` - Technical limitations and accommodation strategies.
