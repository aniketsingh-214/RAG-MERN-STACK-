# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Optional


class Settings(BaseSettings):
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: str
    LLM_MODEL: str
    LLM_TEMPERATURE: float
    LLM_MAX_TOKENS: int
    EMBEDDING_MODEL: str
    VECTORSTORE_PATH: str
    CHUNK_SIZE: int
    CHUNK_OVERLAP: int
    TOP_K_RESULTS: int
    SIMILARITY_THRESHOLD: float
    CACHE_DIR: str
    CACHE_TTL: int
    ENABLE_CACHE: bool
    DOCUMENTS_DIR: str
    HOST: str
    PORT: int
    LOG_LEVEL: str

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

for p in [settings.VECTORSTORE_PATH, settings.CACHE_DIR, settings.DOCUMENTS_DIR]:
    if p:
        Path(p).mkdir(parents=True, exist_ok=True)
