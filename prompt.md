You are an elite full-stack software architect and principal engineer. Your task is to build a complete, production-grade desktop application called **"PromptForge"** — a professional AI prompt generator with an interactive clarification engine, multi-model optimization, and an advanced harness system for coding/logical reasoning.

You will build this as a local desktop app using a React frontend and Python FastAPI backend, bridged via a local HTTP server. The AI backbone is the DeepSeek API (via OpenAI-compatible endpoint), with local model fallback support via Ollama/LiteLLM.

You must implement EVERY feature described below. Do not skip components. Do not use placeholders. Every button must be functional. Every API endpoint must be wired. Build the complete, runnable application within a local Python virtual environment.

---

## 1. PROJECT STRUCTURE

```
promptforge/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI entry
│   │   ├── config.py               # Settings & env
│   │   ├── database.py             # SQLite + SQLAlchemy setup
│   │   ├── models/                 # SQLAlchemy models
│   │   ├── schemas/                # Pydantic schemas
│   │   ├── routers/
│   │   │   ├── sessions.py         # Clarification FSM
│   │   │   ├── translate.py        # Burmese translation
│   │   │   ├── generate.py         # Prompt generation & harnesses
│   │   │   ├── history.py          # Saved prompts
│   │   │   └── analytics.py        # Analytics Dashboard API
│   │   ├── services/
│   │   │   ├── translator.py       # DeepSeek/NLLB translation
│   │   │   ├── intent_engine.py    # Intent extraction + classification
│   │   │   ├── clarifier.py        # Gap analysis + MCQ generation
│   │   │   ├── orchestrator.py     # Harness Orchestrator
│   │   │   ├── prompt_optimizer.py # Model-specific tailoring
│   │   │   └── sandbox_executor.py # Code execution (Isolated)
│   │   └── utils/
│   │       ├── fsm.py              # Finite State Machine
│   │       ├── events.py           # In-memory Event Bus
│   │       └── burmese_utils.py    # Unicode normalization
│   ├── requirements.txt
│   └── alembic/                    # Migrations
├── frontend/
│   ├── src/
│   │   ├── main.tsx                # Entry
│   │   ├── App.tsx                 # Root + routing
│   │   ├── components/
│   │   │   ├── hud/                # Sci-fi HUD primitives
│   │   │   │   ├── HUDPanel.tsx
│   │   │   │   ├── HUDButton.tsx
│   │   │   │   ├── HUDTerminal.tsx
│   │   │   │   ├── HUDProgress.tsx
│   │   │   │   └── NeonText.tsx
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── TopBar.tsx
│   │   │   ├── workflow/
│   │   │   │   ├── InputPanel.tsx
│   │   │   │   ├── TranslationBadge.tsx
│   │   │   │   ├── ClarificationWizard.tsx
│   │   │   │   ├── IntentCard.tsx
│   │   │   │   ├── ModelSelector.tsx
│   │   │   │   ├── HarnessPanel.tsx
│   │   │   │   ├── PromptOutput.tsx
│   │   │   │   └── CodePreview.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── AnalyticsDashboard.tsx
│   │   │   └── modals/
│   │   │       ├── ExportModal.tsx
│   │   │       └── SettingsModal.tsx
│   │   ├── hooks/
│   │   │   ├── useSession.ts
│   │   │   ├── useSSE.ts
│   │   │   └── useHarness.ts
│   │   ├── stores/
│   │   │   └── sessionStore.ts     # Zustand
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── styles/
│   │   │   ├── global.scss
│   │   │   ├── hud.scss
│   │   │   └── theme.ts
│   │   └── api/
│   │       └── client.ts
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

---

## 2. TECHNOLOGY STACK (Exact Versions)

**Backend:**
- Python 3.11+
- FastAPI 0.115+
- SQLAlchemy 2.0+ (async)
- `aiosqlite` (for SQLite async compatibility)
- Pydantic 2.5+
- OpenAI Python SDK 1.35+ (for DeepSeek API)
- LiteLLM 1.40+ (model routing)
- Instructor 1.0+ (structured outputs)

**Frontend:**
- React 18.3 + TypeScript 5.3
- Vite 5.0
- Tailwind CSS 3.4
- Framer Motion 11.0
- Recharts (Analytics Dashboard charts)
- Zustand 4.5
- TanStack Query 5.0
- React Hook Form 7.51 + Zod 3.22
- Lucide React 0.344
- Orbitron + JetBrains Mono + Noto Sans Myanmar fonts

**Environment:**
- Local Python Virtual Environment (`venv`) — no Docker, no Tauri, no Electron

**AI Backbone:**
- Primary: DeepSeek API (model: `deepseek-chat` via `https://api.deepseek.com/v1`)
- Fallback: DeepSeek Reasoner (`deepseek-reasoner`) for complex logic
- Local: Ollama with Qwen2.5-7B and Llama-3.1-8B

---

## 3. DATABASE SCHEMA (SQLite3)

Use SQLAlchemy async ORM with `aiosqlite`. No PostgreSQL, no Redis. Session state is stored in the `session_state` table.

```sql
-- sessions (active clarification FSM states)
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    current_state TEXT NOT NULL DEFAULT 'S1_INGEST',
    original_input TEXT,
    translated_input TEXT,
    detected_language TEXT,
    extracted_intent JSON,
    classification JSON,
    target_model TEXT,
    selected_harnesses JSON DEFAULT '[]',
    answers JSON DEFAULT '{}',
    pending_questions JSON DEFAULT '[]',
    generated_prompt TEXT,
    final_output TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- session_state (replaces Redis — in-database KV store)
CREATE TABLE session_state (
    session_id TEXT PRIMARY KEY REFERENCES sessions(id),
    state_data JSON NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

-- prompts (history)
CREATE TABLE prompts (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES sessions(id),
    title TEXT,
    original_request TEXT,
    final_prompt TEXT,
    target_model TEXT,
    harnesses_used JSON,
    complexity_score INTEGER,
    scope TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- model_templates (prompt optimization templates)
CREATE TABLE model_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name TEXT UNIQUE NOT NULL,
    model_family TEXT,
    syntax_rules TEXT,
    meta_prompt_template TEXT,
    reasoning_style TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- burmese_glossary (domain terms)
CREATE TABLE burmese_glossary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    burmese_term TEXT NOT NULL,
    english_term TEXT NOT NULL,
    domain TEXT,
    confidence_score REAL DEFAULT 1.0
);

-- Insert default model templates at startup
INSERT INTO model_templates (model_name, model_family, syntax_rules, meta_prompt_template, reasoning_style) VALUES
('deepseek-chat', 'deepseek', 'Markdown, clear sections, bullet points, explicit role assignment', 'You are {role}. {task}\n\n## Context\n{context}\n\n## Requirements\n{requirements}\n\n## Output Format\n{format}', 'chain_of_thought'),
('deepseek-reasoner', 'deepseek', 'Structured reasoning, step-by-step, explicit assumptions', 'Analyze the following problem rigorously. Show your reasoning process clearly before giving the final answer.\n\n{task}\n\n## Constraints\n{constraints}', 'tree_of_thought'),
('gpt-4o', 'openai', 'Markdown, system/user roles, concise but complete', 'You are {role}. {task}\n\nContext: {context}\nRequirements: {requirements}', 'direct'),
('claude-3-5-sonnet', 'anthropic', 'XML tags, polite tone, detailed context, <thinking> blocks', '<thinking>\nAnalyze: {task}\nConstraints: {constraints}\n</thinking>\n\n<output>\n{format_instructions}\n</output>', 'chain_of_thought'),
('llama-3.1-8b', 'meta', 'System prompt strictness, explicit reasoning requests, markdown', 'System: You are {role}. Provide detailed, accurate responses.\n\nUser: {task}\n\nRequirements: {requirements}\nFormat: {format}', 'step_by_step'),
('midjourney', 'midjourney', 'Comma-separated descriptors, no prose, parameter flags', '{subject}, {style}, {lighting}, {camera}, {mood} --ar {aspect_ratio} --stylize {stylize} --v 6', 'direct'),
('stable-diffusion', 'stability', 'Comma-separated, weighted terms (parentheses), negative prompt section', 'Positive: {subject}, ({style}:1.2), {lighting}, {quality_tags}\nNegative: {negative_prompt}\nSteps: {steps}, CFG: {cfg}', 'direct');
```

---

## 4. ADVANCED FEATURES

### Event-Driven Architecture (In-Memory)
Implement `EventBus` in `utils/events.py` using `asyncio.Queue` for decoupled communication between services. Services publish and subscribe to events without direct coupling.

Critical events that must be implemented:
- `SessionCreated` — fired after S1_INGEST completes.
- `TranslationCompleted` — fired after S2_TRANSLATE completes.
- `IntentExtracted` — fired after S3_EXTRACT completes.
- `PromptGenerated` — fired after S10_GENERATE completes.

```python
class EventBus:
    def __init__(self):
        self._queue: asyncio.Queue = asyncio.Queue()
        self._subscribers: dict[str, list[Callable]] = {}

    async def publish(self, event_name: str, payload: dict):
        await self._queue.put({"event": event_name, "payload": payload})

    def subscribe(self, event_name: str, handler: Callable):
        self._subscribers.setdefault(event_name, []).append(handler)

    async def process(self):
        while True:
            event = await self._queue.get()
            for handler in self._subscribers.get(event["event"], []):
                await handler(event["payload"])
```

### Dynamic Harness Orchestration
Replace hardcoded harness execution order with a `HarnessOrchestrator` in `services/orchestrator.py`. The Orchestrator:
1. Maintains a registry of all available harnesses (ReasoningScaffold, MetaCognitive, ConstraintSatisfaction, CodeExecution, Debate).
2. Queries the registry and dynamically orders harness execution based on the session's intent analysis.
3. Exposes a `run(session, enabled_harnesses)` async method that the `/generate` router calls.

```python
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
        ordered = self._resolve_order(session["extracted_intent"], enabled_harnesses)
        for harness_name in ordered:
            harness = self.registry[harness_name]
            results[harness_name] = await harness.apply(session)
        return results

    def _resolve_order(self, intent: dict, enabled: list[str]) -> list[str]:
        # Priority: reasoning first, code last (needs clean prompt to validate)
        priority = ["reasoning_scaffold", "constraint_satisfaction", "meta_cognitive", "debate", "code_execution"]
        return [h for h in priority if h in enabled]
```

### Analytics Dashboard
New backend API at `/api/v1/analytics` and a dedicated `AnalyticsDashboard` frontend component. Must expose and visualize:
- **Session trends** — number of sessions created per day (last 30 days).
- **Model usage frequency** — bar chart of how often each target model is selected.
- **Harness success rates** — pie/bar chart of which harnesses are enabled most and their pass/fail rates.
- **Complexity distribution** — histogram of complexity scores (1-5) across all prompts.

Use Recharts for all charts in the frontend.

---

## 5. BACKEND API SPECIFICATION (FastAPI)

Implement these EXACT routers and endpoints:

### `/api/v1/translate`
```python
POST /translate
Body: {"text": "string", "source_lang": "auto", "target_lang": "en"}
Response: {"translated_text": "string", "confidence": float, "was_burmese": bool, "warnings": ["string"]}

Logic:
1. Detect if text contains Burmese unicode (\u1000-\u109F).
2. If Burmese:
   - Normalize unicode using burmese_utils (handle Zawgyi→Unicode conversion).
   - Check burmese_glossary table for domain term matches.
   - Call DeepSeek API with system prompt: "You are a precise Burmese-to-English translator. Preserve technical terms. Output ONLY the translation, no explanations."
3. If already English: return as-is.
4. Confidence score: 0.0–1.0. If < 0.85, include warning.
```

### `/api/v1/sessions`
```python
POST /sessions
Body: {"original_input": "string", "language": "my|en"}
Response: {"session_id": "uuid", "current_state": "S2_TRANSLATE", "next_action": "translate"}

GET /sessions/{session_id}
Response: Full session object

POST /sessions/{session_id}/advance
Body: {"user_input": "any"}
Response: {"session_id": "uuid", "current_state": "string", "data": {...}, "next_action": "string"}
```

### `/api/v1/intent`
```python
POST /intent/extract
Body: {"session_id": "uuid", "translated_text": "string"}
Response: {"intent": {...}, "classification": {...}}

Logic:
1. Use DeepSeek API with JSON mode (via Instructor).
2. System prompt: "Extract structured intent from user request. Output JSON with: primary_intent, domain, entities, constraints, missing_info[], complexity_score (1-5), scope, output_type."
3. If complexity >= 4, set recommended_harness = ["reasoning_scaffold", "meta_cognitive"].
4. If intent contains "code", "program", "function", "API", "build", set recommended_harness += ["code_execution"].
5. If intent contains "choose", "decide", "select", "best", set recommended_harness += ["constraint_satisfaction"].
6. Fire IntentExtracted event via EventBus.
```

### `/api/v1/clarify`
```python
POST /clarify/generate-questions
Body: {"session_id": "uuid", "missing_info": [...]}
Response: {"questions": [{"id": "q1", "question": "string", "options": ["A", "B", "C", "Other"], "allows_custom": true, "context": "string"}]}

Logic:
1. For each missing_info field, call DeepSeek with:
   "Given the user wants [intent], and we need to know [field], generate 3 specific multiple-choice options and 1 'Other (specify)' option. Make options concrete and actionable. Output JSON."
2. Store questions in session.pending_questions.
3. Return to frontend.
```

### `/api/v1/generate`
```python
POST /generate
Body: {"session_id": "uuid", "target_model": "string", "enabled_harnesses": ["string"]}
Response: {"final_prompt": "string", "reasoning_trace": "string", "validation_result": {...}}

Logic:
1. Load session (intent, answers, classification).
2. Fetch model_template for target_model from SQLite.
3. Call HarnessOrchestrator.run(session, enabled_harnesses) to get ordered harness outputs.
4. Fill template variables: {role}, {task}, {context}, {requirements}, {format}, {constraints}.
5. Call DeepSeek to generate the final optimized prompt.
6. If code_execution harness is enabled:
   - Extract code from generated prompt.
   - Run in sandbox (isolated subprocess, no network, resource limits).
   - Run tests. If fail, feed errors back to DeepSeek: "Fix this code. Errors: {stderr}".
   - Max 3 correction attempts.
7. Save to prompts table.
8. Fire PromptGenerated event via EventBus.
9. Return final prompt + reasoning trace + validation result.
```

### `/api/v1/models`
```python
GET /models
Response: [{"id": "deepseek-chat", "name": "DeepSeek V3", "family": "deepseek", "strengths": "General reasoning, coding", "supports_harnesses": ["reasoning", "meta_cognitive", "code"]}, ...]
```

### `/api/v1/history`
```python
GET /history?limit=20&offset=0
POST /history/{id}/delete
```

### `/api/v1/analytics`
```python
GET /analytics/sessions?days=30
Response: {"daily_counts": [{"date": "2025-01-01", "count": 12}, ...]}

GET /analytics/models
Response: {"model_usage": [{"model": "deepseek-chat", "count": 45}, ...]}

GET /analytics/harnesses
Response: {"harness_stats": [{"harness": "reasoning_scaffold", "enabled_count": 30, "pass_rate": 0.93}, ...]}

GET /analytics/complexity
Response: {"distribution": [{"score": 1, "count": 5}, {"score": 2, "count": 12}, ...]}
```

---

## 6. FINITE STATE MACHINE (FSM)

Implement this exact state machine in `utils/fsm.py`. State is persisted in the `session_state` SQLite table with a 30-minute expiry.

```python
class PromptForgeFSM:
    STATES = [
        "S1_INGEST", "S2_TRANSLATE", "S3_EXTRACT",
        "S4_GAP_ANALYSIS", "S5_CLARIFY", "S6_CLASSIFY",
        "S7_MODEL_SELECT", "S8_HARNESS_SELECT", "S9_OPTIMIZE",
        "S10_GENERATE", "S11_VALIDATE", "S12_EXPORT"
    ]

    TRANSITIONS = {
        "S1_INGEST": "S2_TRANSLATE",
        "S2_TRANSLATE": "S3_EXTRACT",
        "S3_EXTRACT": "S4_GAP_ANALYSIS",
        "S4_GAP_ANALYSIS": lambda session: "S5_CLARIFY" if session["pending_questions"] else "S6_CLASSIFY",
        "S5_CLARIFY": lambda session: "S5_CLARIFY" if session["pending_questions"] else "S6_CLASSIFY",
        "S6_CLASSIFY": "S7_MODEL_SELECT",
        "S7_MODEL_SELECT": "S8_HARNESS_SELECT",
        "S8_HARNESS_SELECT": "S9_OPTIMIZE",
        "S9_OPTIMIZE": "S10_GENERATE",
        "S10_GENERATE": "S11_VALIDATE",
        "S11_VALIDATE": "S12_EXPORT"
    }
```

Each `POST /sessions/{id}/advance` triggers the next FSM transition and updates both `sessions.current_state` and `session_state.state_data` atomically within a single SQLAlchemy async transaction.

---

## 7. HARNESS SYSTEM (Detailed Implementation)

All harnesses are registered in the `HarnessOrchestrator` and must implement a `BaseHarness` interface.

### Harness 1: ReasoningScaffold
```python
class ReasoningScaffoldHarness(BaseHarness):
    async def apply(self, session: dict) -> str:
        complexity = session["extracted_intent"]["complexity_score"]
        if complexity == 5:
            return "[REASONING MODE: Graph-of-Thought]\nMaintain a reasoning graph. Each node is a thought. Use [Action] and [Observation] cycles. Verify consistency across branches. Backtrack if contradictions found.\n"
        elif complexity == 4:
            return "[REASONING MODE: Tree-of-Thought]\nConsider 3 distinct approaches. Evaluate each with pros/cons. Score each path. Select optimal and justify rejection of others.\n"
        elif complexity == 3:
            return "[REASONING MODE: Chain-of-Thought]\nThink step by step. State assumptions explicitly. Verify each step before proceeding.\n"
        return ""
```

### Harness 2: CodeExecutionHarness
```python
class CodeExecutionHarness(BaseHarness):
    async def validate(self, code: str, language: str) -> dict:
        # Use isolated subprocess with resource constraints, no network
        proc = await asyncio.create_subprocess_exec(
            "python", "-c", code,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10.0)
        except asyncio.TimeoutError:
            proc.kill()
            return {"success": False, "output": "Execution timed out after 10 seconds."}
        return {"success": proc.returncode == 0, "output": stdout.decode(), "errors": stderr.decode()}
```

If validation fails, construct this correction prompt and re-call DeepSeek (max 3 attempts):
```
The following code failed validation:
{code}

Errors:
{stderr}

Fix all errors. Maintain original functionality. Return only the corrected code.
```

### Harness 3: MetaCognitiveHarness
```python
class MetaCognitiveHarness(BaseHarness):
    async def apply(self, session: dict) -> str:
        return """
[SELF-CRITIQUE PROTOCOL]
Before finalizing your answer:
1. Draft a preliminary response internally.
2. Critique it: What did I miss? What assumptions did I make? Are there edge cases?
3. Check for logical fallacies or security vulnerabilities.
4. Rewrite the final response incorporating the critique.
5. Mark uncertain claims with [UNCERTAIN].
6. Provide confidence score (1-10).
7. Include a "What Could Go Wrong" section.
"""
```

### Harness 4: ConstraintSatisfactionHarness
```python
class ConstraintSatisfactionHarness(BaseHarness):
    async def apply(self, session: dict) -> str:
        constraints = session["extracted_intent"].get("constraints", [])
        return f"""
[DECISION ANALYSIS MODE]
Evaluate all options using this constraint matrix:

HARD CONSTRAINTS (must satisfy, disqualify if violated):
{chr(10).join(f"- {c}" for c in constraints if c.get("severity") == "required")}

SOFT CONSTRAINTS (weighted scoring):
{chr(10).join(f"- {c['field']} (weight: {c.get('weight', 1)})" for c in constraints if c.get("severity") != "required")}

OUTPUT FORMAT:
1. Options Considered Table
2. Scoring Matrix (1-10 per constraint per option)
3. Weighted Totals
4. Top Recommendation
5. Sensitivity Analysis
6. Risk Assessment
"""
```

### Harness 5: DebateHarness (Expert Mode)
```python
class DebateHarness(BaseHarness):
    async def apply(self, session: dict) -> str:
        base_prompt = session.get("generated_prompt", "")
        architect = await llm.generate(system="You are an expert prompt architect. Draft the optimal prompt.", user=base_prompt)
        critic = await llm.generate(system="You are a critical reviewer. Find flaws, ambiguities, and missing constraints in this prompt:\n" + architect)
        refiner = await llm.generate(system="You are a prompt engineer. Fix these flaws:\n" + critic + "\n\nOriginal:\n" + architect)
        judge_prompt = f"Select the best prompt or merge them. A: {architect}\nB: {refiner}"
        return await llm.generate(system="You are a judge. Select the superior prompt and output only the final version.", user=judge_prompt)
```

---

## 8. DEEPSEEK API INTEGRATION

Configure in `backend/config.py`:

```python
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
DEEPSEEK_CHAT_MODEL = "deepseek-chat"
DEEPSEEK_REASONER_MODEL = "deepseek-reasoner"

client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)
```

**Usage Patterns:**
1. **Translation:** `temperature=0.1` for deterministic output.
2. **Intent Extraction:** Use `instructor` patch with JSON mode. `temperature=0.2`.
3. **Clarification:** `temperature=0.7` for creative option generation.
4. **Prompt Generation:** `temperature=0.3`.
5. **Complex Reasoning / Code Correction:** Use `deepseek-reasoner`.

**Reliability:** Implement 3 retries with exponential backoff on all DeepSeek calls. If DeepSeek fails entirely, fall back to local Ollama models via LiteLLM.

---

## 9. FRONTEND SPECIFICATION (Sci-Fi HUD)

### Global Theme
- **Color Palette:**
  - Void Black: `#050508`
  - Holographic Cyan: `#00F0FF`
  - Alert Magenta: `#FF0055`
  - Amber Warning: `#FFAA00`
  - Glass White: `rgba(255,255,255,0.03)`
  - Border Glow: `0 0 10px #00F0FF, 0 0 20px rgba(0,240,255,0.3)`
- **Typography:** Orbitron for headers, JetBrains Mono for data/JSON, Inter for body, Noto Sans Myanmar for Burmese text.
- **Animations:** Framer Motion for panel entrances (slide from edges, fade with 0.3s), terminal text typewriter effect.

### Component Hierarchy

**App.tsx:**
- Layout: Sidebar (left, 240px) + Main Content (flex-1).
- Theme: Dark mode only.

**Sidebar:**
- Logo: "PROMPTFORGE" in Orbitron, cyan glow.
- Nav Items: New Session, History, Analytics, Model Registry, Settings.
- Active item: Left border 3px cyan, background `rgba(0,240,255,0.05)`.

**InputPanel:**
- Large textarea with glassmorphism background (`backdrop-filter: blur(12px)`).
- Language auto-detect badge (shows "🇲🇲 Burmese Detected" or "🇬🇧 English").
- Submit button: Cyan neon border, hover expands glow.
- On submit: POST to `/sessions`, then poll or SSE for state updates.

**ClarificationWizard:**
- Appears when session state is `S5_CLARIFY`.
- Card layout: Question text in JetBrains Mono, 4 option buttons styled as holographic tiles.
- Option hover: Scale 1.02, border glow magenta.
- "Other" option reveals a text input.
- Progress indicator: Top bar showing current step (e.g., "Clarification 2 of 4").

**IntentCard:**
- Shows extracted intent after S3.
- Fields: Intent, Domain, Complexity (1–5 stars), Scope.
- Visual: HUD-style panel with corner brackets (`┌ ┐ └ ┘` aesthetic).

**ModelSelector:**
- Grid of model cards. Each card shows: model name, family icon, supported harness badges (small cyan pills).
- Selected card: Full cyan border, subtle pulse animation.
- Default selection: DeepSeek Chat.

**HarnessPanel:**
- Control panel with toggle switches for each harness.
- Visual: Sci-fi switches (sliding cyan bar).
- Toggles:
  - [x] Reasoning Scaffold (auto-enabled for complexity >=3)
  - [x] Code Execution (auto-enabled for code intents)
  - [x] Meta-Cognitive Layer
  - [ ] Multi-Agent Debate (Expert Mode)
  - [x] Constraint Satisfaction (auto-enabled for decision intents)
- Live status: Shows "Harnesses Active: 3/5" with mini terminal icons.

**PromptOutput:**
- Tabbed interface: "Final Prompt" | "Reasoning Trace" | "Validation Log" | "Code Preview" (if applicable).
- Final Prompt: Syntax-highlighted markdown, one-click copy button.
- Reasoning Trace: Collapsible tree of AI step-by-step logic.
- Validation Log: Terminal-style panel with green `[PASS]` and red `[FAIL]` lines.
- Code Preview: CodeMirror 6 with syntax highlighting, read-only.

**AnalyticsDashboard:**
- Dedicated route `/analytics`.
- HUD-styled panel containing four Recharts visualizations:
  - Line chart: Sessions per day (30-day window).
  - Bar chart: Model usage frequency.
  - Pie chart: Harness enable rates.
  - Histogram: Complexity score distribution.
- All charts use the cyan/magenta color palette.

**HUDTerminal:**
- Reusable component for logs. Black background, green/cyan text, blinking cursor.
- Font: JetBrains Mono, 14px, line-height 1.6.

### State Management (Zustand)

```typescript
interface SessionStore {
  sessionId: string | null;
  currentState: string;
  originalInput: string;
  translatedInput: string;
  intent: Intent | null;
  classification: Classification | null;
  pendingQuestions: Question[];
  answers: Record<string, string>;
  selectedModel: string;
  enabledHarnesses: string[];
  generatedPrompt: string | null;
  reasoningTrace: string | null;
  validationResult: ValidationResult | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  startSession: (input: string) => Promise<void>;
  submitAnswer: (questionId: string, answer: string) => Promise<void>;
  selectModel: (model: string) => void;
  toggleHarness: (harness: string) => void;
  generatePrompt: () => Promise<void>;
  resetSession: () => void;
}
```

Use TanStack Query for server state (history list, model registry, analytics). Use Zustand for client session state.

---

## 10. SCI-FI UI EFFECTS (CSS/SCSS)

```scss
// Glassmorphism panel
.hud-panel {
  background: rgba(5, 5, 8, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 240, 255, 0.2);
  border-radius: 8px;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: -1px; left: -1px; right: -1px; bottom: -1px;
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(0,240,255,0.3), transparent 40%, transparent 60%, rgba(255,0,85,0.2));
    z-index: -1;
  }

  &::after {
    content: '┌                    ┐';
    position: absolute;
    top: 4px; left: 8px; right: 8px;
    color: rgba(0,240,255,0.3);
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    pointer-events: none;
  }
}

// Neon text
.neon-text {
  color: #00F0FF;
  text-shadow: 0 0 5px #00F0FF, 0 0 10px rgba(0,240,255,0.5);
}

// Animated border
@keyframes borderPulse {
  0%, 100% { border-color: rgba(0,240,255,0.2); }
  50% { border-color: rgba(0,240,255,0.6); }
}
.pulse-border {
  animation: borderPulse 2s ease-in-out infinite;
}

// Scanline overlay
.scanlines {
  background: linear-gradient(
    to bottom,
    rgba(255,255,255,0),
    rgba(255,255,255,0) 50%,
    rgba(0,0,0,0.1) 50%,
    rgba(0,0,0,0.1)
  );
  background-size: 100% 4px;
  pointer-events: none;
}
```

---

## 11. IMPLEMENTATION PHASES

Build in this exact order. Do not proceed to Phase N+1 until Phase N is fully functional.

### Phase 1: Foundation (Local venv, SQLite)
- [ ] Initialize Python venv, project structure.
- [ ] Implement SQLAlchemy/SQLite DB layer with all tables and seed data.
- [ ] Set up FastAPI `main.py` with CORS and health check endpoint.
- [ ] Set up React + Vite + Tailwind + TypeScript.
- [ ] Implement core HUD primitives (HUDPanel, NeonText, HUDTerminal).

### Phase 2: Core Services & Event Bus
- [ ] Implement `EventBus` with `asyncio.Queue`.
- [ ] Implement `translator` service (DeepSeek + Burmese detection).
- [ ] Implement `intent_engine` service (Instructor/JSON mode).
- [ ] Implement FSM with SQLite persistence (`session_state` table, 30-minute expiry).
- [ ] Wire InputPanel → `/sessions` → ClarificationWizard → IntentCard end-to-end.

### Phase 3: Harness Orchestration & Analytics
- [ ] Implement all five harness classes with `BaseHarness` interface.
- [ ] Implement `HarnessOrchestrator` with dynamic ordering.
- [ ] Implement `/generate` endpoint using Orchestrator.
- [ ] Build HarnessPanel, ModelSelector, PromptOutput components.
- [ ] Implement `/analytics` API endpoints.
- [ ] Build `AnalyticsDashboard` frontend component with Recharts.

### Phase 4: Security & Polish
- [ ] Harden sandbox execution (subprocess isolation, 10s timeout, no network).
- [ ] Add strict Pydantic input validation on all API endpoints.
- [ ] Run `pip-audit` on `requirements.txt` and resolve flagged vulnerabilities.
- [ ] Final UI polish: Framer Motion animations, typewriter effects, scanline overlay.
- [ ] Complete README with setup instructions and environment variable documentation.

---

## 12. SECURITY & HARDENING

- **Input Validation:** Strict Pydantic v2 models with field validators on all API inputs. Reject any input exceeding 10,000 characters.
- **Code Execution:** Isolated `asyncio` subprocess, no network access, 10-second hard timeout, 128MB memory cap enforced via OS-level resource limits (`resource.setrlimit`).
- **Dependencies:** Run `pip-audit` before shipping. Document any accepted exceptions.
- **Least Privilege:** App runs entirely within a user-scoped Python virtual environment. No root permissions required.
- **Prompt Injection:** Sanitize user inputs before injecting into any DeepSeek system prompt. Strip or escape `<|`, `###`, `SYSTEM:` patterns.

---

## 13. ENVIRONMENT VARIABLES

Create `.env.example`:

```env
# Database (SQLite — no server required)
DATABASE_URL=sqlite+aiosqlite:///./promptforge.db

# AI
DEEPSEEK_API_KEY=sk-xxxxxxxx
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# Local Models (optional fallback)
OLLAMA_BASE_URL=http://localhost:11434

# App
APP_ENV=development
SECRET_KEY=generate-a-random-secret-here
CORS_ORIGINS=http://localhost:5173
```

---

## DELIVERABLES

You MUST deliver:
1. Complete, runnable backend (FastAPI) with all endpoints functional.
2. Complete, runnable frontend (React) with all components implemented.
3. SQLite database with Alembic migrations and seed data for model templates.
4. Analytics Dashboard (backend + frontend) fully wired.
5. Working `EventBus` integrated across all services.
6. Working `HarnessOrchestrator` driving the `/generate` pipeline.
7. README with venv setup, dependency installation, and run instructions.

Do not use mock data. Do not leave TODO comments. Every feature described above must be fully implemented and wired together.