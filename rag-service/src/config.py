# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Optional


class Settings(BaseSettings):
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: str
    LLM_MODEL: str = "gemini-1.5-flash"
    LLM_TEMPERATURE: float = 0.1
    LLM_MAX_TOKENS: int = 1024
    EMBEDDING_MODEL: str = "models/embedding-001"
    VECTORSTORE_PATH: str = "./vectorstore"
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    TOP_K_RESULTS: int = 4
    SIMILARITY_THRESHOLD: float = 0.3
    CACHE_DIR: str = "./cache"
    CACHE_TTL: int = 3600
    ENABLE_CACHE: bool = True
    DOCUMENTS_DIR: str = "./documents"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

for p in [settings.VECTORSTORE_PATH, settings.CACHE_DIR, settings.DOCUMENTS_DIR]:
    if p:
        Path(p).mkdir(parents=True, exist_ok=True)
