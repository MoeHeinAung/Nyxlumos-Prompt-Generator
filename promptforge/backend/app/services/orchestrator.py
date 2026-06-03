import logging
from app.services.harnesses import (
    BaseHarness, ReasoningScaffoldHarness, MetaCognitiveHarness,
    ConstraintSatisfactionHarness, CodeExecutionHarness, DebateHarness,
)

logger = logging.getLogger(__name__)


class HarnessOrchestrator:
    def __init__(self):
        self.registry: dict[str, BaseHarness] = {
            "reasoning_scaffold": ReasoningScaffoldHarness(),
            "meta_cognitive": MetaCognitiveHarness(),
            "constraint_satisfaction": ConstraintSatisfactionHarness(),
            "code_execution": CodeExecutionHarness(),
            "debate": DebateHarness(),
        }

    async def run(self, session: dict, enabled_harnesses: list[str]) -> dict:
        results = {}
        ordered = self._resolve_order(session.get("extracted_intent", {}), enabled_harnesses)
        for harness_name in ordered:
            harness = self.registry.get(harness_name)
            if harness:
                try:
                    results[harness_name] = await harness.apply(session)
                except Exception as e:
                    logger.error(f"Harness '{harness_name}' failed: {e}")
                    results[harness_name] = f"[ERROR] {e}"
        return results

    def _resolve_order(self, intent: dict, enabled: list[str]) -> list[str]:
        priority = [
            "reasoning_scaffold", "constraint_satisfaction",
            "meta_cognitive", "debate", "code_execution",
        ]
        return [h for h in priority if h in enabled]

    async def validate_code(self, session: dict, code: str, language: str = "python") -> dict:
        code_harness = self.registry.get("code_execution")
        if code_harness and isinstance(code_harness, CodeExecutionHarness):
            return await code_harness.validate(code, language)
        return {"success": True, "output": "No code harness available", "errors": ""}


harness_orchestrator = HarnessOrchestrator()
