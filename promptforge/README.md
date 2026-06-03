# PromptForge — AI Prompt Generator

A professional, production-grade desktop application for generating optimized AI prompts with an interactive clarification engine, multi-model optimization, and an advanced harness system.

## Architecture

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion
- **Backend:** Python FastAPI + SQLAlchemy + SQLite (async via aiosqlite)
- **AI Backbone:** DeepSeek API (OpenAI-compatible), with Ollama fallback

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm 9+

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # Windows
# source venv/bin/activate    # macOS/Linux

pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your DEEPSEEK_API_KEY

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend API at `http://localhost:8000`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/translate` | Translate text (Burmese → English) |
| POST | `/api/v1/sessions` | Create a new prompt generation session |
| GET | `/api/v1/sessions/{id}` | Get session state |
| POST | `/api/v1/sessions/{id}/advance` | Advance session FSM |
| POST | `/api/v1/intent/extract` | Extract structured intent |
| POST | `/api/v1/clarify/generate-questions` | Generate clarification questions |
| POST | `/api/v1/generate` | Generate optimized prompt |
| GET | `/api/v1/models` | List available target models |
| GET | `/api/v1/history` | List saved prompts |
| POST | `/api/v1/history/{id}/delete` | Delete a saved prompt |
| GET | `/api/v1/analytics/sessions` | Session trends |
| GET | `/api/v1/analytics/models` | Model usage frequency |
| GET | `/api/v1/analytics/harnesses` | Harness statistics |
| GET | `/api/v1/analytics/complexity` | Complexity distribution |

## Features

- **Interactive Clarification Wizard** — FSM-driven question flow, gaps auto-detected
- **Multi-Model Optimization** — Templates for DeepSeek, GPT-4o, Claude, Llama, Midjourney, Stable Diffusion
- **5 Harness System:**
  - Reasoning Scaffold (Chain/Tree/Graph-of-Thought)
  - Meta-Cognitive Layer (self-critique protocol)
  - Code Execution (sandbox validation with auto-fix)
  - Constraint Satisfaction (decision matrix analysis)
  - Multi-Agent Debate (Architect → Critic → Refiner → Judge)
- **Burmese Translation** — Unicode normalization, glossary lookup
- **Analytics Dashboard** — Session trends, model usage, harness stats, complexity histogram
- **Event-Driven Architecture** — AsyncEventBus decouples services
- **Sci-Fi HUD UI** — Glassmorphism, neon text, scanlines, Framer Motion animations

## Environment Variables

See `.env.example`:

| Variable | Description | Default |
|----------|-------------|---------|
| `DEEPSEEK_API_KEY` | DeepSeek API key | (required) |
| `DEEPSEEK_BASE_URL` | DeepSeek API endpoint | `https://api.deepseek.com/v1` |
| `DATABASE_URL` | SQLite database path | `sqlite+aiosqlite:///./promptforge.db` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:5173` |
| `OLLAMA_BASE_URL` | Ollama server URL | `http://localhost:11434` |

## Database

SQLite (via SQLAlchemy + aiosqlite) with these tables:
- `sessions` — FSM state, intent, answers, generated prompts
- `session_state` — In-DB key-value store (30-min expiry)
- `prompts` — Prompt history
- `model_templates` — Per-model optimization templates (seeded at startup)
- `burmese_glossary` — Burmese-English technical term mappings
