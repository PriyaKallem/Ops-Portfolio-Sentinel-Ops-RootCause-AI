"""Backend API tests for Sentinel-Ops + RootCause-AI portfolio app."""
import os
import uuid
import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE:
    # Fallback: read frontend .env directly
    fe = Path("/app/frontend/.env").read_text()
    for line in fe.splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE = line.split("=", 1)[1].strip().rstrip("/")
            break

API = f"{BASE}/api"
TIMEOUT = 90


# ---- base ----
def test_health():
    r = requests.get(f"{API}/health", timeout=TIMEOUT)
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


def test_models():
    r = requests.get(f"{API}/models", timeout=TIMEOUT)
    assert r.status_code == 200
    keys = [m["key"] for m in r.json()["models"]]
    assert set(keys) == {"gpt-5.2", "claude-sonnet-4.5", "gemini-3-pro"}


# ---- sentinel telemetry ----
def test_metrics():
    r = requests.get(f"{API}/sentinel/metrics?points=60", timeout=TIMEOUT)
    assert r.status_code == 200
    series = r.json()["series"]
    assert len(series) == 60
    s0 = series[0]
    for k in ("t", "cpu", "mem", "error_rate", "p95_latency"):
        assert k in s0


def test_services():
    r = requests.get(f"{API}/sentinel/services", timeout=TIMEOUT)
    assert r.status_code == 200
    svcs = r.json()["services"]
    assert len(svcs) == 8
    assert {"name", "status", "uptime_pct", "rps"}.issubset(svcs[0].keys())


def test_anomalies():
    r = requests.get(f"{API}/sentinel/anomalies", timeout=TIMEOUT)
    assert r.status_code == 200
    a = r.json()["anomalies"]
    assert len(a) >= 3
    crits = [x for x in a if x["severity"] == "critical" and x["service"] == "billing-svc"]
    assert crits, "expected critical billing-svc anomaly"


def test_logs_default():
    r = requests.get(f"{API}/sentinel/logs?limit=40", timeout=TIMEOUT)
    assert r.status_code == 200
    logs = r.json()["logs"]
    assert len(logs) == 40
    for k in ("id", "ts", "level", "service", "message"):
        assert k in logs[0]


def test_logs_filter_error():
    r = requests.get(f"{API}/sentinel/logs?limit=40&level=ERROR", timeout=TIMEOUT)
    assert r.status_code == 200
    logs = r.json()["logs"]
    assert len(logs) > 0
    # most should be ERROR (filter biases toward, not strict)
    err_count = sum(1 for x in logs if x["level"] == "ERROR")
    assert err_count >= len(logs) * 0.7, f"only {err_count}/{len(logs)} are ERROR"


# ---- sentinel chat (LLM) ----
@pytest.mark.parametrize("model", ["gpt-5.2", "claude-sonnet-4.5"])
def test_sentinel_chat(model):
    sid = f"test-{uuid.uuid4().hex[:8]}"
    r = requests.post(
        f"{API}/sentinel/chat",
        json={"model": model, "session_id": sid, "message": "Briefly: top action for billing-svc anomaly?"},
        timeout=TIMEOUT,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["reply"] and len(body["reply"]) > 5
    assert body["model"] == model
    # history persisted
    h = requests.get(f"{API}/sentinel/chat/{sid}", timeout=TIMEOUT)
    assert h.status_code == 200
    msgs = h.json()["messages"]
    assert len(msgs) == 2
    assert msgs[0]["role"] == "user"
    assert msgs[1]["role"] == "assistant"


# ---- rootcause ----
SAMPLE_TRACE = """[2026-01-12 10:14:22] ERROR billing-svc - Stripe webhook handler crashed
Traceback (most recent call last):
  File "/app/services/billing/webhook.py", line 87, in handle_stripe_event
    invoice = StripeClient.retrieve_invoice(event.id)
  File "/app/lib/stripe_client.py", line 142, in retrieve_invoice
    resp = self._http.get(f"/v1/invoices/{invoice_id}", timeout=2.0)
requests.exceptions.ReadTimeout: HTTPSConnectionPool(host='api.stripe.com'): Read timed out (read timeout=2.0)
"""


def test_rca_short_input_400():
    r = requests.post(f"{API}/rootcause/analyze", json={"model": "gpt-5.2", "log_text": "boom"}, timeout=TIMEOUT)
    assert r.status_code == 400


@pytest.mark.parametrize("model", ["gpt-5.2", "claude-sonnet-4.5"])
def test_rca_analyze(model):
    r = requests.post(
        f"{API}/rootcause/analyze",
        json={"model": model, "title": f"TEST_{model}", "log_text": SAMPLE_TRACE},
        timeout=TIMEOUT,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["severity"] in ("critical", "high", "medium", "low")
    assert isinstance(d["confidence"], int) and 0 <= d["confidence"] <= 100
    assert d["probable_cause"]
    assert d["suggested_fix"]
    assert isinstance(d["affected_components"], list) and len(d["affected_components"]) >= 1
    # GET by id
    g = requests.get(f"{API}/rootcause/{d['id']}", timeout=TIMEOUT)
    assert g.status_code == 200
    assert g.json()["id"] == d["id"]


def test_rca_history():
    r = requests.get(f"{API}/rootcause/history", timeout=TIMEOUT)
    assert r.status_code == 200
    items = r.json()["items"]
    assert isinstance(items, list)
    assert len(items) >= 1
