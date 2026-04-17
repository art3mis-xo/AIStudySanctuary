# Project Constraints and Workarounds

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
- **Lazy Loading Embeddings**: Moved the `FastEmbedEmbeddings` model initialization into a property. The ~200MB model is now only loaded into RAM when a file is processed or a query is made, instead of at application startup.
- **Smaller Batching**: Reduced embedding batch size from 20 to 10 (and further to 5 if needed) to keep memory spikes minimal during processing.
- **Lazy Imports**: Moved `import camelot` inside the extraction function to save ~50-100MB of startup RAM.
- **Extraction Limits**: Restricted table extraction to the first 10 pages of PDFs to prevent runaway memory consumption.
- **Singleton Pattern**: Ensured `rag_engine` is a singleton to prevent multiple vector database clients from being initialized.

## 2. Render Ephemeral Filesystem
**Issue**: SQLite database and local storage are wiped on every redeploy.
**Note**: Documented in `GEMINI.md`.

### Workarounds:
- Use of Cloud Vector DB (Pinecone) is recommended for persistence.
- Users are warned that local SQLite data is transient without a Render Persistent Disk.
