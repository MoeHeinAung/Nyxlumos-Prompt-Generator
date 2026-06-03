import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, Session, Prompt
from app.schemas import GenerateRequest, GenerateResponse
from app.services.orchestrator import harness_orchestrator
from app.services.prompt_optimizer import prompt_optimizer
from app.services.sandbox_executor import sandbox_executor
from app.utils.events import event_bus
from sqlalchemy import select

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/generate", tags=["generate"])


@router.post("", response_model=GenerateResponse)
async def generate_prompt(req: GenerateRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == req.session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session_dict = {
        "id": session.id,
        "original_input": session.original_input,
        "translated_input": session.translated_input,
        "extracted_intent": session.extracted_intent,
        "classification": session.classification,
        "answers": session.answers,
        "target_model": req.target_model,
        "selected_harnesses": req.enabled_harnesses,
        "generated_prompt": session.generated_prompt,
    }

    model_template = await prompt_optimizer.get_model_template(req.target_model)
    if not model_template:
        model_template = {
            "model_name": req.target_model,
            "model_family": "general",
            "syntax_rules": "Markdown, clear sections.",
            "meta_prompt_template": "You are {role}. {task}\n\n## Context\n{context}\n\n## Requirements\n{requirements}\n\n## Output Format\n{format}",
            "reasoning_style": "direct",
        }

    harness_outputs = await harness_orchestrator.run(session_dict, req.enabled_harnesses)
    complexity = session.extracted_intent.get("complexity_score", 2) if session.extracted_intent else 2
    use_reasoner = complexity >= 4
    generation_result = await prompt_optimizer.generate_prompt(session_dict, model_template, harness_outputs, use_reasoner)

    validation_result = {"success": True, "checks": [], "code_validation": None}
    if "code_execution" in req.enabled_harnesses:
        code = _extract_code(generation_result["final_prompt"])
        if code:
            code_result = await sandbox_executor.validate_with_retry(code, "python")
            validation_result["code_validation"] = code_result
            status = "FAIL" if not code_result["success"] else "PASS"
            validation_result["checks"].append({
                "check": "code_execution",
                "status": status,
                "message": code_result.get("errors") if not code_result["success"] else "Code executed successfully.",
            })

    prompt_id = str(uuid.uuid4())
    prompt_record = Prompt(
        id=prompt_id,
        session_id=session.id,
        title=(session.extracted_intent.get("primary_intent", "Untitled")[:100] if session.extracted_intent else "Untitled"),
        original_request=session.original_input,
        final_prompt=generation_result["final_prompt"],
        target_model=req.target_model,
        harnesses_used=req.enabled_harnesses,
        complexity_score=complexity,
        scope=session.extracted_intent.get("scope", "general") if session.extracted_intent else "general",
    )
    db.add(prompt_record)
    session.generated_prompt = generation_result["final_prompt"]
    session.final_output = generation_result["final_prompt"]
    session.target_model = req.target_model
    session.selected_harnesses = req.enabled_harnesses
    session.current_state = "S11_VALIDATE"
    await db.commit()

    await event_bus.publish("PromptGenerated", {
        "session_id": session.id, "prompt_id": prompt_id,
        "model": req.target_model, "harnesses": req.enabled_harnesses,
    })

    return GenerateResponse(
        final_prompt=generation_result["final_prompt"],
        reasoning_trace=generation_result["reasoning_trace"],
        validation_result=validation_result,
    )


def _extract_code(prompt: str) -> str:
    import re
    match = re.search(r'```(\w+)?\s*\n(.*?)```', prompt, re.DOTALL)
    if not match:
        return ""
    lang = (match.group(1) or "").lower()
    code = match.group(2).strip()
    if lang in ("python", "py", "javascript", "js", "typescript", "ts", "bash", "sh", "json", "yaml", "sql"):
        return code
    return ""
