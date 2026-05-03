import os
import hashlib
import uuid
from pathlib import Path
from typing import List, Dict, Any, Optional
from loguru import logger

import chromadb
from chromadb.config import Settings as ChromaSettings
import google.generativeai as genai
from pypdf import PdfReader

from src.config import settings
from src.pipeline.cache import QueryCache

PROMPT_TEMPLATE = """You are a knowledgeable AI assistant with access to a document library.
Use the retrieved context below to answer the question accurately and concisely.
If the answer is not in the context, say so honestly - do not fabricate information.

Context:
{context}

Question: {question}

Answer:"""


class SimpleTextSplitter:
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def split_text(self, text: str) -> List[str]:
        if not text:
            return []
        
        chunks = []
        start = 0
        while start < len(text):
            end = start + self.chunk_size
            chunks.append(text[start:end])
            start += self.chunk_size - self.chunk_overlap
        return chunks


class RAGPipeline:
    def __init__(self):
        self.chroma_client: Optional[chromadb.PersistentClient] = None
        self.collection: Optional[chromadb.Collection] = None
        self.model: Optional[genai.GenerativeModel] = None
        self.cache = QueryCache(cache_dir=settings.CACHE_DIR, ttl=settings.CACHE_TTL, enabled=settings.ENABLE_CACHE)
        self.text_splitter = SimpleTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP
        )

    async def initialize(self):
        logger.info("Initializing Lightweight Gemini RAG Pipeline...")
        
        # Initialize Gemini
        api_key = settings.GEMINI_API_KEY.strip() if settings.GEMINI_API_KEY else ""
        if api_key and api_key != "YOUR_GEMINI_API_KEY_HERE":
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel(settings.LLM_MODEL)
            logger.info(f"Gemini model {settings.LLM_MODEL} initialized")
        else:
            logger.warning("No valid GEMINI_API_KEY found - Pipeline will be limited")

        # Initialize ChromaDB
        try:
            chroma_path = Path(settings.VECTORSTORE_PATH) / "chroma"
            chroma_path.mkdir(parents=True, exist_ok=True)
            self.chroma_client = chromadb.PersistentClient(path=str(chroma_path))
            
            self.collection = self.chroma_client.get_or_create_collection(
                name="rag_documents",
                metadata={"hnsw:space": "cosine"}
            )
            logger.info("ChromaDB initialized")
        except Exception as e:
            logger.error(f"ChromaDB init failed: {e}")
            raise

    def _get_user_collection(self, user_id: str):
        if not self.chroma_client:
            raise ValueError("ChromaDB client not initialized")
        
        collection_name = f"user_{user_id}" if user_id else "rag_documents"
        return self.chroma_client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )

    logger.info("Pipeline ready")

    async def ingest_pdf(self, file_path: str, filename: str, user_id: str = None) -> Dict[str, Any]:
        if not self.model:
            raise ValueError("Gemini model not initialized. Check API Key.")

        logger.info(f"Ingesting: {filename}")
        
        # Extract text
        reader = PdfReader(file_path)
        pages_content = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                pages_content.append({"page": i + 1, "text": text})
        
        if not pages_content:
            raise ValueError(f"No text extracted from {filename}")

        # Split
        all_chunks = []
        all_metadatas = []
        all_ids = []
        file_hash = self._hash_file(file_path)
        
        for p in pages_content:
            chunks = self.text_splitter.split_text(p["text"])
            for i, chunk in enumerate(chunks):
                all_chunks.append(chunk)
                all_metadatas.append({
                    "source": filename,
                    "page": p["page"],
                    "file_hash": file_hash,
                    "chunk_index": i
                })
                all_ids.append(f"{file_hash}_{p['page']}_{i}")

        # Generate Embeddings (Gemini)
        logger.info(f"Generating embeddings for {len(all_chunks)} chunks using {settings.EMBEDDING_MODEL}...")
        try:
            # Gemini embedding API supports batching
            result = genai.embed_content(
                model=settings.EMBEDDING_MODEL,
                content=all_chunks,
                task_type="retrieval_document"
            )
            embeddings = result['embedding']
            
            # Upsert into ChromaDB
            collection = self._get_user_collection(user_id)
            collection.upsert(
                ids=all_ids,
                embeddings=embeddings,
                metadatas=all_metadatas,
                documents=all_chunks
            )
            
            logger.info(f"Indexed {filename}: {len(all_chunks)} chunks")
            self.cache.clear()
            
            return {
                "filename": filename, 
                "pages": len(reader.pages), 
                "chunks": len(all_chunks), 
                "status": "indexed"
            }
        except Exception as e:
            logger.error(f"Ingestion failed: {e}")
            raise

    async def query(self, question: str, user_id: str = None) -> Dict[str, Any]:
        if not question.strip():
            raise ValueError("Query cannot be empty")

        if not self.model:
            return {"answer": "Gemini API key not configured. Please replace 'YOUR_GEMINI_API_KEY_HERE' in the .env file with your actual API key.", "sources": [], "from_cache": False}

        cached = self.cache.get(question)
        if cached:
            logger.info("Cache hit")
            return {**cached, "from_cache": True}

        try:
            # 1. Embed the query
            query_embedding_res = genai.embed_content(
                model=settings.EMBEDDING_MODEL,
                content=question,
                task_type="retrieval_query"
            )
            query_embedding = query_embedding_res['embedding']

            # 2. Retrieve from ChromaDB
            collection = self._get_user_collection(user_id)
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=settings.TOP_K_RESULTS,
                include=["documents", "metadatas", "distances"]
            )

            # 3. Format Context
            context_list = []
            sources = []
            
            if results["documents"] and len(results["documents"][0]) > 0:
                for i in range(len(results["documents"][0])):
                    doc = results["documents"][0][i]
                    meta = results["metadatas"][0][i]
                    dist = results["distances"][0][i]
                    
                    score = 1 - dist 
                    if score < settings.SIMILARITY_THRESHOLD:
                        continue
                        
                    context_list.append(doc)
                    sources.append({
                        "content": doc[:300] + "...",
                        "source": meta.get("source", "Unknown"),
                        "page": meta.get("page"),
                        "score": round(float(score), 4)
                    })

            if not context_list:
                return {"answer": "I couldn't find any relevant information in the documents to answer your question.", "sources": [], "from_cache": False}

            context_text = "\n\n---\n\n".join(context_list)
            
            # 4. Generate Answer (Gemini)
            prompt = PROMPT_TEMPLATE.format(context=context_text, question=question)
            
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=settings.LLM_TEMPERATURE,
                    max_output_tokens=settings.LLM_MAX_TOKENS
                )
            )
            
            answer = response.text
            
            res = {
                "answer": answer, 
                "sources": sources, 
                "from_cache": False, 
                "model": settings.LLM_MODEL
            }
            
            self.cache.set(question, res)
            return res

        except Exception as e:
            logger.error(f"Query failed: {e}")
            raise

    def _hash_file(self, path: str) -> str:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()

    def get_stats(self) -> Dict[str, Any]:
        return {
            "vectorstore_type": "ChromaDB",
            "collection_count": self.collection.count() if self.collection else 0,
            "llm_ready": self.model is not None,
            "cache_size": self.cache.size(),
            "model": settings.LLM_MODEL,
            "embedding_model": settings.EMBEDDING_MODEL
        }
