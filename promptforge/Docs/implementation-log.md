# PromptForge — Implementation Log

**Date:** 2026-06-02
**Stack:** React 18 + TypeScript + Vite | Python FastAPI + SQLAlchemy + SQLite

---

## 1. Project Structure (69 source files)

```
promptforge/
├── backend/                           # Python FastAPI backend
│   ├── app/
│   │   ├── main.py                    # FastAPI entry, CORS, lifespan
│   │   ├── config.py                  # Env vars, lazy DeepSeek client
│   │   ├── database.py                # SQLAlchemy async models + seed data
│   │   ├── models/__init__.py
│   │   ├── schemas/__init__.py        # Pydantic v2 request/response models
│   │   ├── routers/
│   │   │   ├── sessions.py            # CRUD + FSM advance endpoint
│   │   │   ├── translate.py           # Burmese → English translation
│   │   │   ├── generate.py            # Orchestrated prompt generation
│   │   │   ├── clarify.py             # Gap analysis → MCQ generation
│   │   │   ├── history.py             # Prompt history list/delete
│   │   │   ├── analytics.py           # Sessions, models, harnesses, complexity
│   │   │   └── models_endpoints.py    # Model registry
│   │   ├── services/
│   │   │   ├── translator.py          # DeepSeek API + Burmese glossary
│   │   │   ├── intent_engine.py       # Intent extraction + classification
│   │   │   ├── clarifier.py           # Missing-info → MCQ questions
│   │   │   ├── harnesses.py           # 5 harness classes (BaseHarness)
│   │   │   ├── orchestrator.py        # Dynamic harness ordering + registry
│   │   │   ├── prompt_optimizer.py    # Template filling + DeepSeek generation
│   │   │   └── sandbox_executor.py    # Isolated subprocess + auto-fix retry
│   │   └── utils/
│   │       ├── fsm.py                 # 12-state FSM with conditional transitions
│   │       ├── events.py              # asyncio.Queue EventBus (pub/sub)
│   │       └── burmese_utils.py       # Unicode detection + Zawgyi normalization
│   ├── requirements.txt
│   ├── .env.example
│   └── alembic/
├── frontend/                          # React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── main.tsx                   # React 18 entry
│   │   ├── App.tsx                    # Root: routing, layout, workflow orchestration
│   │   ├── api/client.ts             # Typed fetch wrapper (14 API methods)
│   │   ├── stores/sessionStore.ts     # Zustand: full session lifecycle + FSM flow
│   │   ├── types/index.ts            # TypeScript interfaces
│   │   ├── hooks/
│   │   │   ├── useSSE.ts             # SSE hook + auto-advance helper
│   │   │   └── useHarness.ts         # Harness execution hook
│   │   ├── components/
│   │   │   ├── hud/                   # Sci-fi primitives
│   │   │   │   ├── HUDPanel.tsx       # Glassmorphism panel w/ corner brackets
│   │   │   │   ├── HUDButton.tsx      # Neon-border button (cyan/magenta/amber)
│   │   │   │   ├── HUDTerminal.tsx    # Terminal log with blinking cursor
│   │   │   │   ├── HUDProgress.tsx    # Gradient progress bar
│   │   │   │   └── NeonText.tsx       # Glow-text spans
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx        # 240px nav + cyan active state
│   │   │   │   └── TopBar.tsx         # State label + progress indicator
│   │   │   ├── workflow/
│   │   │   │   ├── InputPanel.tsx     # Textarea + language badge + submit
│   │   │   │   ├── TranslationBadge.tsx
│   │   │   │   ├── ClarificationWizard.tsx  # MCQ cards with custom input
│   │   │   │   ├── IntentCard.tsx     # Extracted intent + star rating + harness recs
│   │   │   │   ├── ModelSelector.tsx  # Grid of model cards with icons
│   │   │   │   ├── HarnessPanel.tsx   # Toggle switches + generate button
│   │   │   │   ├── PromptOutput.tsx   # 4-tab output viewer
│   │   │   │   └── CodePreview.tsx    # Code block extraction + syntax display
│   │   │   ├── dashboard/
│   │   │   │   └── AnalyticsDashboard.tsx  # 4 Recharts charts
│   │   │   └── modals/
│   │   │       ├── ExportModal.tsx    # Copy/download prompt
│   │   │       └── SettingsModal.tsx  # API key + Ollama URL
│   │   └── styles/
│   │       └── global.scss           # Tailwind + HUD CSS + Google Fonts
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js             # Custom colors, fonts, animations
│   └── postcss.config.js
├── README.md
└── Docs/
    └── implementation-log.md          # This file
```

---

## 2. Backend Architecture

### Database (SQLite via aiosqlite + SQLAlchemy async)

Five tables, all created at startup:

| Table | Purpose |
|-------|---------|
| `sessions` | FSM state, original/translated input, extracted intent JSON, classification, answers, pending questions, generated prompt |
| `session_state` | In-DB key-value store with 30-minute TTL (replaces Redis) |
| `prompts` | Saved generated prompts with metadata (model, harnesses, complexity, scope) |
| `model_templates` | Per-model optimization templates — 7 seeded at startup |
| `burmese_glossary` | 10 Burmese-English technical term pairs |

### Finite State Machine (FSM)

12 states: `S1_INGEST` → `S2_TRANSLATE` → `S3_EXTRACT` → `S4_GAP_ANALYSIS` → `S5_CLARIFY` → `S6_CLASSIFY` → `S7_MODEL_SELECT` → `S8_HARNESS_SELECT` → `S9_OPTIMIZE` → `S10_GENERATE` → `S11_VALIDATE` → `S12_EXPORT`

Conditional branches:
- `S4_GAP_ANALYSIS`: If `pending_questions` is non-empty → `S5_CLARIFY`, else → `S6_CLASSIFY`
- `S5_CLARIFY`: Loops back to itself while questions remain, then advances

State persisted in both `sessions.current_state` and `session_state.state_data` within a single transaction.

### Event Bus

`utils/events.py` — asyncio.Queue-based pub/sub with no external dependencies. Events published: `SessionCreated`, `TranslationCompleted`, `IntentExtracted`, `PromptGenerated`.

### API Endpoints (14 total)

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/api/v1/health` | GET | — | `{status, app, version}` |
| `/api/v1/translate` | POST | `{text, source_lang, target_lang}` | `{translated_text, confidence, was_burmese, warnings}` |
| `/api/v1/sessions` | POST | `{original_input, language}` | `{session_id, current_state, next_action}` |
| `/api/v1/sessions/{id}` | GET | — | Full session object |
| `/api/v1/sessions/{id}/advance` | POST | `{user_input}` | Updated session + next_action |
| `/api/v1/intent/extract` | POST | `{session_id, translated_text}` | `{intent, classification}` |
| `/api/v1/clarify/generate-questions` | POST | `{session_id, missing_info}` | `{questions}` |
| `/api/v1/generate` | POST | `{session_id, target_model, enabled_harnesses}` | `{final_prompt, reasoning_trace, validation_result}` |
| `/api/v1/models` | GET | — | Array of model info objects |
| `/api/v1/history` | GET | `?limit=&offset=` | `{items, total}` |
| `/api/v1/history/{id}/delete` | POST | — | `{deleted, id}` |
| `/api/v1/analytics/sessions` | GET | `?days=` | `{daily_counts}` |
| `/api/v1/analytics/models` | GET | — | `{model_usage}` |
| `/api/v1/analytics/harnesses` | GET | — | `{harness_stats}` |
| `/api/v1/analytics/complexity` | GET | — | `{distribution}` |

### Harness System

Five harnesses, all implementing `BaseHarness.apply(session) -> str`:

1. **ReasoningScaffold** — Complexity-based: Graph-of-Thought (score 5), Tree-of-Thought (score 4), Chain-of-Thought (score 3)
2. **MetaCognitive** — Self-critique protocol: draft → critique → rewrite → confidence score → failure mode analysis
3. **ConstraintSatisfaction** — Decision matrix: hard constraints (pass/fail), soft constraints (weighted scoring), sensitivity analysis
4. **CodeExecution** — Extracts code blocks, runs in isolated subprocess (10s timeout), auto-fixes up to 3 times via DeepSeek
5. **Debate** — Four-stage LLM pipeline: Architect → Critic → Refiner → Judge

`HarnessOrchestrator` registry maintains all harnesses and orders execution: reasoning → constraints → meta-cognitive → debate → code execution.

---

## 3. Frontend Architecture

### State Management

- **Zustand** (`sessionStore.ts`) — Client session state: session ID, FSM state, input, intent, answers, questions, selected model, harnesses, generated prompt, validation result
- **TanStack Query** — Server state: history list, model registry, analytics data

### Component Hierarchy

```
App
├── Sidebar (nav: Workflow, History, Analytics, Models, Settings)
├── TopBar (state label, session ID, progress bar)
└── Main Content
    ├── [workflow] InputPanel → IntentCard → ClarificationWizard → ModelSelector → HarnessPanel → PromptOutput
    ├── [history] History list with delete
    ├── [analytics] AnalyticsDashboard (4 Recharts charts)
    ├── [models] Model registry grid
    └── [settings] SettingsModal
```

### UI Design System

- **Colors:** Void Black `#050508`, Holographic Cyan `#00F0FF`, Alert Magenta `#FF0055`, Amber Warning `#FFAA00`
- **Fonts:** Orbitron (headers), JetBrains Mono (data/terminal), Inter (body), Noto Sans Myanmar (Burmese)
- **Effects:** Glassmorphism (`backdrop-filter: blur(12px)`), neon text-shadow, corner bracket decorations (`┌ ┐ └ ┘`), scanline overlay gradient, pulsing borders
- **Animations:** Framer Motion for panel entrances (fade + slide), hover scale (1.02), terminal blinking cursor

### Workflow Flow

1. User types request → `InputPanel` submits to `/sessions`
2. Backend auto-detects language; if Burmese, translates via DeepSeek
3. Intent extraction returns structured JSON → `IntentCard` displays
4. Missing info triggers `ClarificationWizard` with generated MCQ cards
5. User answers all questions → `ModelSelector` shows available models
6. User picks model → `HarnessPanel` shows toggleable harnesses
7. User clicks "Generate" → back calls orchestrator, fills template, returns prompt
8. `PromptOutput` shows 4-tab view: Final Prompt, Reasoning Trace, Validation Log, Code Preview
9. Export modal allows copy or .txt download

---

## 4. Build Verification

- **Backend:** Imports clean, starts on port 8000, health endpoint returns 200
- **Frontend:** TypeScript compiles with zero errors, Vite build produces 758 KB JS + 17 KB CSS (gzipped: 230 KB + 4.5 KB)
- **Models endpoint:** Returns 7 model templates (deepseek-chat, deepseek-reasoner, gpt-4o, claude-3-5-sonnet, llama-3.1-8b, midjourney, stable-diffusion)

---

## 5. To Run

```bash
# Backend
cd promptforge/backend
python -m venv venv
source venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env    # edit DEEPSEEK_API_KEY
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend
cd promptforge/frontend
npm install
npm run dev
```
