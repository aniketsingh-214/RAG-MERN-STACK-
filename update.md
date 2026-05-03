# Project Updates - 2026-04-22

This document summarizes the major structural and architectural changes made to the RAG+MERN project to improve performance and stability.

## 1. Redis Feature Disabled
To resolve recurring Redis connection errors in local and production environments, the Redis caching layer has been disabled.
- **Backend**: `cacheService.js` was modified to skip all Redis connection attempts and logic.
- **Environment**: Redis variables in `backend/rag-connector/.env` are now commented out.
- **Infrastructure**: The `redis` service and its data volumes were removed from `docker-compose.yml`.
- **Status**: System now bypasses cache and communicates directly with the RAG service.

## 2. RAG-Service Refactor (Lightweight Stack)
The Python RAG service was overhauled to reduce system load (RAM/Storage) by removing heavy local ML libraries.
- **Vector DB**: Switched from `FAISS` to **`ChromaDB`**.
- **Embeddings**: Replaced local `sentence-transformers` (+ `torch` + `transformers`) with **`OpenAI Cloud Embeddings`** (`text-embedding-3-small`).
- **Framework**: Removed **`LangChain`** in favor of a custom, direct pipeline using the `openai` Python client.
- **Dependency Removal**:
    - Removed `torch`, `transformers`, `sentence-transformers`, `faiss-cpu`, `scikit-learn`, `nltk`.
    - Result: Drastically reduced image size and idle memory usage.

## 3. Documentation & Setup
- **`README.md`**: Updated to reflect the new Lightweight RAG architecture and the disabled Redis state.
- **Models**: Default LLM is set to `gpt-3.5-turbo` and Embedding model is `text-embedding-3-small`.

---

> [!IMPORTANT]
> **Action Required**: Users must re-upload their documents via the application UI to populate the new ChromaDB vector store, as previous FAISS indexes are incompatible with the new embedding model.
