import logging
from typing import Optional
from openai import OpenAI
from app.config import get_deepseek_client, DEEPSEEK_CHAT_MODEL
from app.database import async_session_factory, BurmeseGlossary
from app.utils.burmese_utils import contains_burmese, sanitize_burmese
from sqlalchemy import select

logger = logging.getLogger(__name__)


class TranslatorService:
    def __init__(self, client: Optional[OpenAI] = None):
        self.client = client or get_deepseek_client()

    async def translate(self, text: str, source_lang: str = "auto", target_lang: str = "en") -> dict:
        warnings: list[str] = []
        was_burmese = contains_burmese(text)
        confidence = 1.0

        if not was_burmese and source_lang == "auto":
            return {
                "translated_text": text,
                "confidence": 1.0,
                "was_burmese": False,
                "warnings": [],
            }

        if was_burmese:
            text = sanitize_burmese(text)
            glossary_matches = await self._lookup_glossary(text)
            glossary_context = ""
            if glossary_matches:
                glossary_context = "\nRelevant technical terms:\n" + "\n".join(
                    f"- {g['burmese_term']} = {g['english_term']} ({g.get('domain', '')})"
                    for g in glossary_matches
                )

        try:
            system_prompt = (
                "You are a precise Burmese-to-English translator. "
                "Preserve technical terms. Output ONLY the translation, no explanations."
            )
            response = self.client.chat.completions.create(
                model=DEEPSEEK_CHAT_MODEL,
                temperature=0.1,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"{text}{glossary_context if was_burmese else ''}"},
                ],
            )
            translated = response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Translation API error: {e}")
            translated = text
            confidence = 0.5
            warnings.append(f"Translation service error: {str(e)}")

        if was_burmese:
            confidence = min(confidence, 0.9)
            if contains_burmese(translated):
                confidence = 0.7
                warnings.append("Translation may contain residual Burmese text")

        if confidence < 0.85:
            warnings.append("Low translation confidence. Please verify the translation.")

        return {
            "translated_text": translated,
            "confidence": confidence,
            "was_burmese": was_burmese,
            "warnings": warnings,
        }

    async def _lookup_glossary(self, text: str) -> list[dict]:
        results = []
        async with async_session_factory() as db:
            result = await db.execute(select(BurmeseGlossary))
            all_terms = result.scalars().all()
            for term in all_terms:
                if term.burmese_term in text:
                    results.append({
                        "burmese_term": term.burmese_term,
                        "english_term": term.english_term,
                        "domain": term.domain,
                    })
        return results


translator_service = TranslatorService()
