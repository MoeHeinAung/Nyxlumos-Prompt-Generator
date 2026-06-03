import os
from dotenv import load_dotenv

load_dotenv()

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
DEEPSEEK_CHAT_MODEL = os.getenv("DEEPSEEK_CHAT_MODEL", "deepseek-chat")
DEEPSEEK_REASONER_MODEL = os.getenv("DEEPSEEK_REASONER_MODEL", "deepseek-reasoner")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./promptforge.db")
SECRET_KEY = os.getenv("SECRET_KEY", "promptforge-dev-secret-key")
APP_ENV = os.getenv("APP_ENV", "development")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

_deepseek_client = None


def get_deepseek_client():
    global _deepseek_client
    if _deepseek_client is None:
        import logging
        from openai import AsyncOpenAI
        if not DEEPSEEK_API_KEY:
            logging.getLogger(__name__).warning(
                "DeepSeek API key not configured. Set DEEPSEEK_API_KEY environment variable."
            )
        _deepseek_client = AsyncOpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)
    return _deepseek_client
