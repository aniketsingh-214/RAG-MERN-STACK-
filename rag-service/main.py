from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time
from loguru import logger

from src.api.routes import router
from src.pipeline.rag_pipeline import RAGPipeline
from src.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing RAG pipeline...")
    pipeline = RAGPipeline()
    await pipeline.initialize()
    app.state.rag_pipeline = pipeline
    logger.info("RAG pipeline ready")
    yield
    logger.info("Shutting down")


app = FastAPI(title="RAG Microservice", version="1.0.0", lifespan=lifespan)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    response.headers["X-Process-Time"] = f"{time.time() - start:.4f}"
    return response


@app.exception_handler(Exception)
async def global_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error", "error": str(exc)})


@app.get("/")
async def root():
    return {
        "message": "RAG Microservice is running",
        "health_check": "/health",
        "documentation": "/docs"
    }


@app.get("/health")
async def health():
    pipeline_ready = hasattr(app.state, "rag_pipeline") and app.state.rag_pipeline is not None
    return {"status": "healthy" if pipeline_ready else "initializing", "service": "rag-service", "pipeline_ready": pipeline_ready, "model": settings.LLM_MODEL}


app.include_router(router)

try:
    from mangum import Mangum
    handler = Mangum(app, lifespan="on")
except ImportError:
    pass

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)

