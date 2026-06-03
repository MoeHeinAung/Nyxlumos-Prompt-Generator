from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, Prompt
from sqlalchemy import select, func

router = APIRouter(prefix="/history", tags=["history"])


@router.get("")
async def list_history(limit: int = 20, offset: int = 0, db: AsyncSession = Depends(get_db)):
    limit = max(1, min(limit, 100))
    result = await db.execute(
        select(Prompt).order_by(Prompt.created_at.desc()).offset(offset).limit(limit)
    )
    prompts = result.scalars().all()
    count_result = await db.execute(select(func.count(Prompt.id)))
    total = count_result.scalar()
    return {
        "items": [
            {
                "id": p.id,
                "session_id": p.session_id,
                "title": p.title,
                "original_request": p.original_request,
                "final_prompt": p.final_prompt,
                "target_model": p.target_model,
                "harnesses_used": p.harnesses_used,
                "complexity_score": p.complexity_score,
                "scope": p.scope,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in prompts
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.delete("/{history_id}")
async def delete_history(history_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Prompt).where(Prompt.id == history_id))
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    await db.delete(prompt)
    await db.commit()
    return {"deleted": True, "id": history_id}
