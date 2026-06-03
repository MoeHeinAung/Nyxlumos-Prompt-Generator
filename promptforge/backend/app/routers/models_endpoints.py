from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, ModelTemplate
from sqlalchemy import select

router = APIRouter(prefix="/models", tags=["models"])

DEFAULT_MODELS = [
    {"id": "deepseek-chat", "name": "DeepSeek V3", "family": "deepseek", "strengths": "General reasoning, coding", "supports_harnesses": ["reasoning_scaffold", "meta_cognitive", "code_execution", "constraint_satisfaction", "debate"]},
    {"id": "deepseek-reasoner", "name": "DeepSeek R1", "family": "deepseek", "strengths": "Complex reasoning, math, logic", "supports_harnesses": ["reasoning_scaffold", "meta_cognitive", "constraint_satisfaction", "debate"]},
    {"id": "gpt-4o", "name": "GPT-4o", "family": "openai", "strengths": "Multimodal, creative writing", "supports_harnesses": ["reasoning_scaffold", "meta_cognitive", "constraint_satisfaction"]},
    {"id": "claude-3-5-sonnet", "name": "Claude 3.5 Sonnet", "family": "anthropic", "strengths": "Long-form reasoning, safety", "supports_harnesses": ["reasoning_scaffold", "meta_cognitive", "debate"]},
    {"id": "llama-3.1-8b", "name": "Llama 3.1 8B", "family": "meta", "strengths": "Local deployment, fast inference", "supports_harnesses": ["reasoning_scaffold", "meta_cognitive"]},
    {"id": "midjourney", "name": "Midjourney", "family": "midjourney", "strengths": "Image generation, artistic", "supports_harnesses": ["constraint_satisfaction"]},
    {"id": "stable-diffusion", "name": "Stable Diffusion", "family": "stability", "strengths": "Open source image gen", "supports_harnesses": ["constraint_satisfaction"]},
]


@router.get("")
async def list_models(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ModelTemplate))
    db_models = result.scalars().all()
    if db_models:
        return [
            {
                "id": m.model_name,
                "name": m.model_name.replace("-", " ").title(),
                "family": m.model_family,
                "strengths": m.reasoning_style or "General purpose",
                "supports_harnesses": ["reasoning_scaffold", "meta_cognitive", "code_execution", "constraint_satisfaction", "debate"],
            }
            for m in db_models
        ]
    return DEFAULT_MODELS
