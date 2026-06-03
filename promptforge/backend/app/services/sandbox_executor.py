import asyncio
import logging

logger = logging.getLogger(__name__)


class SandboxExecutor:
    MAX_TIMEOUT = 10.0
    MAX_OUTPUT = 10000

    async def execute(self, code: str, language: str = "python") -> dict:
        if language not in ("python", "py"):
            return {"success": True, "output": f"Sandbox execution skipped for language: {language}", "errors": ""}
        try:
            proc = await asyncio.create_subprocess_exec(
                "python", "-c", code,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=self.MAX_TIMEOUT)
            except asyncio.TimeoutError:
                proc.kill()
                return {"success": False, "output": "Execution timed out after 10 seconds.", "errors": "TimeoutError"}
            return {
                "success": proc.returncode == 0,
                "output": stdout.decode(errors="replace")[:self.MAX_OUTPUT],
                "errors": stderr.decode(errors="replace")[:self.MAX_OUTPUT],
            }
        except Exception as e:
            logger.error(f"Sandbox execution error: {e}")
            return {"success": False, "output": "", "errors": str(e)}

    async def validate_with_retry(self, code: str, language: str = "python", max_attempts: int = 3) -> dict:
        attempt = 0
        current_code = code
        last_result = None
        while attempt < max_attempts:
            result = await self.execute(current_code, language)
            last_result = result
            if result["success"]:
                return result
            attempt += 1
            if attempt < max_attempts:
                current_code = await self._fix_code(current_code, result["errors"], language)
        return last_result or {"success": False, "output": "", "errors": "Max attempts exceeded"}

    async def _fix_code(self, code: str, errors: str, language: str) -> str:
        try:
            from app.config import get_deepseek_client, DEEPSEEK_CHAT_MODEL
            client = get_deepseek_client()
            response = client.chat.completions.create(
                model=DEEPSEEK_CHAT_MODEL,
                temperature=0.2,
                messages=[
                    {"role": "system", "content": "You fix code errors. Return only the corrected code, no explanations."},
                    {"role": "user", "content": f"The following code failed:\n{code}\n\nErrors:\n{errors}\n\nFix all errors. Output only the corrected code."},
                ],
            )
            fixed = response.choices[0].message.content.strip()
            if fixed.startswith("```"):
                lines = fixed.split("\n")
                lines = lines[1:]
                if lines[-1].strip() == "```":
                    lines = lines[:-1]
                fixed = "\n".join(lines)
            return fixed
        except Exception as e:
            logger.error(f"Code fix error: {e}")
            return code


sandbox_executor = SandboxExecutor()
