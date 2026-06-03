import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import CORS_ORIGINS, APP_ENV
from app.database import init_db
from app.routers import sessions, translate, generate, clarify, history, analytics, models_endpoints, intent
from app.utils.events import event_bus

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    event_task = asyncio.create_task(event_bus.process())
    logger.info("PromptForge backend started.")
    yield
    event_task.cancel()
    try:
        await event_task
    except asyncio.CancelledError:
        pass
    logger.info("PromptForge backend shutting down.")


app = FastAPI(
    title="PromptForge API",
    version="1.0.0",
    description="Professional AI prompt generator with interactive clarification and multi-model optimization.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router, prefix="/api/v1")
app.include_router(translate.router, prefix="/api/v1")
app.include_router(generate.router, prefix="/api/v1")
app.include_router(clarify.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(models_endpoints.router, prefix="/api/v1")
app.include_router(intent.router, prefix="/api/v1")


@app.get("/api/v1/health")
async def health():
    return {"status": "healthy", "app": "PromptForge", "version": "1.0.0"}
