from fastapi import APIRouter
from app.schemas import TranslateRequest, TranslateResponse
from app.services.translator import translator_service

router = APIRouter(prefix="/translate", tags=["translate"])


@router.post("", response_model=TranslateResponse)
async def translate(req: TranslateRequest):
    result = await translator_service.translate(
        text=req.text,
        source_lang=req.source_lang,
        target_lang=req.target_lang,
    )
    return TranslateResponse(**result)
