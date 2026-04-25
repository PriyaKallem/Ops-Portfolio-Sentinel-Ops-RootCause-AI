# Ops Portfolio — Sentinel-Ops & RootCause-AI

> Two production-style apps. One opinionated portfolio.
> Built for engineering teams that own customer deployments end-to-end:
> instrumented observability, agentic LLM triage, and clean API/data design.

![Stack](https://img.shields.io/badge/stack-React%2019%20·%20FastAPI%20·%20MongoDB-00E5FF?style=flat-square)
![LLMs](https://img.shields.io/badge/LLMs-GPT--5.2%20·%20Claude%204.5%20·%20Gemini%203%20Pro-FF3366?style=flat-square)
![Tests](https://img.shields.io/badge/backend%20tests-13%2F13%20passing-00CC66?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-A0A0A0?style=flat-square)

---

## Why this repo exists

This is a portfolio submission for a **Full-Stack / AI-Engineer** role whose
JD emphasises:

- End-to-end ownership of customer deployments
- Clean, maintainable code across backend, frontend, and data layers
- API and data-model design
- Debugging complex production issues using **logs and tracing**
- System instrumentation (logs, metrics, traces)
- **Human-in-the-loop** AI systems
- Production-grade engineering posture

Rather than five toy demos, this repo ships **two cohesive apps that map
directly to those non-negotiables**, sharing one React + FastAPI + MongoDB
codebase and one LLM gateway across three providers.

---

## The two projects

### 1. Sentinel-Ops — `/sentinel`

An AI **IT-Ops control room**. Live KPI strip (CPU / MEM / error-rate / p95
latency), CPU+Memory area chart, error-rate & latency line charts, an 8-service
health grid, an anomaly feed, a color-coded log stream with INFO/WARN/ERROR
filters, and an embedded AI assistant you can chat with — switch between
**GPT-5.2, Claude Sonnet 4.5, or Gemini 3 Pro** per turn. Telemetry refreshes
every 8 seconds; chat history is persisted in MongoDB.

### 2. RootCause-AI — `/rootcause`

A **production incident debugger**. Paste a stack trace or multi-line log
dump, pick a model, and get a strict-JSON RCA card back: severity badge,
confidence %, probable cause, suggested fix, affected components, runbook
references, and a copyable code patch. All analyses are persisted to a
sticky history panel — click any past item to reload it.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ React 19 SPA  (Tailwind · Recharts · React Router · lucide)      │
│   /            Landing                                           │
│   /sentinel    Sentinel-Ops control room                         │
│   /rootcause   RootCause-AI debugger                             │
└────────────────────────┬─────────────────────────────────────────┘
                         │ axios, REACT_APP_BACKEND_URL
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ FastAPI  (router prefix /api)                                    │
│                                                                  │
│   /health · /models                                              │
│   /sentinel/{metrics,services,anomalies,logs,chat,chat/{sid}}    │
│   /rootcause/{analyze,history,{id}}                              │
│                                                                  │
│   ┌─────────────────────────────┐    ┌────────────────────────┐  │
│   │ emergentintegrations.LlmChat│ ── │ Universal LLM Key      │  │
│   │  · openai/gpt-5.2           │    │ (one key, three        │  │
│   │  · anthropic/claude-4.5     │    │  providers)            │  │
│   │  · gemini/gemini-3.1-pro    │    └────────────────────────┘  │
│   └─────────────┬───────────────┘                                │
│                 │                                                │
│                 ▼                                                │
│           MongoDB (Motor)                                        │
│             · sentinel_chat                                      │
│             · rca_history                                        │
└──────────────────────────────────────────────────────────────────┘
```

**Design system**: "Swiss Brutalist Noir" — Chivo / IBM Plex Sans /
JetBrains Mono on a `#050505` background with a single cyan accent
(`#00E5FF`) and structured red/yellow/green for severity. No purple
gradients. No generic card grids. Layouts vary between a Tetris hero
grid and a Control-Room dense dashboard grid.

---

## Tech stack

| Layer       | Choice                                                      |
|-------------|-------------------------------------------------------------|
| Frontend    | React 19, React Router 7, Tailwind CSS, Recharts, lucide    |
| Backend     | FastAPI, Pydantic v2, Motor (async MongoDB)                 |
| Storage     | MongoDB (collections: `sentinel_chat`, `rca_history`)       |
| LLM gateway | `emergentintegrations.LlmChat` — single key, 3 providers    |
| Models      | `gpt-5.2`, `claude-sonnet-4-5-20250929`, `gemini-3.1-pro-preview` |
| Tests       | pytest (backend) — 13/13 passing                            |

---

## Folder structure

```
.
├── backend/
│   ├── server.py            # All /api routes + LLM gateway + Mongo persistence
│   ├── requirements.txt
│   ├── tests/               # pytest suite (13 cases)
│   └── .env                 # MONGO_URL, DB_NAME, EMERGENT_LLM_KEY
├── frontend/
│   ├── public/index.html    # Loads Chivo + IBM Plex Sans + JetBrains Mono
│   └── src/
│       ├── App.js           # 3 routes
│       ├── index.css        # Theme tokens + utility classes
│       ├── components/
│       │   ├── Navbar.jsx
│       │   └── ModelPicker.jsx
│       └── pages/
│           ├── Landing.jsx
│           ├── SentinelOps.jsx
│           └── RootCauseAI.jsx
├── design_guidelines.json   # Frozen design spec used to build the UI
├── memory/PRD.md            # Live product requirements doc
└── README.md
```

---

## API reference

All routes are prefixed with `/api`.

### Meta
| Method | Path             | Description                                 |
|--------|------------------|---------------------------------------------|
| GET    | `/health`        | Liveness probe                              |
| GET    | `/models`        | Returns the 3 supported model keys          |

### Sentinel-Ops
| Method | Path                              | Description                                  |
|--------|-----------------------------------|----------------------------------------------|
| GET    | `/sentinel/metrics?points=60`     | Time-series CPU / MEM / err-rate / p95       |
| GET    | `/sentinel/services`              | 8 services with status / uptime / rps / p95  |
| GET    | `/sentinel/anomalies`             | Active anomalies with severity + baseline    |
| GET    | `/sentinel/logs?limit=80&level=`  | Log stream (filter by INFO/WARN/ERROR)       |
| POST   | `/sentinel/chat`                  | Chat with the SRE agent (model-switchable)   |
| GET    | `/sentinel/chat/{session_id}`     | Persisted chat history                       |

### RootCause-AI
| Method | Path                       | Description                                          |
|--------|----------------------------|------------------------------------------------------|
| POST   | `/rootcause/analyze`       | Returns strict-JSON RCA from a log/stack-trace dump |
| GET    | `/rootcause/history`       | Recent analyses (sorted desc)                        |
| GET    | `/rootcause/{id}`          | Fetch a specific analysis                            |

#### Request — `POST /api/rootcause/analyze`
```json
{
  "model": "claude-sonnet-4.5",
  "title": "billing-svc 5xx after deploy 0142",
  "log_text": "ERROR billing-svc Stripe SignatureVerificationError..."
}
```

#### Response (RCA contract — always JSON)
```json
{
  "id": "uuid",
  "title": "...",
  "model": "claude-sonnet-4.5",
  "severity": "critical|high|medium|low",
  "confidence": 0,
  "probable_cause": "...",
  "affected_components": ["billing-svc", "stripe-webhook-handler"],
  "suggested_fix": "...",
  "code_snippet": "<optional patch>",
  "runbook_links": ["..."],
  "raw_log_excerpt": "...",
  "created_at": "ISO-8601"
}
```

---

## Local setup

### Prerequisites
- Python 3.11+
- Node 18+, Yarn
- MongoDB running locally on `mongodb://localhost:27017`
- An `EMERGENT_LLM_KEY` (universal key that works with all three providers)

### 1. Backend
```bash
cd backend
pip install -r requirements.txt
# Optional: separate venv
# python -m venv .venv && source .venv/bin/activate
```

Create `backend/.env`:
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="ops_portfolio_db"
CORS_ORIGINS="*"
EMERGENT_LLM_KEY="sk-emergent-xxxxxxxxxxxxxx"
```

Run:
```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

### 2. Frontend
```bash
cd frontend
yarn install
```

Create `frontend/.env`:
```
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=3000
```

Run:
```bash
yarn start
```

App is now at <http://localhost:3000>.

---

## Testing

```bash
cd backend
pytest tests/ -v
```

Current status: **13/13 cases passing** — covers health, models, all
Sentinel telemetry endpoints, multi-model chat (GPT-5.2 + Claude 4.5),
RCA happy-path + 400 short-input + history + by-id.

---

## Engineering decisions worth calling out

1. **One LLM gateway, three providers.** `ALLOWED_MODELS` is a tiny whitelist
   map; switching providers is a one-line change in the request body.
2. **Strict-JSON contract for RCA.** The model is instructed to return JSON
   only; backend has a fenced-markdown stripper + greedy `{…}` fallback so
   minor model misbehaviour never leaks to the UI.
3. **MongoDB hygiene.** Every `.find()` projects out `_id`; every Pydantic
   model uses `model_config = ConfigDict(extra="ignore")`; datetimes are
   serialised to ISO-8601 strings before insert.
4. **Deterministic-ish demo data.** Sentinel telemetry is generated in-process
   with sinusoidal baselines + injected anomaly spikes — gives a "live" feel
   without a real Prometheus.
5. **Design system as a contract.** `design_guidelines.json` is checked in;
   the UI was built against it, not invented per-component.
6. **`data-testid` everywhere.** Every interactive element has one — makes
   the app trivially testable end-to-end.

---

## Backlog

- "Compare all 3 models" side-by-side mode on RootCause-AI
- Streaming chat responses on Sentinel-Ops
- Real log-source adapter (Loki / CloudWatch read-only)
- Export RCA as Markdown / PDF, plus shareable public RCA links
- Pagination cursor on `/api/rootcause/history`
- Migrate from `@app.on_event` to FastAPI lifespan handler

---

## License

MIT — see [`LICENSE`](LICENSE).

---

## Author

Built as a portfolio piece while learning to ship production-grade
full-stack + AI-systems work. PRs and feedback welcome.
