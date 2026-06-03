import json
import logging
from typing import Optional
from openai import AsyncOpenAI
from app.config import get_deepseek_client, DEEPSEEK_CHAT_MODEL
from app.utils.events import event_bus

logger = logging.getLogger(__name__)


class IntentEngine:
    def __init__(self, client: Optional[AsyncOpenAI] = None):
        self._client = client

    def _get_client(self):
        if self._client is None:
            self._client = get_deepseek_client()
        return self._client

    async def extract(self, translated_text: str) -> dict:
        system_prompt = (
            "Extract structured intent from user request. Output ONLY valid JSON with these fields: "
            "primary_intent (string), domain (string), entities (list of {name, type}), "
            "constraints (list of {field, severity: 'required'|'preferred', weight}), "
            "missing_info (list of string), complexity_score (integer 1-5), "
            "scope (string), output_type (string)."
        )
        try:
            response = await self._get_client().chat.completions.create(
                model=DEEPSEEK_CHAT_MODEL,
                temperature=0.2,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": translated_text},
                ],
            )
            content = response.choices[0].message.content.strip()
            content = self._clean_json(content)
            result = json.loads(content)
        except Exception as e:
            logger.error(f"Intent extraction error: {e}")
            result = {
                "primary_intent": translated_text[:100],
                "domain": "general",
                "entities": [],
                "constraints": [],
                "missing_info": ["purpose", "target_audience", "format"],
                "complexity_score": 2,
                "scope": "general",
                "output_type": "text",
            }

        classification = self._classify(result)
        result = self._recommend_harnesses(result)

        await event_bus.publish("IntentExtracted", {"intent": result, "classification": classification})

        return {"intent": result, "classification": classification}

    def _classify(self, intent: dict) -> dict:
        primary = intent.get("primary_intent", "").lower()
        domain = intent.get("domain", "").lower()
        categories = []
        if any(k in primary for k in ["code", "program", "function", "api", "build", "develop", "implement"]):
            categories.append("code_generation")
        if any(k in primary for k in ["choose", "decide", "select", "best", "compare"]):
            categories.append("decision_support")
        if any(k in primary for k in ["explain", "summarize", "describe", "what", "how"]):
            categories.append("explanation")
        if any(k in primary for k in ["create", "generate", "write", "design", "build", "make"]):
            categories.append("creative_generation")
        if any(k in primary for k in ["analyze", "evaluate", "assess", "review", "audit"]):
            categories.append("analysis")
        return {
            "categories": categories or ["general"],
            "domain": domain,
            "complexity_score": intent.get("complexity_score", 2),
            "scope": intent.get("scope", "general"),
        }

    def _recommend_harnesses(self, intent: dict) -> dict:
        primary = intent.get("primary_intent", "").lower()
        complexity = intent.get("complexity_score", 2)
        recommended = []
        if complexity >= 4:
            recommended.extend(["reasoning_scaffold", "meta_cognitive"])
        elif complexity >= 3:
            recommended.append("reasoning_scaffold")
        if any(k in primary for k in ["code", "program", "function", "api", "build", "develop", "implement"]):
            if "code_execution" not in recommended:
                recommended.append("code_execution")
        if any(k in primary for k in ["choose", "decide", "select", "best"]):
            recommended.append("constraint_satisfaction")
        intent["recommended_harness"] = recommended
        return intent

    @staticmethod
    def _clean_json(content: str) -> str:
        content = content.strip()
        if content.startswith("```"):
            lines = content.split("\n")
            lines = lines[1:] if len(lines) > 1 else lines
            if lines[-1].strip() == "```":
                lines = lines[:-1]
            content = "\n".join(lines)
        return content


intent_engine = IntentEngine()
