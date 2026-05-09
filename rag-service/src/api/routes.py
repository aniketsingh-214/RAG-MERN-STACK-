import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Request, Form
from pydantic import BaseModel, Field
# pyrefly: ignore [missing-import]
from loguru import logger
from src.config import settings

router = APIRouter()


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=5000)
    user_id: str | None = None
    session_id: str | None = None


@router.post("/query")
async def query_documents(request: Request, body: QueryRequest):
    pipeline = request.app.state.rag_pipeline
    if pipeline is None:
        raise HTTPException(status_code=503, detail="RAG pipeline not ready")
    try:
        result = await pipeline.query(body.query, user_id=body.user_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_document(
    request: Request, 
    file: UploadFile = File(...),
    user_id: str = Form(...)
):
    pipeline = request.app.state.rag_pipeline
    if pipeline is None:
        raise HTTPException(status_code=503, detail="RAG pipeline not ready")
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    temp_path = Path(settings.DOCUMENTS_DIR) / f"{uuid.uuid4()}_{file.filename}"
    try:
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large (max 50MB)")
        with open(temp_path, "wb") as f:
            f.write(content)
        result = await pipeline.ingest_pdf(str(temp_path), file.filename, user_id=user_id)
        return {"success": True, **result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_stats(request: Request):
    pipeline = request.app.state.rag_pipeline
    if not pipeline:
        raise HTTPException(status_code=503, detail="Pipeline not ready")
    return pipeline.get_stats()


@router.delete("/cache")
async def clear_cache(request: Request):
    pipeline = request.app.state.rag_pipeline
    if not pipeline:
        raise HTTPException(status_code=503, detail="Pipeline not ready")
    pipeline.cache.clear()
    return {"success": True, "message": "Cache cleared"}
