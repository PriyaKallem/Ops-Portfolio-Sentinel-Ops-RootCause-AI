import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { Send, AlertTriangle, Activity, Cpu, Database } from "lucide-react";
import ModelPicker from "@/components/ModelPicker";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const sevColor = {
  critical: "#FF3366",
  warning: "#FFBB00",
  info: "#00E5FF",
};
const statusColor = {
  healthy: "#00CC66",
  degraded: "#FFBB00",
  down: "#FF3366",
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="surface-deep p-2.5 font-mono text-[11px]">
      <div className="text-[#666] mb-1">
        {new Date(label).toLocaleTimeString()}
      </div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span
            className="w-2 h-2 inline-block"
            style={{ background: p.color }}
          />
          <span className="text-[#A0A0A0]">{p.dataKey}</span>
          <span className="text-white font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function SentinelOps() {
  const [series, setSeries] = useState([]);
  const [services, setServices] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logFilter, setLogFilter] = useState("ALL");

  const [model, setModel] = useState("gpt-5.2");
  const [chat, setChat] = useState([
    {
      role: "assistant",
      content:
        "I'm Sentinel-Ops. I can see the live anomaly feed on the left. Ask me to triage the billing-svc spike, draft a runbook, or summarise current health.",
      ts: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sessionId = useMemo(
    () => `s_${Math.random().toString(36).slice(2, 10)}`,
    []
  );
  const chatScroll = useRef(null);

  const refresh = async () => {
    try {
      const [m, s, a, l] = await Promise.all([
        axios.get(`${API}/sentinel/metrics?points=60`),
        axios.get(`${API}/sentinel/services`),
        axios.get(`${API}/sentinel/anomalies`),
        axios.get(
          `${API}/sentinel/logs?limit=80${
            logFilter !== "ALL" ? `&level=${logFilter}` : ""
          }`
        ),
      ]);
      setSeries(m.data.series);
      setServices(s.data.services);
      setAnomalies(a.data.anomalies);
      setLogs(l.data.logs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logFilter]);

  useEffect(() => {
    chatScroll.current?.scrollTo({
      top: chatScroll.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chat]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || sending) return;
    setSending(true);
    setChat((c) => [...c, { role: "user", content: msg, ts: new Date().toISOString() }]);
    setInput("");
    try {
      const res = await axios.post(`${API}/sentinel/chat`, {
        model,
        session_id: sessionId,
        message: msg,
      });
      setChat((c) => [
        ...c,
        { role: "assistant", content: res.data.reply, ts: res.data.ts, model },
      ]);
    } catch (e) {
      setChat((c) => [
        ...c,
        {
          role: "assistant",
          content:
            "LLM call failed. Check backend logs / EMERGENT_LLM_KEY balance.",
          ts: new Date().toISOString(),
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const latest = series[series.length - 1] || {};
  const KPIS = [
    { k: "CPU", v: latest.cpu ? `${latest.cpu}%` : "—", icon: Cpu },
    {
      k: "MEM",
      v: latest.mem ? `${latest.mem}%` : "—",
      icon: Database,
    },
    {
      k: "ERR/s",
      v: latest.error_rate != null ? `${latest.error_rate}` : "—",
      icon: AlertTriangle,
    },
    {
      k: "P95",
      v: latest.p95_latency ? `${latest.p95_latency}ms` : "—",
      icon: Activity,
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)]" data-testid="sentinel-page">
      {/* Header */}
      <div className="border-b border-[#222] bg-[#0a0a0a]">
        <div className="max-w-[1600px] mx-auto px-6 py-5 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="widget-title">// project 01 · observability</div>
            <h1 className="font-display font-black text-3xl md:text-4xl tracking-tight mt-1">
              Sentinel-Ops <span className="text-[#666]">/ control room</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[#A0A0A0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00CC66] live-dot inline-block" />
            live · refresh 8s
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-6 grid grid-cols-12 gap-4">
        {/* LEFT — main */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#222] border border-[#222]">
            {KPIS.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.k}
                  data-testid={`kpi-${kpi.k.toLowerCase()}`}
                  className="bg-[#121212] p-5 hover:bg-[#1a1a1a] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="widget-title">{kpi.k}</div>
                    <Icon size={14} className="text-[#666]" />
                  </div>
                  <div className="font-mono text-3xl font-bold mt-2 tracking-tighter">
                    {kpi.v}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chart */}
          <div className="surface p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="widget-title">cpu · memory · last 60m</div>
              <div className="font-mono text-[10px] text-[#666] uppercase tracking-[0.2em]">
                {series.length} pts
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series}>
                  <defs>
                    <linearGradient id="cpuG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#00E5FF" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="memG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFBB00" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#FFBB00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1a1a1a" vertical={false} />
                  <XAxis
                    dataKey="t"
                    tickFormatter={(t) =>
                      new Date(t).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    }
                    stroke="#444"
                    fontSize={10}
                  />
                  <YAxis stroke="#444" fontSize={10} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    stroke="#00E5FF"
                    strokeWidth={1.5}
                    fill="url(#cpuG)"
                  />
                  <Area
                    type="monotone"
                    dataKey="mem"
                    stroke="#FFBB00"
                    strokeWidth={1.5}
                    fill="url(#memG)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Error rate + latency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="surface p-5">
              <div className="widget-title mb-3">error rate</div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series}>
                    <CartesianGrid stroke="#1a1a1a" vertical={false} />
                    <XAxis dataKey="t" hide />
                    <YAxis stroke="#444" fontSize={10} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="error_rate"
                      stroke="#FF3366"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="surface p-5">
              <div className="widget-title mb-3">p95 latency</div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series}>
                    <CartesianGrid stroke="#1a1a1a" vertical={false} />
                    <XAxis dataKey="t" hide />
                    <YAxis stroke="#444" fontSize={10} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="p95_latency"
                      stroke="#00CC66"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Services grid */}
          <div className="surface">
            <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
              <div className="widget-title">services · health</div>
              <div className="font-mono text-[10px] text-[#666] uppercase tracking-[0.2em]">
                {services.length} svcs
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#222]">
              {services.map((s) => (
                <div
                  key={s.name}
                  data-testid={`service-${s.name}`}
                  className="bg-[#121212] p-4 hover:bg-[#1a1a1a] transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="font-mono text-sm text-white">{s.name}</div>
                    <div className="font-mono text-[10px] text-[#666] mt-1">
                      {s.region} · {s.rps} rps · p95 {s.p95_ms}ms
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="font-mono text-[10px] uppercase tracking-[0.18em] flex items-center gap-1.5 justify-end"
                      style={{ color: statusColor[s.status] }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full inline-block"
                        style={{ background: statusColor[s.status] }}
                      />
                      {s.status}
                    </div>
                    <div className="font-mono text-[10px] text-[#666] mt-1">
                      {s.uptime_pct}% up · err {s.error_rate}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Logs */}
          <div className="surface-deep">
            <div className="px-5 py-3 border-b border-[#222] flex items-center justify-between">
              <div className="widget-title">log stream</div>
              <div className="flex gap-1">
                {["ALL", "INFO", "WARN", "ERROR"].map((lv) => (
                  <button
                    key={lv}
                    data-testid={`log-filter-${lv.toLowerCase()}`}
                    onClick={() => setLogFilter(lv)}
                    className={`font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-sm border transition-all ${
                      logFilter === lv
                        ? "border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/10"
                        : "border-[#222] text-[#666] hover:text-white"
                    }`}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            </div>
            <div
              className="font-mono text-[11px] leading-relaxed max-h-72 overflow-auto p-4"
              data-testid="log-viewer"
            >
              {logs.map((l) => (
                <div key={l.id} className="flex gap-3 hover:bg-[#0f0f0f] py-0.5">
                  <span className="text-[#444] shrink-0">
                    {new Date(l.ts).toLocaleTimeString()}
                  </span>
                  <span
                    className="shrink-0 w-12"
                    style={{
                      color:
                        l.level === "ERROR"
                          ? "#FF3366"
                          : l.level === "WARN"
                          ? "#FFBB00"
                          : "#00CC66",
                    }}
                  >
                    {l.level}
                  </span>
                  <span className="text-[#00E5FF] shrink-0 w-28">{l.service}</span>
                  <span className="text-[#A0A0A0]">{l.message}</span>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-[#666]">no logs in stream...</div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — anomalies + chat */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Anomalies */}
          <div className="surface" data-testid="anomalies-panel">
            <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
              <div className="widget-title">anomaly feed</div>
              <span className="font-mono text-[10px] text-[#FF3366]">
                {anomalies.filter((a) => a.severity === "critical").length} critical
              </span>
            </div>
            <div className="grid-divider">
              {anomalies.map((a) => (
                <div
                  key={a.id}
                  className="p-4 hover:bg-[#1a1a1a] transition-all"
                  data-testid={`anomaly-${a.severity}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="font-mono text-[10px] uppercase tracking-[0.18em] px-1.5 py-0.5"
                      style={{
                        color: sevColor[a.severity],
                        border: `1px solid ${sevColor[a.severity]}`,
                      }}
                    >
                      {a.severity}
                    </span>
                    <span className="font-mono text-[10px] text-[#666]">
                      {new Date(a.ts).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-[#00E5FF] mb-1">
                    {a.service} · {a.metric}
                  </div>
                  <div className="text-sm text-white leading-snug">
                    {a.summary}
                  </div>
                  <div className="font-mono text-[10px] text-[#666] mt-1.5">
                    value {a.value} · baseline {a.baseline}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="surface flex flex-col" style={{ height: "560px" }}>
            <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
              <div className="widget-title">ai assistant</div>
              <ModelPicker value={model} onChange={setModel} testid="sentinel-model" />
            </div>
            <div
              ref={chatScroll}
              className="flex-1 overflow-auto p-4 space-y-3"
              data-testid="sentinel-chat-log"
            >
              {chat.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-[#00E5FF] text-black font-medium rounded-sm"
                        : `surface-deep text-[#E5E5E5] ${
                            m.error ? "border-[#FF3366]/50" : ""
                          }`
                    }`}
                  >
                    {m.role === "assistant" && (
                      <div className="font-mono text-[9px] text-[#666] uppercase tracking-[0.2em] mb-1">
                        {m.model || "sentinel-ops"}
                      </div>
                    )}
                    {m.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="font-mono text-[10px] text-[#666] uppercase tracking-[0.2em]">
                  thinking...
                </div>
              )}
            </div>
            <div className="border-t border-[#222] p-3 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask about billing-svc spike, p95 regression..."
                className="tactile-input flex-1 px-3 py-2 text-sm"
                data-testid="sentinel-chat-input"
                disabled={sending}
              />
              <button
                onClick={send}
                disabled={sending || !input.trim()}
                className="btn-primary flex items-center gap-1.5"
                data-testid="sentinel-chat-send"
              >
                <Send size={14} /> Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
