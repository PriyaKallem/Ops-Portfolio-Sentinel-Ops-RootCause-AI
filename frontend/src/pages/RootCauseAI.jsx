import { useEffect, useState } from "react";
import axios from "axios";
import { Bug, Zap, Clock, ChevronRight, Copy, Check } from "lucide-react";
import ModelPicker from "@/components/ModelPicker";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SAMPLE = `[2026-01-14T08:42:11Z] ERROR billing-svc stripe webhook handler
Traceback (most recent call last):
  File "/app/billing/webhook.py", line 142, in handle_stripe_event
    return self._process(event)
  File "/app/billing/webhook.py", line 168, in _process
    invoice = Invoice.objects.get(stripe_id=event["data"]["object"]["id"])
  File "/usr/local/lib/python3.11/site-packages/django/db/models/manager.py", line 87, in get
    return self.get_queryset().get(*args, **kwargs)
billing.models.Invoice.DoesNotExist: Invoice matching query does not exist.

[2026-01-14T08:42:11Z] ERROR billing-svc stripe.error.SignatureVerificationError: No signatures found matching the expected signature for payload
[2026-01-14T08:42:12Z] WARN  billing-svc retrying webhook (attempt 3/5) payload_id=p_7f3a91
[2026-01-14T08:42:14Z] ERROR billing-svc 5xx returned to upstream, queue depth=128`;

const sevStyle = {
  critical: { bg: "#FF3366", text: "#FFFFFF" },
  high: { bg: "#FF6633", text: "#FFFFFF" },
  medium: { bg: "#FFBB00", text: "#000000" },
  low: { bg: "#00CC66", text: "#000000" },
};

export default function RootCauseAI() {
  const [model, setModel] = useState("claude-sonnet-4.5");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);

  const loadHistory = async () => {
    try {
      const res = await axios.get(`${API}/rootcause/history?limit=20`);
      setHistory(res.data.items || []);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const analyze = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await axios.post(`${API}/rootcause/analyze`, {
        model,
        title: title || undefined,
        log_text: text,
      });
      setResult(res.data);
      loadHistory();
    } catch (e) {
      setError(
        e?.response?.data?.detail || "Analysis failed. Check backend logs."
      );
    } finally {
      setLoading(false);
    }
  };

  const copySnippet = async () => {
    if (!result?.code_snippet) return;
    try {
      await navigator.clipboard.writeText(result.code_snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {}
  };

  const loadHistoryItem = (item) => {
    setResult(item);
    setText(item.raw_log_excerpt || "");
    setTitle(item.title || "");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]" data-testid="rootcause-page">
      {/* Header */}
      <div className="border-b border-[#222] bg-[#0a0a0a] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "url(https://images.pexels.com/photos/8134609/pexels-photo-8134609.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative max-w-[1600px] mx-auto px-6 py-5 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="widget-title">// project 02 · incident-response</div>
            <h1 className="font-display font-black text-3xl md:text-4xl tracking-tight mt-1">
              RootCause-AI{" "}
              <span className="text-[#666]">/ paste-trace-get-rca</span>
            </h1>
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#A0A0A0]">
            strict-json output · multi-model · history persisted
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-6 grid grid-cols-12 gap-4">
        {/* LEFT — input + result */}
        <div className="col-span-12 lg:col-span-9 space-y-4">
          {/* Input */}
          <div className="surface">
            <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between flex-wrap gap-3">
              <div className="widget-title">incident input · stack trace / log dump</div>
              <ModelPicker
                value={model}
                onChange={setModel}
                testid="rca-model"
              />
            </div>
            <div className="p-5 space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional title (e.g. billing-svc 5xx after deploy 0142)"
                className="tactile-input w-full px-3 py-2 text-sm"
                data-testid="rca-title-input"
              />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste raw stack trace, exception, or multi-line log dump here..."
                className="tactile-input w-full px-3 py-3 text-sm font-mono leading-relaxed min-h-[280px]"
                data-testid="rca-log-input"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={analyze}
                  disabled={loading || !text.trim()}
                  className="btn-primary inline-flex items-center gap-2"
                  data-testid="rca-analyze-button"
                >
                  <Zap size={15} />
                  {loading ? "Analyzing..." : "Analyze incident"}
                </button>
                <button
                  onClick={() => setText(SAMPLE)}
                  className="btn-ghost text-xs font-mono uppercase tracking-[0.18em]"
                  data-testid="rca-load-sample"
                >
                  Load sample trace
                </button>
                <button
                  onClick={() => {
                    setText("");
                    setTitle("");
                    setResult(null);
                    setError("");
                  }}
                  className="btn-ghost text-xs font-mono uppercase tracking-[0.18em]"
                  data-testid="rca-clear"
                >
                  Clear
                </button>
                <span className="font-mono text-[10px] text-[#666] ml-auto">
                  {text.length} chars
                </span>
              </div>
              {error && (
                <div
                  className="font-mono text-xs text-[#FF3366] border border-[#FF3366]/40 bg-[#FF3366]/10 p-3"
                  data-testid="rca-error"
                >
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="surface fade-up" data-testid="rca-result">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="widget-title">root-cause analysis</div>
                  <div className="font-display font-bold text-xl mt-1">
                    {result.title}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 font-bold rounded-sm"
                    style={{
                      background: sevStyle[result.severity]?.bg || "#666",
                      color: sevStyle[result.severity]?.text || "#fff",
                    }}
                    data-testid="rca-severity"
                  >
                    {result.severity}
                  </span>
                  <div className="font-mono text-[10px] text-[#666] uppercase tracking-[0.2em]">
                    confidence
                  </div>
                  <div className="font-mono text-2xl font-bold tracking-tighter text-[#00E5FF]">
                    {result.confidence}
                    <span className="text-sm text-[#666]">%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#222]">
                <div className="bg-[#121212] p-5">
                  <div className="widget-title mb-2">probable cause</div>
                  <p className="text-[#E5E5E5] text-sm leading-relaxed">
                    {result.probable_cause}
                  </p>
                </div>
                <div className="bg-[#121212] p-5">
                  <div className="widget-title mb-2">suggested fix</div>
                  <p className="text-[#E5E5E5] text-sm leading-relaxed">
                    {result.suggested_fix}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#222] border-t border-[#222]">
                <div className="bg-[#121212] p-5">
                  <div className="widget-title mb-2">affected components</div>
                  <div className="flex flex-wrap gap-2">
                    {result.affected_components?.map((c) => (
                      <span
                        key={c}
                        className="font-mono text-[11px] px-2 py-1 border border-[#FF3366]/40 text-[#FF3366]"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-[#121212] p-5">
                  <div className="widget-title mb-2">runbook references</div>
                  <ul className="space-y-1">
                    {(result.runbook_links || []).map((r, i) => (
                      <li
                        key={i}
                        className="font-mono text-xs text-[#A0A0A0] flex items-center gap-2"
                      >
                        <ChevronRight size={12} className="text-[#00E5FF]" />
                        {r}
                      </li>
                    ))}
                    {(!result.runbook_links ||
                      result.runbook_links.length === 0) && (
                      <li className="font-mono text-xs text-[#666]">
                        no runbooks suggested
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {result.code_snippet && (
                <div className="border-t border-[#222]">
                  <div className="px-5 py-3 flex items-center justify-between">
                    <div className="widget-title">suggested patch</div>
                    <button
                      onClick={copySnippet}
                      className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#A0A0A0] hover:text-[#00E5FF] inline-flex items-center gap-1.5"
                      data-testid="rca-copy-snippet"
                    >
                      {copied ? (
                        <>
                          <Check size={12} /> copied
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> copy
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="bg-black p-5 overflow-auto text-[12px] font-mono text-[#00E5FF] leading-relaxed border-t border-[#222]">
                    <code>{result.code_snippet}</code>
                  </pre>
                </div>
              )}

              <div className="px-5 py-3 border-t border-[#222] flex items-center justify-between font-mono text-[10px] text-[#666] uppercase tracking-[0.2em]">
                <span>model · {result.model}</span>
                <span>
                  {result.created_at
                    ? new Date(result.created_at).toLocaleString()
                    : ""}
                </span>
              </div>
            </div>
          )}

          {!result && !loading && (
            <div className="surface-deep p-10 text-center">
              <Bug
                size={28}
                className="text-[#00E5FF] mx-auto mb-3 opacity-70"
              />
              <div className="font-display font-bold text-lg">
                Awaiting input.
              </div>
              <p className="text-[#666] text-sm mt-1 max-w-md mx-auto">
                Paste a real stack trace or click "Load sample trace" to see how
                the engine returns a structured RCA.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT — history */}
        <div className="col-span-12 lg:col-span-3">
          <div className="surface sticky top-20" data-testid="rca-history-panel">
            <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
              <div className="widget-title">history</div>
              <Clock size={13} className="text-[#666]" />
            </div>
            <div className="grid-divider max-h-[700px] overflow-auto">
              {history.length === 0 && (
                <div className="p-5 font-mono text-xs text-[#666]">
                  no analyses yet
                </div>
              )}
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => loadHistoryItem(h)}
                  className="w-full text-left p-4 hover:bg-[#1a1a1a] transition-all block"
                  data-testid={`history-item-${h.id}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="font-mono text-[9px] uppercase tracking-[0.18em] px-1.5 py-0.5"
                      style={{
                        color: sevStyle[h.severity]?.bg,
                        border: `1px solid ${sevStyle[h.severity]?.bg}`,
                      }}
                    >
                      {h.severity}
                    </span>
                    <span className="font-mono text-[9px] text-[#666]">
                      {new Date(h.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm text-white leading-snug line-clamp-2">
                    {h.title}
                  </div>
                  <div className="font-mono text-[10px] text-[#666] mt-1">
                    {h.model} · {h.confidence}%
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
