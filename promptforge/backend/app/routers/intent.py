import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas import IntentExtractRequest, IntentExtractResponse
from app.services.intent_engine import intent_engine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/intent", tags=["intent"])


@router.post("/extract", response_model=IntentExtractResponse)
async def extract_intent(req: IntentExtractRequest, db: AsyncSession = Depends(get_db)):
    result = await intent_engine.extract(req.translated_text)
    return IntentExtractResponse(intent=result["intent"], classification=result["classification"])
