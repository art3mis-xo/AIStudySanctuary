# Technical Constraints & Architectural Decisions

This document tracks technical limitations encountered during development and the specific architectural or code adjustments made to address them.

## 1. Render Memory Limits (512MB RAM)
**Issue**: Web Service exceeded memory limit and restarted during file uploads and RAG processing.
**Date Identified**: April 17, 2026

### Constraints Identified:
- **PDF Table Extraction**: `camelot-py` is extremely memory-intensive when processing large PDFs.
- **File Uploads**: FastAPI `UploadFile.read()` loads the entire file into memory by default.
- **Embedding Generation**: Generating embeddings for a large number of text chunks simultaneously can spike RAM usage.
- **Dependency Overhead**: Heavy libraries like `camelot` and `pandas` increase the base memory footprint at startup.

### Workarounds Implemented:
- **Streaming Uploads**: Modified `/upload` endpoint in `main.py` to write files in 1MB chunks instead of reading the whole file into RAM.
- **Lazy Loading Embeddings**: Moved the `FastEmbedEmbeddings` model initialization into a property. The ~200MB model is now only loaded into RAM when a file is processed or a query is made.
- **Smaller Batching**: Reduced embedding batch size (e.g., batch size = 10) in `rag_engine.py` to keep memory spikes minimal during processing.
- **Lazy Imports**: Moved `import camelot` inside the extraction function to save significant startup RAM.
- **Extraction Limits**: Restricted table extraction to the first 10 pages of PDFs to prevent runaway memory consumption.
- **Cloud Vector Offload**: Added support for **Pinecone** to offload vector storage and computation for large-scale document sets.

## 2. Ephemeral Filesystem (Render)
**Issue**: SQLite databases and local ChromaDB files are wiped on every redeploy or restart.

### Workarounds:
- **Persistent Disk Recommendations**: Documented in `GEMINI.md` that a Render Persistent Disk is required for data longevity.
- **Hybrid Storage Strategy**: Implemented Pinecone support as a persistent cloud alternative to local ChromaDB.
- **User Isolation**: Implemented `user_id` metadata filtering in the vector database to ensure session privacy even in transient environments.

## 3. Concurrency & Performance
**Issue**: High concurrent agentic sessions can lead to increased latency or rate-limiting.

### Solutions:
- **Stress Test Suite**: Developed `stress_test.py` to benchmark concurrency (target 50+ reqs) and latency (target < 2s).
- **Asynchronous Orchestration**: Utilized `asyncio.to_thread` for LangGraph execution to maintain FastAPI responsiveness.
- **SSE Streaming**: Implemented Server-Sent Events for real-time AI response delivery, improving perceived performance.
