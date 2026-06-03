import asyncio
import logging
import os

logger = logging.getLogger(__name__)


class BaseHarness:
    name: str = "base"

    async def apply(self, session: dict) -> str:
        raise NotImplementedError


class ReasoningScaffoldHarness(BaseHarness):
    name = "reasoning_scaffold"

    async def apply(self, session: dict) -> str:
        intent = session.get("extracted_intent", {})
        complexity = intent.get("complexity_score", 2)
        if complexity == 5:
            return (
                "[REASONING MODE: Graph-of-Thought]\n"
                "Maintain a reasoning graph. Each node is a thought. "
                "Use [Action] and [Observation] cycles. "
                "Verify consistency across branches. Backtrack if contradictions found.\n"
            )
        elif complexity >= 4:
            return (
                "[REASONING MODE: Tree-of-Thought]\n"
                "Consider 3 distinct approaches. Evaluate each with pros/cons. "
                "Score each path. Select optimal and justify rejection of others.\n"
            )
        elif complexity >= 3:
            return (
                "[REASONING MODE: Chain-of-Thought]\n"
                "Think step by step. State assumptions explicitly. "
                "Verify each step before proceeding.\n"
            )
        return ""


class MetaCognitiveHarness(BaseHarness):
    name = "meta_cognitive"

    async def apply(self, session: dict) -> str:
        return (
            "[SELF-CRITIQUE PROTOCOL]\n"
            "Before finalizing your answer:\n"
            "1. Draft a preliminary response internally.\n"
            "2. Critique it: What did I miss? What assumptions did I make? Are there edge cases?\n"
            "3. Check for logical fallacies or security vulnerabilities.\n"
            "4. Rewrite the final response incorporating the critique.\n"
            "5. Mark uncertain claims with [UNCERTAIN].\n"
            "6. Provide confidence score (1-10).\n"
            "7. Include a 'What Could Go Wrong' section.\n"
        )


class ConstraintSatisfactionHarness(BaseHarness):
    name = "constraint_satisfaction"

    async def apply(self, session: dict) -> str:
        intent = session.get("extracted_intent", {})
        constraints = intent.get("constraints", [])
        hard = [f"- {c.get('field', c)}" for c in constraints if isinstance(c, dict) and c.get("severity") == "required"]
        soft = [f"- {c.get('field', c)} (weight: {c.get('weight', 1)})" for c in constraints if isinstance(c, dict) and c.get("severity") != "required"]
        if not hard and not soft:
            hard = ["- Accuracy", "- Completeness", "- Clarity"]
            soft = ["- Efficiency (weight: 2)", "- Conciseness (weight: 1)"]
        return (
            "[DECISION ANALYSIS MODE]\n"
            "Evaluate all options using this constraint matrix:\n\n"
            f"HARD CONSTRAINTS (must satisfy, disqualify if violated):\n{chr(10).join(hard)}\n\n"
            f"SOFT CONSTRAINTS (weighted scoring):\n{chr(10).join(soft)}\n\n"
            "OUTPUT FORMAT:\n"
            "1. Options Considered Table\n"
            "2. Scoring Matrix (1-10 per constraint per option)\n"
            "3. Weighted Totals\n"
            "4. Top Recommendation\n"
            "5. Sensitivity Analysis\n"
            "6. Risk Assessment\n"
        )


class CodeExecutionHarness(BaseHarness):
    name = "code_execution"

    async def apply(self, session: dict) -> str:
        intent = session.get("extracted_intent", {})
        lang = intent.get("output_type", "python")
        return (
            f"[CODE GENERATION MODE]\n"
            f"Language: {lang}\n"
            f"Write complete, production-ready code with error handling. "
            f"Include tests as part of the output.\n"
        )

    async def validate(self, code: str, language: str = "python") -> dict:
        if not os.getenv("ENABLE_CODE_EXECUTION", "false").lower() in ("true", "1", "yes"):
            return {"success": True, "output": "Code execution disabled by config.", "errors": ""}
        if language not in ("python", "py"):
            return {"success": True, "output": "Non-Python code skipped validation.", "errors": ""}
        try:
            proc = await asyncio.create_subprocess_exec(
                "python", "-c", code,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10.0)
            except asyncio.TimeoutError:
                proc.kill()
                return {"success": False, "output": "Execution timed out after 10 seconds.", "errors": "TimeoutError"}
            return {
                "success": proc.returncode == 0,
                "output": stdout.decode(errors="replace")[:5000],
                "errors": stderr.decode(errors="replace")[:5000],
            }
        except Exception as e:
            return {"success": False, "output": "", "errors": str(e)}


class DebateHarness(BaseHarness):
    name = "debate"

    async def apply(self, session: dict) -> str:
        base_prompt = session.get("generated_prompt", "")
        try:
            from app.config import get_deepseek_client, DEEPSEEK_CHAT_MODEL
            client = get_deepseek_client()
            architect = await client.chat.completions.create(
                model=DEEPSEEK_CHAT_MODEL,
                temperature=0.3,
                messages=[
                    {"role": "system", "content": "You are an expert prompt architect. Draft the optimal prompt."},
                    {"role": "user", "content": f"Draft the best prompt for this task: {session.get('original_input', base_prompt)}"},
                ],
            )
            arch_text = architect.choices[0].message.content
            critic = await client.chat.completions.create(
                model=DEEPSEEK_CHAT_MODEL,
                temperature=0.3,
                messages=[
                    {"role": "system", "content": "You are a critical reviewer. Find flaws, ambiguities, and missing constraints."},
                    {"role": "user", "content": f"Critique this prompt:\n{arch_text}"},
                ],
            )
            crit_text = critic.choices[0].message.content
            refiner = await client.chat.completions.create(
                model=DEEPSEEK_CHAT_MODEL,
                temperature=0.3,
                messages=[
                    {"role": "system", "content": "You are a prompt engineer. Fix the flaws identified."},
                    {"role": "user", "content": f"Fix these flaws:\n{crit_text}\n\nOriginal:\n{arch_text}"},
                ],
            )
            ref_text = refiner.choices[0].message.content
            judge = await client.chat.completions.create(
                model=DEEPSEEK_CHAT_MODEL,
                temperature=0.2,
                messages=[
                    {"role": "system", "content": "Select the superior prompt and output only the final version."},
                    {"role": "user", "content": f"Select the best or merge. A: {ref_text}\nB: {arch_text}"},
                ],
            )
            return judge.choices[0].message.content
        except Exception as e:
            logger.error(f"DebateHarness error: {e}")
            return base_prompt
