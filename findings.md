Comprehensive Codebase Audit — PromptForge
No repository files were changed during this audit, so I did not create a commit or pull request.

GitNexus Availability Note
The repository AGENTS.md asks to use GitNexus for exploration, but no GitNexus MCP resources/templates were available in this environment, and npx gitnexus --help failed with an npm registry 403 Forbidden. I therefore performed a read-only audit through source inspection and available build/lint/import checks.

Executive Summary
PromptForge has a solid conceptual structure: a FastAPI backend, async SQLAlchemy persistence, React/Vite frontend, prompt-generation workflow, model templates, harness orchestration, and analytics. The most important issues are:

Backend cannot start without a DeepSeek key, because service singletons create the OpenAI-compatible client at import time, making even /health unavailable in unconfigured environments. get_deepseek_client() warns on missing DEEPSEEK_API_KEY but still instantiates OpenAI, while translator_service is instantiated during module import. 

Frontend and backend session state are materially out of sync. The frontend calls advanceSession with data for the wrong backend state, causing translated text, intent, classification, model selection, and harness selection to be ignored or delayed. 

The “sandbox” is not actually sandboxed. User/LLM-generated Python is executed directly via python -c with no filesystem, network, CPU, memory, environment, or syscall isolation. 

The frontend currently fails lint and build checks. Lint reports 38 errors, and TypeScript build fails on Framer Motion transition typing plus unused imports/variables. HUDPanel’s ease: "easeOut" object is the primary cited build issue. 

Security controls are mostly absent. There is no authentication/authorization layer, history deletion is an unauthenticated POST, CORS allows credentials, the API base is hard-coded client-side, and SECRET_KEY has an insecure development default. 

1. Bug and Error Detection
Critical / High Priority
1. Backend startup fails when DEEPSEEK_API_KEY is missing
The backend imports routers at app startup, routers import services, and services instantiate singleton clients immediately. Because get_deepseek_client() still creates an OpenAI client when DEEPSEEK_API_KEY is empty, importing app.main fails before the FastAPI app can serve health checks. 

Recommendation: Lazily initialize AI clients only when an endpoint actually needs them, and return a clear 503 Service Unavailable from AI endpoints when credentials are absent. Keep /api/v1/health independent of AI provider configuration.

2. Frontend/backend workflow state machine is misaligned
The frontend creates a session, then immediately sets local state to S2_TRANSLATE, calls translation, and calls advanceSession with translated text while the backend session is still in S1_INGEST. The backend’s S1_INGEST branch ignores user_input, so translated text is not stored. 

Next, the frontend calls advanceSession with intent/classification while the backend is only in S2_TRANSLATE, so the backend tries to read translated_text from an object that contains intent and classification, and does not store intent/classification. 

Later model and harness selection can also be ignored if the backend has not reached the matching FSM state. The backend only stores model input in S7_MODEL_SELECT and harness input in S8_HARNESS_SELECT. 

Impact: Persisted sessions are unreliable; analytics/history may miss intent, model, harness, and state data; refresh/reload may show a different workflow than the UI.

Recommendation: Make backend advancement idempotent and action-based rather than purely state-based. For example, use explicit actions like submit_translation, submit_intent, submit_model, and validate each action against the current state. Alternatively, have the frontend wait for backend responses and derive local state only from server state.

3. Generate endpoint does not update backend FSM state
The frontend calls advanceSession once before generation, then calls /generate and locally sets state to S11_VALIDATE. The /generate endpoint saves generated prompt/model/harnesses, but it does not update session.current_state. 

Impact: Refreshing the session after generation can show an earlier backend state while the UI believes it is validating/exporting.

Recommendation: Have /generate transition the session to a defined post-generation state, or make generation part of the FSM transition endpoint.

4. Code validation always treats extracted code as Python
The backend extracts code blocks using a first regex where python is optional, so that pattern can match generic fences before language-specific patterns. The generate endpoint then validates extracted code as "python" regardless of the actual fence language. 

Impact: JavaScript/TypeScript code fences may be executed as Python or skipped incorrectly, producing false validation failures.

Recommendation: Extract both language and code with one regex like /```(\w+)?\n([\s\S]*?)```/, then dispatch to language-specific validators or explicitly skip unsupported languages.

5. The event bus can crash on one bad subscriber
EventBus.process() awaits each handler without exception handling. A single subscriber exception would exit the process loop and silently stop later event handling. 

Recommendation: Wrap each handler call in try/except, log failures, call queue.task_done(), and expose metrics for queue depth/errors.

6. Lifespan cancellation is not awaited
The app creates an event task on startup and calls event_task.cancel() on shutdown, but it does not await the task or suppress CancelledError. 

Recommendation: Use contextlib.suppress(asyncio.CancelledError) and await event_task after cancellation.

7. Build failure in HUDPanel Framer Motion typing
HUDPanel dynamically chooses motion.div or "div" and spreads a transition object with ease: "easeOut". Current TypeScript/Framer Motion typings reject this as an invalid Transition shape. 

Recommendation: Use typed motion props, import an easing constant/type, or split animated/static rendering into two explicit branches.

2. Code Quality Assessment
Incomplete / Placeholder / Dummy Logic
1. Client-side harness validation is a placeholder
useHarness.validate() ignores the supplied code and language, returns “Ready for server validation,” and imports api without using it. 

Recommendation: Either remove this hook until implemented or wire it to a real backend validation endpoint with typed responses.

2. Analytics harness pass rate is hard-coded
The analytics endpoint returns a fixed pass_rate: 0.85 for every harness rather than computing it from validation results. 

Recommendation: Persist validation outcomes per prompt/harness and compute actual pass/fail rates.

3. README claims Ollama fallback, but no backend fallback is implemented
The README describes “DeepSeek API … with Ollama fallback,” and .env.example exposes OLLAMA_BASE_URL, but the current service code instantiates only the OpenAI-compatible DeepSeek client. 

Recommendation: Implement an AI provider abstraction with DeepSeek, Ollama, and test/mock providers.

4. Settings modal saves credentials locally but backend never consumes them
The settings modal stores a DeepSeek API key and Ollama URL in localStorage, but API requests do not include those settings and backend config is process-environment based. 

Recommendation: Either remove client-side secret storage or design a secure backend settings flow. Avoid storing provider API keys in browser localStorage.

5. Extensive any usage defeats TypeScript safety
The API client and several components use any for session, intent, analytics, history, validation, and chart data. 

Recommendation: Reuse the existing frontend interfaces and add API response types for every endpoint. The project already defines useful domain types. 

6. No automated tests found
No Python or frontend test files were found by test-file discovery. The repository has no visible test suite for FSM transitions, API behavior, persistence, generation, or UI state.

Recommendation: Add unit tests for the FSM and services, API integration tests using httpx.AsyncClient, and frontend component/store tests.

3. Architectural & Backend Analysis
Backend Structure
The backend is separated into routers, services, utils, schemas, config, and database models, which is a reasonable foundation. The API routes are registered under /api/v1, and startup initializes the database and event loop task. 

Main Backend Concerns
1. Sync AI calls inside async service methods block the event loop
Several async service methods call synchronous client.chat.completions.create(...). This blocks the event loop during network I/O and limits concurrent FastAPI performance. Examples include translation, intent extraction, prompt generation, debate harness, and sandbox auto-fix. 

Recommendation: Use the provider’s async client, or run blocking calls in a bounded threadpool. Add request timeouts, retries with backoff, and cancellation propagation.

2. Database schema lacks indexes and constraints for likely query paths
The schema has primary keys but no indexes on created_at, session_id, target_model, complexity_score, or glossary terms. Analytics queries group/order by dates, model usage, harnesses, and complexity. 

Recommendation: Add indexes for sessions.created_at, prompts.created_at, prompts.target_model, prompts.complexity_score, and glossary term fields. Add foreign-key cascade behavior where appropriate.

3. Session expiry exists but is not enforced
SessionState has expires_at, and advance_session refreshes it, but there is no cleanup task or query filter that prevents expired session state from being used. 

Recommendation: Enforce expiry on reads and add periodic cleanup of expired session_state rows.

4. JSON mutation tracking may be fragile
Several model fields are JSON columns, including answers, pending_questions, selected_harnesses, intent, and classification. The session router mutates dictionaries/lists and assigns them back, but plain SQLAlchemy JSON columns are easy to mishandle without MutableDict/MutableList. 

Recommendation: Use SQLAlchemy MutableDict.as_mutable(JSON) and MutableList.as_mutable(JSON), or always assign fresh copied objects and add tests confirming persistence.

5. Database migrations are listed as a dependency but not used
alembic is in backend requirements, but startup uses Base.metadata.create_all, which is not enough for production schema evolution. 

Recommendation: Add Alembic migrations and avoid relying on create_all outside development.

6. API validation is uneven
Some request models enforce text length, but history limit/offset are unbounded plain parameters, delete uses POST instead of DELETE, and AdvanceSessionRequest.user_input is unconstrained Any. 

Recommendation: Use Query(ge=0, le=...), typed discriminated action schemas, and proper HTTP verbs.

Security Protocols
1. Unauthenticated destructive endpoint
Anyone with network access can delete any prompt if they know the ID. 

Recommendation: Add authentication, ownership, CSRF-aware design if cookies are used, and authorization checks.

2. Insecure default secret key
SECRET_KEY defaults to "promptforge-dev-secret-key". 

Recommendation: Require a strong secret in production and fail startup if APP_ENV=production with a default secret.

3. CORS allows credentials
CORS sets allow_credentials=True; combined with no auth design, this should be revisited before production. 

Recommendation: Only enable credentials when using a deliberate cookie/session strategy and strict origin allow-listing.

4. Prompt injection and secret leakage risks are not addressed
User text is passed directly into AI prompts for translation, intent extraction, prompt optimization, debate, and code fixing. Basic sanitization only strips a few tokens from translate/session text. 

Recommendation: Add provider prompt-injection boundaries, structured outputs with schemas, redaction, audit logging, and no-secret guarantees.

4. Frontend & UI/UX Review
Positive Observations
The UI has a coherent sci-fi HUD theme with consistent neon colors, panel styling, and motion patterns. 

The workflow is broken into focused components: input, clarification, intent card, model selector, harness panel, and output. 

Output supports copy/download and tabbed views for prompt, trace, validation, and code preview. 

UI/UX Issues
1. Fixed sidebar layout is not mobile-friendly
The app uses a fixed w-60 sidebar and a ml-60 content offset. On small screens this can crowd or hide content. 

Recommendation: Add a responsive drawer/collapsible sidebar and remove fixed left margin on mobile.

2. Accessibility needs improvement
Many icon-only or visually styled buttons lack explicit aria-label, and state/progress indicators are primarily color-based. Examples include copy/download buttons and tab buttons. 

Recommendation: Add aria-label, aria-selected, keyboard navigation for tabs, visible focus states, and non-color status labels.

3. Text contrast is often very low
The UI frequently uses text-white/15, text-white/20, text-cyan/30, and similar low-opacity colors. 

Recommendation: Audit WCAG contrast ratios and introduce accessible semantic color tokens.

4. Errors are swallowed in multiple places
The app catches errors and does nothing for history/model loading, analytics, and some session advances. 

Recommendation: Show recoverable error states, retry buttons, and backend health/provider status.

5. Loading state is set to false too early during session start
startSession sets isLoading: false immediately after creating the session, before translation, intent extraction, clarification generation, and FSM advancement finish. 

Recommendation: Keep loading true for the entire workflow or expose granular loading statuses like creating, translating, extracting, clarifying.

6. Settings modal creates false confidence
Users can save API keys and Ollama URL in the browser, but these settings are not connected to backend calls. 

Recommendation: Either integrate settings securely or label them as local-only placeholders and hide until backend support exists.

5. Feature Roadmap
Near-Term Features
Provider health panel: Show DeepSeek/Ollama availability, configured model, latency, and last error.

Session replay/debug view: Display each FSM step, request/response payload, and persisted backend state.

Prompt versioning: Allow users to compare iterations and roll back generated prompts.

Typed export formats: Add Markdown, JSON, plain text, and model-specific prompt package exports.

Validation dashboard: Persist validation checks and show pass/fail trends per harness/model.

Medium-Term Features
Real Ollama fallback: Implement provider abstraction and local model selection.

Prompt evaluation harnesses: Add rubric scoring, adversarial prompt checks, safety checks, and regression tests for prompts.

Template editor: Let users create and version model templates from the UI.

Workspace/projects: Organize sessions/prompts by project, tag, domain, or client.

Searchable history: Full-text search over original requests, generated prompts, model, harness, and tags.

Longer-Term Features
Multi-user accounts and teams: Authentication, ownership, sharing, role-based access control.

Collaborative prompt review: Comments, approvals, and human-in-the-loop refinement.

A/B prompt testing: Run generated prompts against target models and compare outputs.

Cost and token analytics: Track provider/model usage, estimated tokens, latency, and cost.

Secure code validation service: Containerized workers with per-language runtimes and resource limits.

6. General Improvements & Refactoring Recommendations
Highest Priority Refactors
Create a backend service/provider layer

Replace module-level singleton client creation with lazy provider factories.

Support DeepSeek, Ollama, mock/test providers, and async clients.

Add explicit timeout/retry policies.

Replace state-based advanceSession payload handling

Use explicit action schemas.

Validate transitions server-side.

Return canonical session state after every action.

Make frontend derive state from backend responses only.

Secure or remove code execution

Do not run generated code via unrestricted python -c.

Use containers, seccomp/AppArmor, resource limits, network disablement, temp dirs, and process isolation.

Consider making validation opt-in and disabled by default.

Introduce typed API contracts

Replace frontend any with existing types/index.ts interfaces and backend Pydantic response models.

Generate TypeScript types from OpenAPI if possible.

Add tests

FSM transition tests.

API contract tests.

Provider failure tests.

Sandbox security tests.

Frontend store workflow tests.

Performance Improvements
Run independent harnesses concurrently where safe instead of sequentially. The orchestrator currently executes them one-by-one. 

Avoid full glossary table scans on every Burmese translation by indexing terms or using trie/full-text lookup. 

Add pagination caps and indexes for history and analytics. 

Avoid blocking synchronous AI calls in async endpoints. 

Maintainability Improvements
Move hard-coded model registry data into versioned seed files or migrations. 

Add structured logging with request/session IDs.

Add pre-commit hooks for Python formatting, TypeScript linting, and build checks.

Split large session store orchestration into smaller async workflow actions.

Create a documented API contract and error model.

Prioritized Issue List
Priority	Area	Issue	Suggested Fix
P0	Backend startup	App import fails without DeepSeek key	Lazy client init; health endpoint independent
P0	Security	Unrestricted code execution	Replace with isolated containerized sandbox or disable
P0	Workflow	Frontend/backend FSM desync	Action-based server FSM and canonical state responses
P1	Frontend	Build and lint fail	Fix HUDPanel typing, unused imports, any usage
P1	Backend	Blocking AI calls in async code	Use async client/threadpool with timeouts
P1	Security	No auth for history/delete	Add auth/ownership/authorization
P2	Database	Missing indexes/migrations	Add Alembic and indexes
P2	Analytics	Hard-coded pass rate	Persist validation outcomes
P2	UX	Mobile/accessibility gaps	Responsive drawer, ARIA labels, contrast audit
P3	Roadmap	Ollama fallback claim not implemented	Provider abstraction and fallback chain
Testing / Checks Run
⚠️ npx gitnexus --help — failed with npm registry 403 Forbidden, so GitNexus exploration tools were unavailable in this environment.

✅ python -m compileall -q promptforge/backend/app promptforge/backend/main.py — backend Python files compiled successfully.

❌ cd promptforge/backend && python - <<'PY' try: from app.main import app print('app imported', app.title) except Exception as exc: import traceback traceback.print_exc() raise PY — failed because DEEPSEEK_API_KEY is missing and service singletons instantiate the OpenAI client during import.

❌ npm run lint --prefix promptforge/frontend — failed with 38 ESLint errors, including any usage, unused imports, and React hook lint issues.

❌ npm run build --prefix promptforge/frontend — failed with TypeScript errors, including Framer Motion transition typing and unused imports/variables.

✅ find promptforge -path '*/node_modules' -prune -o \( -name 'test_*.py' -o -name '*_test.py' -o -name '*.test.ts' -o -name '*.test.tsx' \) -print — completed successfully and found no test files.

✅ git status --short — confirmed no repository changes were made.