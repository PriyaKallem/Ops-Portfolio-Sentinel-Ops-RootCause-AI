# Ops Portfolio — PRD

## Original Problem Statement
Build 2–3 portfolio projects for a fresher targeting a Full-Stack / AI-Engineer
role whose JD emphasises: end-to-end customer deployments, clean
backend/frontend/data-layer code, API & data-model design, debugging via
logs/tracing, system instrumentation, human-in-the-loop AI, and
production-grade engineering posture.

## User Choices (verbatim)
- **2 projects**
- **AI-Powered IT Ops Assistant** (chat agent with logs/metrics + RCA)
- **Production Issue Debugger** (paste logs → AI-powered RCA)
- LLMs: **Claude Sonnet 4.5, GPT-5.2, Gemini 3 Pro** (multi-model picker)
- **No auth**
- Design: **Enterprise / professional**

## Architecture
- **Frontend**: React 19 + React Router + Tailwind + Recharts + lucide-react
  - Routes: `/` (Landing), `/sentinel` (Sentinel-Ops), `/rootcause` (RootCause-AI)
  - Theme: Swiss Brutalist Noir (Chivo / IBM Plex Sans / JetBrains Mono, #050505 background, #00E5FF cyan accent, #FF3366 critical)
- **Backend**: FastAPI + Motor (MongoDB) + emergentintegrations (LlmChat)
  - Router prefix `/api`
  - Collections: `sentinel_chat`, `rca_history`
- **LLM**: Single `EMERGENT_LLM_KEY` routed per request to one of:
  - openai/gpt-5.2 · anthropic/claude-sonnet-4-5-20250929 · gemini/gemini-3.1-pro-preview

## Personas
1. **Hiring engineer** — opens the landing page, jumps into both apps, evaluates code quality, design taste, and AI integration depth.
2. **Recruiter / non-technical reviewer** — skims the landing page narrative and stat strip.

## Core Requirements (static)
- Single deploy with 3 routes, dark enterprise theme.
- Sentinel-Ops: live KPIs, area+line charts, services grid, anomaly feed, log stream with level filters, AI chat with model picker.
- RootCause-AI: large log textarea, model picker, strict-JSON RCA card (severity badge, confidence %, probable cause, suggested fix, affected components, runbook refs, copyable patch), persistent history.
- All interactive elements have `data-testid`.

## What's Implemented (2026-01)
- ✅ Backend: 13 endpoints (health, models, sentinel metrics/services/anomalies/logs/chat/chat-history, rootcause analyze/history/get).
- ✅ Multi-LLM via emergentintegrations with model whitelist.
- ✅ Strict-JSON RCA extractor with markdown-fence fallback.
- ✅ Frontend: Landing + Sentinel-Ops + RootCause-AI fully wired.
- ✅ Recharts area + line charts with custom dark tooltip.
- ✅ Auto-refresh telemetry every 8s on Sentinel-Ops.
- ✅ Tested: 13/13 backend pytest passed; frontend e2e (load sample → analyze → result, chat round-trip, navigation) passed.

## P1 Backlog
- Pagination cursor on `/api/rootcause/history`.
- Persist Sentinel chat session id in `localStorage` (currently per-mount).
- Migrate `@app.on_event` to FastAPI lifespan.

## P2 Backlog
- Streaming responses on Sentinel chat.
- Export RCA report as Markdown / PDF.
- Compare-models view: run the same trace against all 3 LLMs side-by-side.
- Connect to a real log source (Loki / Cloudwatch read-only adapter).
- "Share" link for RCA — public read-only URL with hash slug (great for resume linking).

## Next Action Items
1. Cosmetic: silence Recharts width(-1)/height(-1) initial-mount warnings.
2. Add an "About the builder" section to the landing page once the user provides bio + links.
3. Wire a real GitHub-stars / commits widget to the landing footer.
