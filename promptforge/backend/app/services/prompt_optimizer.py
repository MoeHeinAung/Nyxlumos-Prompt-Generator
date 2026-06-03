import logging
from typing import Optional
from openai import OpenAI
from app.config import get_deepseek_client, DEEPSEEK_CHAT_MODEL, DEEPSEEK_REASONER_MODEL
from app.database import async_session_factory, ModelTemplate
from sqlalchemy import select

logger = logging.getLogger(__name__)


class PromptOptimizer:
    def __init__(self, client: Optional[OpenAI] = None):
        self.client = client or get_deepseek_client()

    async def get_model_template(self, model_name: str) -> Optional[dict]:
        async with async_session_factory() as db:
            result = await db.execute(select(ModelTemplate).where(ModelTemplate.model_name == model_name))
            template = result.scalar_one_or_none()
            if template:
                return {
                    "model_name": template.model_name,
                    "model_family": template.model_family,
                    "syntax_rules": template.syntax_rules,
                    "meta_prompt_template": template.meta_prompt_template,
                    "reasoning_style": template.reasoning_style,
                }
        return None

    async def generate_prompt(
        self,
        session: dict,
        model_template: dict,
        harness_outputs: dict,
        use_reasoner: bool = False,
    ) -> dict:
        intent = session.get("extracted_intent") or {}
        classification = session.get("classification") or {}
        answers = session.get("answers") or {}
        template_str = model_template.get("meta_prompt_template", "{task}")
        reasoning_trace_parts = []

        role = intent.get("domain", "an expert")
        task = intent.get("primary_intent", session.get("original_input", ""))
        context_parts = []
        for key, value in answers.items():
            context_parts.append(f"- {key}: {value}")
        context = "\n".join(context_parts) if context_parts else "No additional context provided."
        requirements = model_template.get("syntax_rules", "Be clear and comprehensive.")
        fmt = f"Output format: {intent.get('output_type', 'text')}"

        constraints_list = intent.get("constraints", [])
        constraints = "\n".join(
            f"- {c.get('field', c)}: {c.get('severity', 'required')}"
            for c in (constraints_list if isinstance(constraints_list, list) else [])
        ) if constraints_list else "None specified."

        harness_prefix = "\n\n".join(
            f"### {name.upper()} OUTPUT ###\n{output}"
            for name, output in harness_outputs.items()
            if output
        )

        system_prompt = (
            "You are a world-class prompt engineer. Craft precise, optimized prompts "
            "tailored to the target AI model. Follow the template and harness guidance exactly."
        )
        user_prompt = (
            f"Using this template:\n{template_str}\n\n"
            f"Fill these variables:\n"
            f"role: {role}\n"
            f"task: {task}\n"
            f"context: {context}\n"
            f"requirements: {requirements}\n"
            f"format: {fmt}\n"
            f"constraints: {constraints}\n"
        )
        if harness_prefix:
            user_prompt += f"\n\nIncorporate these harness outputs:\n{harness_prefix}"
        user_prompt += "\n\nGenerate ONLY the final optimized prompt. No meta-commentary."

        model = DEEPSEEK_REASONER_MODEL if use_reasoner else DEEPSEEK_CHAT_MODEL
        try:
            response = self.client.chat.completions.create(
                model=model,
                temperature=0.3,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            final_prompt = response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Prompt generation error: {e}")
            final_prompt = user_prompt

        reasoning_trace = "\n\n".join(reasoning_trace_parts) if reasoning_trace_parts else "Direct generation, no trace."
        return {
            "final_prompt": final_prompt,
            "reasoning_trace": reasoning_trace,
            "model_used": model,
        }


prompt_optimizer = PromptOptimizer()
