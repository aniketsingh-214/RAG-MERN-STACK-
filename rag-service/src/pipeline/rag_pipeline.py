import os
import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional
from loguru import logger

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_openai import ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain.schema import Document

from src.config import settings
from src.pipeline.cache import QueryCache

PROMPT_TEMPLATE = """You are a knowledgeable AI assistant with access to a document library.
Use the retrieved context below to answer the question accurately and concisely.
If the answer is not in the context, say so honestly - do not fabricate information.

Context:
{context}

Question: {question}

Answer:"""


class RAGPipeline:
    def __init__(self):
        self.vectorstore: Optional[FAISS] = None
        self.embeddings = None
        self.llm = None
        self.qa_chain = None
        self.cache = QueryCache(cache_dir=settings.CACHE_DIR, ttl=settings.CACHE_TTL, enabled=settings.ENABLE_CACHE)
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

    async def initialize(self):
        logger.info("Loading embedding model...")
        self.embeddings = HuggingFaceEmbeddings(
            model_name=settings.EMBEDDING_MODEL,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True}
        )
        logger.info(f"Embeddings ready: {settings.EMBEDDING_MODEL}")

        vs_path = Path(settings.VECTORSTORE_PATH) / "faiss_index"
        if vs_path.exists():
            try:
                self.vectorstore = FAISS.load_local(
                    str(vs_path), self.embeddings, allow_dangerous_deserialization=True
                )
                logger.info(f"Loaded FAISS index from {vs_path}")
            except Exception as e:
                logger.warning(f"Could not load index: {e}. Starting fresh.")

        self._init_llm()
        if self.vectorstore:
            self._build_qa_chain()
        logger.info("Pipeline initialized")

    def _init_llm(self):
        if settings.OPENAI_API_KEY:
            self.llm = ChatOpenAI(
                model=settings.LLM_MODEL,
                temperature=settings.LLM_TEMPERATURE,
                max_tokens=settings.LLM_MAX_TOKENS,
                openai_api_key=settings.OPENAI_API_KEY
            )
            logger.info(f"LLM ready: {settings.LLM_MODEL}")
        else:
            logger.warning("No OPENAI_API_KEY - LLM disabled")

    def _build_qa_chain(self):
        if not self.llm or not self.vectorstore:
            return
        retriever = self.vectorstore.as_retriever(
            search_type="similarity_score_threshold",
            search_kwargs={"k": settings.TOP_K_RESULTS, "score_threshold": settings.SIMILARITY_THRESHOLD}
        )
        prompt = PromptTemplate(template=PROMPT_TEMPLATE, input_variables=["context", "question"])
        self.qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=retriever,
            return_source_documents=True,
            chain_type_kwargs={"prompt": prompt}
        )
        logger.info("QA chain built")

    async def ingest_pdf(self, file_path: str, filename: str) -> Dict[str, Any]:
        logger.info(f"Ingesting: {filename}")
        loader = PyPDFLoader(file_path)
        raw_docs = loader.load()
        if not raw_docs:
            raise ValueError(f"No content extracted from {filename}")

        chunks = self.text_splitter.split_documents(raw_docs)
        file_hash = self._hash_file(file_path)
        for chunk in chunks:
            chunk.metadata["source"] = filename
            chunk.metadata["file_hash"] = file_hash

        logger.info(f"Split into {len(chunks)} chunks from {len(raw_docs)} pages")

        if self.vectorstore is None:
            self.vectorstore = FAISS.from_documents(chunks, self.embeddings)
        else:
            self.vectorstore.add_documents(chunks)

        vs_path = Path(settings.VECTORSTORE_PATH) / "faiss_index"
        self.vectorstore.save_local(str(vs_path))
        self._build_qa_chain()
        self.cache.clear()

        logger.info(f"Indexed {filename}: {len(chunks)} chunks")
        return {"filename": filename, "pages": len(raw_docs), "chunks": len(chunks), "status": "indexed"}

    async def query(self, question: str, user_id: str = None) -> Dict[str, Any]:
        if not question.strip():
            raise ValueError("Query cannot be empty")

        cached = self.cache.get(question)
        if cached:
            logger.info("Cache hit")
            return {**cached, "from_cache": True}

        if not self.vectorstore:
            return {"answer": "No documents indexed yet. Please upload a PDF first.", "sources": [], "from_cache": False, "model": None}

        if not self.qa_chain:
            return {"answer": "AI model not configured. Set OPENAI_API_KEY in environment.", "sources": [], "from_cache": False, "model": None}

        try:
            logger.info(f"Processing query: {question[:80]}")
            result = self.qa_chain.invoke({"query": question})
            answer = result.get("result", "No relevant answer found.")
            source_docs: List[Document] = result.get("source_documents", [])
            sources = [
                {"content": doc.page_content[:300], "source": doc.metadata.get("source", "Unknown"),
                 "page": doc.metadata.get("page"), "score": doc.metadata.get("score")}
                for doc in source_docs
            ]
            response = {"answer": answer, "sources": sources, "from_cache": False, "model": settings.LLM_MODEL}
            self.cache.set(question, response)
            return response
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
            "vectorstore_loaded": self.vectorstore is not None,
            "llm_ready": self.llm is not None,
            "qa_chain_ready": self.qa_chain is not None,
            "cache_size": self.cache.size(),
            "model": settings.LLM_MODEL,
            "embedding_model": settings.EMBEDDING_MODEL
        }
