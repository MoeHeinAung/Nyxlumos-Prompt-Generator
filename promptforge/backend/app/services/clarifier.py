import json
import logging
from typing import Optional
from openai import AsyncOpenAI
from app.config import get_deepseek_client, DEEPSEEK_CHAT_MODEL

logger = logging.getLogger(__name__)


class ClarifierService:
    def __init__(self, client: Optional[AsyncOpenAI] = None):
        self._client = client

    def _get_client(self):
        if self._client is None:
            self._client = get_deepseek_client()
        return self._client

    async def generate_questions(self, intent: dict, missing_info: list) -> list[dict]:
        if not missing_info:
            return []
        questions = []
        for field in missing_info[:5]:
            try:
                response = await self._get_client().chat.completions.create(
                    model=DEEPSEEK_CHAT_MODEL,
                    temperature=0.7,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "Given the user wants to generate a prompt for: "
                                f"{intent.get('primary_intent', '')}, "
                                f"and we need to know about: {field}. "
                                "Generate 3 specific, concrete multiple-choice options "
                                "and 1 'Other (specify)' option. "
                                "Output ONLY valid JSON: "
                                '{"question": "string", "options": ["A", "B", "C", "Other (specify)"], '
                                '"allows_custom": true, "context": "string"}.'
                            ),
                        },
                    ],
                )
                content = response.choices[0].message.content.strip()
                q_data = json.loads(self._clean_json(content))
                q_data["id"] = f"q{len(questions) + 1}"
                q_data["field"] = field
                questions.append(q_data)
            except Exception as e:
                logger.error(f"Question generation error for field '{field}': {e}")
                questions.append({
                    "id": f"q{len(questions) + 1}",
                    "field": field,
                    "question": f"Please specify more about: {field}",
                    "options": ["Option A", "Option B", "Option C", "Other (specify)"],
                    "allows_custom": True,
                    "context": f"We need more detail about {field} to generate a precise prompt.",
                })
        return questions

    @staticmethod
    def _clean_json(content: str) -> str:
        content = content.strip()
        if content.startswith("```"):
            lines = content.split("\n")
            lines = lines[1:] if len(lines) > 1 else lines
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            content = "\n".join(lines)
        return content


clarifier_service = ClarifierService()
