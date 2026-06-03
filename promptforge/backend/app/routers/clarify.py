from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, Session
from app.schemas import ClarifyRequest, ClarifyResponse
from app.services.clarifier import clarifier_service
from sqlalchemy import select

router = APIRouter(prefix="/clarify", tags=["clarify"])


@router.post("/generate-questions", response_model=ClarifyResponse)
async def generate_questions(req: ClarifyRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == req.session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    intent = session.extracted_intent or {}
    missing = req.missing_info or intent.get("missing_info", [])
    questions = await clarifier_service.generate_questions(intent, missing)
    session.pending_questions = questions
    await db.commit()
    return ClarifyResponse(questions=questions)
