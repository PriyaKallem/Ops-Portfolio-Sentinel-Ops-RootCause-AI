"""
Ops Portfolio Backend
- Sentinel-Ops: AI IT-Ops Assistant (metrics, services, logs, anomalies, chat)
- RootCause-AI: Production Issue Debugger (LLM-powered RCA from stack traces / logs)
"""
import os
import json
import uuid
import math
import random
import logging
import re
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

app = FastAPI(title="Ops Portfolio API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
log = logging.getLogger("ops-portfolio")

# ---------------------------------------------------------------------------
# LLM helpers (emergentintegrations)
# ---------------------------------------------------------------------------
ALLOWED_MODELS = {
    "gpt-5.2": ("openai", "gpt-5.2"),
    "claude-sonnet-4.5": ("anthropic", "claude-sonnet-4-5-20250929"),
    "gemini-3-pro": ("gemini", "gemini-3.1-pro-preview"),
}


async def call_llm(model_key: str, system_message: str, user_text: str, session_id: str) -> str:
    """Single-shot LLM call using emergentintegrations."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    if model_key not in ALLOWED_MODELS:
        raise HTTPException(status_code=400, detail=f"Unsupported model {model_key}")
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")

    provider, model_name = ALLOWED_MODELS[model_key]
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_message,
    ).with_model(provider, model_name)
    response = await chat.send_message(UserMessage(text=user_text))
    return str(response)


# ---------------------------------------------------------------------------
# Mock data generators (deterministic-ish)
# ---------------------------------------------------------------------------
SERVICES = [
    "auth-svc", "billing-svc", "search-svc", "checkout-svc",
    "notify-svc", "ingest-svc", "graphql-gw", "etl-worker",
]

LOG_TEMPLATES = [
    ("INFO",  "auth-svc",      "user login successful uid={uid}"),
    ("INFO",  "checkout-svc",  "order {oid} confirmed total={amt}"),
    ("WARN",  "search-svc",    "slow query path=/search latency={lat}ms"),
    ("WARN",  "graphql-gw",    "rate-limit near threshold client={cid}"),
    ("ERROR", "billing-svc",   "stripe webhook 5xx, retry {n} payload_id={pid}"),
    ("ERROR", "etl-worker",    "KafkaTimeoutError topic=invoices partition=3"),
    ("ERROR", "notify-svc",    "sendgrid 429 too_many_requests batch={b}"),
    ("INFO",  "ingest-svc",    "S3 batch flushed records={r}"),
]


def gen_timeseries(points: int = 60, minutes_per_point: int = 1):
    """Return time series for cpu, mem, error_rate, p95_latency."""
    now = datetime.now(timezone.utc)
    out = []
    for i in range(points):
        t = now - timedelta(minutes=(points - i - 1) * minutes_per_point)
        # Sinusoidal base + noise + occasional spike
        base = 35 + 15 * math.sin(i / 6)
        cpu = max(5, min(98, base + random.uniform(-6, 10)))
        mem = max(20, min(95, 55 + 8 * math.cos(i / 8) + random.uniform(-4, 6)))
        err = max(0, 0.4 + 0.6 * math.sin(i / 5) + random.uniform(-0.2, 0.5))
        if i in (12, 41):  # injected anomalies
            cpu = min(99, cpu + 35)
            err = err + 4.2
        p95 = max(40, 120 + 30 * math.sin(i / 7) + random.uniform(-15, 60))
        out.append({
            "t": t.isoformat(),
            "cpu": round(cpu, 1),
            "mem": round(mem, 1),
            "error_rate": round(err, 2),
            "p95_latency": round(p95, 0),
        })
    return out


def gen_services_health():
    out = []
    for s in SERVICES:
        roll = random.random()
        if roll > 0.85:
            status = "degraded"
        elif roll > 0.95:
            status = "down"
        else:
            status = "healthy"
        out.append({
            "name": s,
            "status": status,
            "uptime_pct": round(random.uniform(98.6, 99.99), 3),
            "rps": random.randint(40, 1800),
            "error_rate": round(random.uniform(0, 4.5), 2),
            "p95_ms": random.randint(60, 540),
            "region": random.choice(["us-east-1", "eu-west-1", "ap-south-1"]),
        })
    return out


def gen_logs(limit: int = 80, level: Optional[str] = None):
    now = datetime.now(timezone.utc)
    rows = []
    for i in range(limit):
        lvl, svc, tpl = random.choice(LOG_TEMPLATES)
        if level and level.upper() != lvl:
            # bias toward requested level but still allow variation
            lvl_options = [t for t in LOG_TEMPLATES if t[0] == level.upper()]
            if lvl_options:
                lvl, svc, tpl = random.choice(lvl_options)
        msg = tpl.format(
            uid=f"u_{random.randint(1000,9999)}",
            oid=f"o_{random.randint(10000,99999)}",
            amt=f"${random.randint(20, 500)}.{random.randint(10,99)}",
            lat=random.randint(800, 4200),
            cid=f"c_{random.randint(100,999)}",
            n=random.randint(1, 5),
            pid=f"p_{uuid.uuid4().hex[:8]}",
            b=f"b_{random.randint(1,99)}",
            r=random.randint(120, 9800),
        )
        ts = now - timedelta(seconds=i * random.randint(2, 18))
        rows.append({
            "id": str(uuid.uuid4()),
            "ts": ts.isoformat(),
            "level": lvl,
            "service": svc,
            "message": msg,
            "trace_id": f"trc_{uuid.uuid4().hex[:12]}",
        })
    rows.sort(key=lambda r: r["ts"], reverse=True)
    return rows


def gen_anomalies():
    now = datetime.now(timezone.utc)
    return [
        {
            "id": str(uuid.uuid4()),
            "ts": (now - timedelta(minutes=4)).isoformat(),
            "severity": "critical",
            "service": "billing-svc",
            "metric": "error_rate",
            "value": 7.4,
            "baseline": 0.6,
            "summary": "5xx spike from Stripe webhook handler (3.4σ above baseline)",
        },
        {
            "id": str(uuid.uuid4()),
            "ts": (now - timedelta(minutes=12)).isoformat(),
            "severity": "warning",
            "service": "search-svc",
            "metric": "p95_latency",
            "value": 980,
            "baseline": 220,
            "summary": "Search p95 latency degraded after index rebuild",
        },
        {
            "id": str(uuid.uuid4()),
            "ts": (now - timedelta(minutes=33)).isoformat(),
            "severity": "warning",
            "service": "etl-worker",
            "metric": "consumer_lag",
            "value": 42000,
            "baseline": 3000,
            "summary": "Kafka consumer lag growing on topic=invoices",
        },
        {
            "id": str(uuid.uuid4()),
            "ts": (now - timedelta(hours=1, minutes=8)).isoformat(),
            "severity": "info",
            "service": "graphql-gw",
            "metric": "rate_limit",
            "value": 88,
            "baseline": 60,
            "summary": "Rate-limit utilisation rising for client c_482",
        },
    ]


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class ChatRequest(BaseModel):
    model: Literal["gpt-5.2", "claude-sonnet-4.5", "gemini-3-pro"] = "gpt-5.2"
    session_id: str
    message: str


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: Literal["user", "assistant"]
    content: str
    model: Optional[str] = None
    ts: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class RCARequest(BaseModel):
    model: Literal["gpt-5.2", "claude-sonnet-4.5", "gemini-3-pro"] = "gpt-5.2"
    title: Optional[str] = None
    log_text: str


class RCAResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    model: str
    severity: str
    confidence: int
    probable_cause: str
    affected_components: List[str]
    suggested_fix: str
    code_snippet: Optional[str] = None
    runbook_links: List[str] = Field(default_factory=list)
    raw_log_excerpt: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ---------------------------------------------------------------------------
# Routes — base
# ---------------------------------------------------------------------------
@api.get("/")
async def root():
    return {"service": "ops-portfolio", "status": "ok"}


@api.get("/health")
async def health():
    return {"status": "healthy", "ts": datetime.now(timezone.utc).isoformat()}


@api.get("/models")
async def list_models():
    return {
        "models": [
            {"key": "gpt-5.2",            "label": "GPT-5.2",          "provider": "OpenAI"},
            {"key": "claude-sonnet-4.5",  "label": "Claude Sonnet 4.5", "provider": "Anthropic"},
            {"key": "gemini-3-pro",       "label": "Gemini 3 Pro",     "provider": "Google"},
        ]
    }


# ---------------------------------------------------------------------------
# Routes — Sentinel-Ops
# ---------------------------------------------------------------------------
@api.get("/sentinel/metrics")
async def sentinel_metrics(points: int = 60):
    points = max(10, min(240, points))
    return {"series": gen_timeseries(points=points)}


@api.get("/sentinel/services")
async def sentinel_services():
    return {"services": gen_services_health()}


@api.get("/sentinel/anomalies")
async def sentinel_anomalies():
    return {"anomalies": gen_anomalies()}


@api.get("/sentinel/logs")
async def sentinel_logs(limit: int = 60, level: Optional[str] = None):
    limit = max(5, min(300, limit))
    return {"logs": gen_logs(limit=limit, level=level)}


SENTINEL_SYSTEM_PROMPT = """You are Sentinel-Ops, a senior SRE / IT-Ops AI assistant embedded in a production observability dashboard.

Operating context (you may assume the user can see this):
- Active services: auth-svc, billing-svc, search-svc, checkout-svc, notify-svc, ingest-svc, graphql-gw, etl-worker
- Telemetry available: CPU%, memory%, error_rate, p95 latency, service uptime, log lines
- Current open anomalies (snapshot):
  * CRITICAL  billing-svc      error_rate 7.4% (baseline 0.6%) — Stripe webhook 5xx spike
  * WARNING   search-svc       p95 latency 980ms (baseline 220ms) — after index rebuild
  * WARNING   etl-worker       consumer_lag 42k (baseline 3k) — Kafka topic=invoices
  * INFO      graphql-gw       rate-limit 88% — client c_482

Behaviour:
- Be concise, technical, and act like an SRE pairing with the on-call engineer.
- Reference specific services/metrics from the context above when relevant.
- When asked for a triage plan, return a numbered checklist (1., 2., 3.).
- When suggesting a fix, mention the rollback / blast-radius consideration.
- Do NOT fabricate metric numbers that contradict the context above.
- Keep replies under ~250 words unless explicitly asked for a deep-dive.
"""


@api.post("/sentinel/chat")
async def sentinel_chat(req: ChatRequest):
    # Persist user message
    user_doc = ChatMessage(session_id=req.session_id, role="user", content=req.message, model=req.model).model_dump()
    await db.sentinel_chat.insert_one(dict(user_doc))

    try:
        reply = await call_llm(
            model_key=req.model,
            system_message=SENTINEL_SYSTEM_PROMPT,
            user_text=req.message,
            session_id=f"sentinel-{req.session_id}",
        )
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        log.exception("LLM call failed")
        raise HTTPException(status_code=502, detail=f"LLM provider error: {e}")

    asst_doc = ChatMessage(session_id=req.session_id, role="assistant", content=reply, model=req.model).model_dump()
    await db.sentinel_chat.insert_one(dict(asst_doc))

    return {"reply": reply, "model": req.model, "ts": asst_doc["ts"]}


@api.get("/sentinel/chat/{session_id}")
async def sentinel_chat_history(session_id: str):
    rows = await db.sentinel_chat.find({"session_id": session_id}, {"_id": 0}).sort("ts", 1).to_list(500)
    return {"messages": rows}


# ---------------------------------------------------------------------------
# Routes — RootCause-AI
# ---------------------------------------------------------------------------
RCA_SYSTEM_PROMPT = """You are RootCause-AI, a production-incident root-cause analysis engine.

Given a raw stack trace, exception, or log dump, you must produce a STRICTLY VALID JSON object with this exact schema (no markdown fences, no commentary outside JSON):

{
  "title": "<short incident title, max 90 chars>",
  "severity": "critical" | "high" | "medium" | "low",
  "confidence": <integer 0-100>,
  "probable_cause": "<2-4 sentence root-cause hypothesis grounded in the input>",
  "affected_components": ["<service or module>", "..."],
  "suggested_fix": "<concrete, actionable fix in 2-5 sentences, mention rollback / verification step>",
  "code_snippet": "<optional minimal code patch or config change, or null>",
  "runbook_links": ["<short title — url-style identifier>", "..."]
}

Rules:
- Always return valid JSON, no preamble, no trailing text.
- If the input is too short / unclear, still return JSON with low confidence and probable_cause explaining the ambiguity.
- Quote specific symbols (exception class, file:line, error code) from the input in probable_cause when possible.
- Keep affected_components to 1-4 entries.
- runbook_links should be 1-3 plausible internal runbook references (not real URLs).
"""


def _extract_json(text: str) -> dict:
    """Best-effort JSON extraction from LLM output."""
    text = text.strip()
    # strip ```json fences
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL | re.IGNORECASE)
    if fence:
        text = fence.group(1).strip()
    # try direct
    try:
        return json.loads(text)
    except Exception:
        pass
    # try finding first {...} block
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            pass
    raise ValueError("Could not parse JSON from LLM response")


@api.post("/rootcause/analyze", response_model=RCAResult)
async def rootcause_analyze(req: RCARequest):
    if not req.log_text or len(req.log_text.strip()) < 10:
        raise HTTPException(status_code=400, detail="log_text is too short to analyze")

    user_payload = (
        "Analyze the following production log / stack trace and return the JSON object as specified.\n\n"
        f"--- BEGIN LOG ---\n{req.log_text[:12000]}\n--- END LOG ---"
    )

    try:
        raw = await call_llm(
            model_key=req.model,
            system_message=RCA_SYSTEM_PROMPT,
            user_text=user_payload,
            session_id=f"rca-{uuid.uuid4().hex[:8]}",
        )
        data = _extract_json(raw)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"LLM returned non-JSON output: {e}")
    except Exception as e:  # noqa: BLE001
        log.exception("RCA failed")
        raise HTTPException(status_code=502, detail=f"LLM provider error: {e}")

    # Coerce into RCAResult
    excerpt = req.log_text.strip().splitlines()
    excerpt_join = "\n".join(excerpt[:8])[:600]

    result = RCAResult(
        title=req.title or str(data.get("title", "Untitled incident"))[:120],
        model=req.model,
        severity=str(data.get("severity", "medium")).lower(),
        confidence=int(data.get("confidence", 60) or 60),
        probable_cause=str(data.get("probable_cause", "")),
        affected_components=[str(x) for x in (data.get("affected_components") or [])][:6],
        suggested_fix=str(data.get("suggested_fix", "")),
        code_snippet=(str(data["code_snippet"]) if data.get("code_snippet") else None),
        runbook_links=[str(x) for x in (data.get("runbook_links") or [])][:4],
        raw_log_excerpt=excerpt_join,
    )

    await db.rca_history.insert_one(result.model_dump())
    return result


@api.get("/rootcause/history")
async def rootcause_history(limit: int = 25):
    rows = await db.rca_history.find({}, {"_id": 0}).sort("created_at", -1).to_list(max(1, min(100, limit)))
    return {"items": rows}


@api.get("/rootcause/{rca_id}")
async def rootcause_get(rca_id: str):
    row = await db.rca_history.find_one({"id": rca_id}, {"_id": 0})
    if not row:
        raise HTTPException(status_code=404, detail="not found")
    return row


# ---------------------------------------------------------------------------
# Mount + middleware
# ---------------------------------------------------------------------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db():
    client.close()
