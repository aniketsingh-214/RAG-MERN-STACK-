import hashlib
import time
from pathlib import Path
from typing import Optional, Dict, Any
from loguru import logger

try:
    import diskcache
    DISKCACHE_AVAILABLE = True
except ImportError:
    DISKCACHE_AVAILABLE = False


class QueryCache:
    def __init__(self, cache_dir: str, ttl: int = 3600, enabled: bool = True):
        self.ttl = ttl
        self.enabled = enabled and DISKCACHE_AVAILABLE
        self._memory: Dict[str, tuple] = {}

        if self.enabled:
            try:
                Path(cache_dir).mkdir(parents=True, exist_ok=True)
                self._cache = diskcache.Cache(cache_dir)
                logger.info(f"Disk cache at {cache_dir}")
            except Exception as e:
                logger.warning(f"Disk cache failed: {e}. Using memory cache.")
                self.enabled = False

    def _key(self, query: str) -> str:
        return f"rag:{hashlib.sha256(query.lower().strip().encode()).hexdigest()}"

    def get(self, query: str) -> Optional[Dict[str, Any]]:
        key = self._key(query)
        try:
            if self.enabled:
                return self._cache.get(key)
            entry = self._memory.get(key)
            if entry and (time.time() - entry[1]) < self.ttl:
                return entry[0]
        except Exception as e:
            logger.warning(f"Cache get error: {e}")
        return None

    def set(self, query: str, value: Dict[str, Any]) -> None:
        key = self._key(query)
        try:
            if self.enabled:
                self._cache.set(key, value, expire=self.ttl)
            else:
                self._memory[key] = (value, time.time())
        except Exception as e:
            logger.warning(f"Cache set error: {e}")

    def clear(self) -> None:
        try:
            if self.enabled:
                self._cache.clear()
            else:
                self._memory.clear()
        except Exception as e:
            logger.warning(f"Cache clear error: {e}")

    def size(self) -> int:
        try:
            return len(self._cache) if self.enabled else len(self._memory)
        except Exception:
            return 0
