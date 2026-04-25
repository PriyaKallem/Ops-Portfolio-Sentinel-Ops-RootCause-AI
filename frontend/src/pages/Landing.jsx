import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Activity,
  Bug,
  GitBranch,
  Database,
  Boxes,
  Cpu,
} from "lucide-react";

const HERO_BG =
  "https://images.pexels.com/photos/18545023/pexels-photo-18545023.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=1024&w=1536";

const STACK = [
  "React 19",
  "FastAPI",
  "MongoDB",
  "Recharts",
  "Tailwind",
  "GPT-5.2",
  "Claude 4.5",
  "Gemini 3 Pro",
];

const SKILLS = [
  {
    icon: Activity,
    title: "End-to-end ownership",
    body: "Both projects ship a working data layer, API surface, and UI — discovery → rollout in one repo.",
  },
  {
    icon: Database,
    title: "API & data model design",
    body: "Versioned endpoints under /api/sentinel & /api/rootcause, Pydantic models, MongoDB persistence.",
  },
  {
    icon: Bug,
    title: "Logs · tracing · RCA",
    body: "Structured log viewer, anomaly feed, and a multi-LLM root-cause engine with severity + confidence.",
  },
  {
    icon: GitBranch,
    title: "Production posture",
    body: "12-factor config, hot reload, supervisor-managed processes, deterministic seed data for demos.",
  },
];

export default function Landing() {
  return (
    <div className="text-white">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-[#222]">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url(${HERO_BG})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/80 via-[#050505]/85 to-[#050505]" />
        <div className="absolute inset-0 dot-grid opacity-40" />

        <div className="relative max-w-7xl mx-auto px-6 md:px-12 pt-24 md:pt-32 pb-20 md:pb-28">
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#00E5FF] mb-6 fade-up">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] live-dot inline-block mr-2 align-middle" />
            full-stack · ai-systems · production-grade
          </div>
          <h1
            className="font-display font-black text-4xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] max-w-5xl fade-up"
            data-testid="landing-headline"
          >
            Two production-style apps.
            <br />
            <span className="text-[#00E5FF]">One opinionated</span> portfolio.
          </h1>
          <p className="mt-6 max-w-2xl text-lg md:text-xl text-[#A0A0A0] leading-relaxed fade-up">
            Built for engineering teams that own customer deployments end-to-end:
            instrumented observability, agentic LLM triage, and clean API/data
            design — across a single React + FastAPI + MongoDB stack.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/sentinel"
              className="btn-primary inline-flex items-center gap-2"
              data-testid="hero-cta-sentinel"
            >
              Open Sentinel-Ops <ArrowUpRight size={16} />
            </Link>
            <Link
              to="/rootcause"
              className="btn-ghost inline-flex items-center gap-2"
              data-testid="hero-cta-rootcause"
            >
              Open RootCause-AI <ArrowUpRight size={16} />
            </Link>
          </div>

          {/* stat strip */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 border border-[#222] surface-deep">
            {[
              ["02", "shipped projects"],
              ["3", "LLM providers wired"],
              ["12+", "REST endpoints"],
              ["100%", "instrumented"],
            ].map(([n, l], i) => (
              <div
                key={l}
                className={`p-6 md:p-7 ${
                  i < 3 ? "md:border-r border-[#222]" : ""
                } ${i < 2 ? "border-b md:border-b-0" : ""}`}
              >
                <div className="font-mono text-3xl md:text-4xl font-bold tracking-tight text-white">
                  {n}
                </div>
                <div className="widget-title mt-2">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROJECT CARDS */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-28">
        <div className="widget-title mb-3">// shipped projects</div>
        <h2 className="font-display font-extrabold text-3xl md:text-5xl tracking-tight mb-12">
          Built like internal tools.
          <br />
          <span className="text-[#666]">Not like demos.</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <ProjectCard
            tag="01 / observability"
            title="Sentinel-Ops"
            subtitle="AI IT-Ops Assistant"
            desc="Live metrics dashboard with anomaly detection, service health grid, structured log viewer, and an embedded AI assistant you can chat with — pick between GPT-5.2, Claude 4.5, or Gemini 3 Pro per turn."
            chips={["Recharts", "Anomaly feed", "Multi-LLM chat", "Log viewer"]}
            to="/sentinel"
            testid="project-card-sentinel"
            icon={Activity}
          />
          <ProjectCard
            tag="02 / incident-response"
            title="RootCause-AI"
            subtitle="Production Issue Debugger"
            desc="Paste a stack trace or log dump. The model returns a strict-JSON RCA: probable cause, severity, affected components, suggested fix, and a code patch — with full history persisted."
            chips={["Strict JSON", "RCA history", "Severity scoring", "Patch suggestions"]}
            to="/rootcause"
            testid="project-card-rootcause"
            icon={Bug}
          />
        </div>
      </section>

      {/* WHAT IT PROVES */}
      <section className="border-y border-[#222] bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-24">
          <div className="widget-title mb-3">// what these projects prove</div>
          <h2 className="font-display font-extrabold text-3xl md:text-5xl tracking-tight mb-12 max-w-3xl">
            Mapped directly to the role's
            <span className="text-[#00E5FF]"> non-negotiables</span>.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#222] border border-[#222]">
            {SKILLS.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.title}
                  className="bg-[#121212] p-7 md:p-8 hover:bg-[#1a1a1a] transition-all duration-200"
                >
                  <Icon size={22} className="text-[#00E5FF] mb-4" />
                  <h3 className="font-display font-bold text-xl mb-2">
                    {s.title}
                  </h3>
                  <p className="text-[#A0A0A0] text-sm leading-relaxed">
                    {s.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* STACK */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-24">
        <div className="widget-title mb-3">// stack</div>
        <h2 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight mb-8">
          The exact tools used.
        </h2>
        <div className="flex flex-wrap gap-2">
          {STACK.map((t) => (
            <span
              key={t}
              className="font-mono text-xs px-3 py-2 border border-[#222] text-[#A0A0A0] hover:text-white hover:border-[#00E5FF]/60 transition-all"
            >
              [ {t} ]
            </span>
          ))}
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="border-t border-[#222]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="font-display font-extrabold text-2xl md:text-3xl tracking-tight">
              Ready to triage a real incident?
            </div>
            <p className="text-[#A0A0A0] mt-2">
              Both projects are live below — no auth, no setup.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/sentinel"
              className="btn-primary inline-flex items-center gap-2"
              data-testid="footer-cta-sentinel"
            >
              <Cpu size={16} /> Sentinel-Ops
            </Link>
            <Link
              to="/rootcause"
              className="btn-ghost inline-flex items-center gap-2"
              data-testid="footer-cta-rootcause"
            >
              <Boxes size={16} /> RootCause-AI
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProjectCard({ tag, title, subtitle, desc, chips, to, testid, icon: Icon }) {
  return (
    <Link
      to={to}
      data-testid={testid}
      className="group block surface p-7 md:p-9 hover:-translate-y-1 hover:border-[#00E5FF]/40 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#666]">
          {tag}
        </div>
        <Icon size={22} className="text-[#00E5FF]" />
      </div>
      <div className="font-mono text-xs uppercase tracking-[0.2em] text-[#A0A0A0] mb-2">
        {subtitle}
      </div>
      <h3 className="font-display font-black text-3xl md:text-4xl tracking-tight mb-4">
        {title}
      </h3>
      <p className="text-[#A0A0A0] leading-relaxed mb-6 max-w-xl">{desc}</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {chips.map((c) => (
          <span
            key={c}
            className="font-mono text-[10px] uppercase tracking-[0.15em] px-2 py-1 border border-[#222] text-[#A0A0A0]"
          >
            {c}
          </span>
        ))}
      </div>
      <div className="inline-flex items-center gap-1.5 text-[#00E5FF] font-mono text-xs uppercase tracking-[0.2em] group-hover:gap-3 transition-all">
        Open project <ArrowUpRight size={14} />
      </div>
    </Link>
  );
}
