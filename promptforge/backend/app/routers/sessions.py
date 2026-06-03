import uuid
import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, Session, SessionState
from app.schemas import CreateSessionRequest, AdvanceSessionRequest, SessionResponse
from app.utils.fsm import PromptForgeFSM
from app.utils.events import event_bus
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse)
async def create_session(req: CreateSessionRequest, db: AsyncSession = Depends(get_db)):
    session_id = str(uuid.uuid4())
    session = Session(
        id=session_id,
        current_state="S1_INGEST",
        original_input=req.original_input,
        detected_language=req.language,
    )
    db.add(session)
    state = SessionState(
        session_id=session_id,
        state_data={"original_input": req.original_input, "language": req.language},
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
    )
    db.add(state)
    await db.commit()
    await db.refresh(session)
    await event_bus.publish("SessionCreated", {"session_id": session_id, "original_input": req.original_input})
    return SessionResponse(
        session_id=session.id,
        current_state=session.current_state,
        original_input=session.original_input,
        detected_language=session.detected_language,
        next_action="advance",
    )


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    state_result = await db.execute(select(SessionState).where(SessionState.session_id == session_id))
    state = state_result.scalar_one_or_none()
    if state and state.expires_at and state.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Session expired")

    next_action = _get_next_action(session.current_state, session)
    return SessionResponse(
        session_id=session.id,
        current_state=session.current_state,
        original_input=session.original_input,
        translated_input=session.translated_input,
        detected_language=session.detected_language,
        extracted_intent=session.extracted_intent,
        classification=session.classification,
        target_model=session.target_model,
        selected_harnesses=session.selected_harnesses,
        answers=session.answers,
        pending_questions=session.pending_questions,
        generated_prompt=session.generated_prompt,
        final_output=session.final_output,
        next_action=next_action,
        data=_build_response_data(session),
    )


@router.post("/{session_id}/advance", response_model=SessionResponse)
async def advance_session(session_id: str, req: AdvanceSessionRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    state_result = await db.execute(select(SessionState).where(SessionState.session_id == session_id))
    state = state_result.scalar_one_or_none()
    if state and state.expires_at and state.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Session expired")

    current = session.current_state
    next_state = PromptForgeFSM.next_state(current, _session_to_dict(session))

    if current == "S1_INGEST":
        if req.user_input and isinstance(req.user_input, dict):
            session.translated_input = req.user_input.get("translated_text", session.translated_input)
        next_state = "S2_TRANSLATE"
    elif current == "S2_TRANSLATE":
        if req.user_input and isinstance(req.user_input, dict):
            session.translated_input = req.user_input.get("translated_text") or session.translated_input
            session.extracted_intent = req.user_input.get("intent") or session.extracted_intent
            session.classification = req.user_input.get("classification") or session.classification
        next_state = "S3_EXTRACT"
    elif current == "S3_EXTRACT":
        if req.user_input and isinstance(req.user_input, dict):
            if req.user_input.get("intent"):
                session.extracted_intent = req.user_input.get("intent")
            if req.user_input.get("classification"):
                session.classification = req.user_input.get("classification")
        next_state = PromptForgeFSM.next_state("S3_EXTRACT", {})
    elif current == "S4_GAP_ANALYSIS":
        missing = []
        if session.extracted_intent:
            missing = session.extracted_intent.get("missing_info", [])
        session.pending_questions = missing
        next_state = PromptForgeFSM.next_state("S4_GAP_ANALYSIS", {"pending_questions": missing})
    elif current == "S5_CLARIFY":
        if req.user_input and isinstance(req.user_input, dict):
            answers = session.answers or {}
            answers.update(req.user_input)
            session.answers = answers
            remaining = session.pending_questions or []
            if remaining:
                remaining = remaining[1:]
                session.pending_questions = remaining
        next_state = PromptForgeFSM.next_state("S5_CLARIFY", {"pending_questions": session.pending_questions})
    elif current == "S6_CLASSIFY":
        next_state = "S7_MODEL_SELECT"
    elif current == "S7_MODEL_SELECT":
        if req.user_input and isinstance(req.user_input, dict):
            session.target_model = req.user_input.get("model", "deepseek-chat")
        next_state = "S8_HARNESS_SELECT"
    elif current == "S8_HARNESS_SELECT":
        if req.user_input and isinstance(req.user_input, dict):
            session.selected_harnesses = req.user_input.get("harnesses", [])
        next_state = "S9_OPTIMIZE"
    elif current == "S9_OPTIMIZE":
        next_state = "S10_GENERATE"
    elif current == "S10_GENERATE":
        if req.user_input and isinstance(req.user_input, dict):
            session.generated_prompt = req.user_input.get("final_prompt")
            session.final_output = req.user_input.get("final_prompt")
        next_state = "S11_VALIDATE"
    elif current == "S11_VALIDATE":
        next_state = "S12_EXPORT"
    else:
        next_state = current

    session.current_state = next_state
    session.updated_at = datetime.now(timezone.utc)
    if state:
        state.state_data = state.state_data or {}
        state.state_data["current_state"] = next_state
        state.expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    await db.commit()
    await db.refresh(session)

    next_action = _get_next_action(next_state, session)
    return SessionResponse(
        session_id=session.id,
        current_state=session.current_state,
        original_input=session.original_input,
        translated_input=session.translated_input,
        detected_language=session.detected_language,
        extracted_intent=session.extracted_intent,
        classification=session.classification,
        target_model=session.target_model,
        selected_harnesses=session.selected_harnesses,
        answers=session.answers,
        pending_questions=session.pending_questions,
        generated_prompt=session.generated_prompt,
        final_output=session.final_output,
        next_action=next_action,
        data=_build_response_data(session),
    )


def _session_to_dict(session: Session) -> dict:
    return {
        "id": session.id,
        "current_state": session.current_state,
        "original_input": session.original_input,
        "translated_input": session.translated_input,
        "detected_language": session.detected_language,
        "extracted_intent": session.extracted_intent,
        "classification": session.classification,
        "target_model": session.target_model,
        "selected_harnesses": session.selected_harnesses,
        "answers": session.answers,
        "pending_questions": session.pending_questions,
        "generated_prompt": session.generated_prompt,
        "final_output": session.final_output,
    }


def _get_next_action(current_state: str, session: Session) -> str:
    actions = {
        "S1_INGEST": "translate",
        "S2_TRANSLATE": "extract_intent",
        "S3_EXTRACT": "gap_analysis",
        "S4_GAP_ANALYSIS": "clarify" if session.pending_questions else "classify",
        "S5_CLARIFY": "answer_question" if session.pending_questions else "classify",
        "S6_CLASSIFY": "select_model",
        "S7_MODEL_SELECT": "select_harnesses",
        "S8_HARNESS_SELECT": "optimize",
        "S9_OPTIMIZE": "generate",
        "S10_GENERATE": "validate",
        "S11_VALIDATE": "export",
        "S12_EXPORT": "done",
    }
    return actions.get(current_state, "unknown")


def _build_response_data(session: Session) -> dict:
    data = {}
    if session.extracted_intent:
        data["intent"] = session.extracted_intent
    if session.classification:
        data["classification"] = session.classification
    if session.pending_questions:
        data["questions"] = session.pending_questions
    if session.answers:
        data["answers"] = session.answers
    if session.generated_prompt:
        data["generated_prompt"] = session.generated_prompt
    return data
