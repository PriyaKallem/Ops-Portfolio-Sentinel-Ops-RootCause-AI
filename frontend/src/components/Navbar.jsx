import { NavLink, Link } from "react-router-dom";
import { Activity, Bug, Terminal } from "lucide-react";

const linkClass = ({ isActive }) =>
  `font-mono text-xs uppercase tracking-[0.18em] px-3 py-2 rounded-sm transition-all duration-200 ${
    isActive
      ? "text-[#00E5FF] bg-[#0a0a0a] border border-[#00E5FF]/40"
      : "text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A] border border-transparent"
  }`;

export default function Navbar() {
  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-xl bg-[#050505]/70 border-b border-white/10"
      data-testid="app-navbar"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2.5 group"
          data-testid="nav-home-link"
        >
          <div className="w-7 h-7 border border-[#00E5FF] flex items-center justify-center">
            <Terminal size={14} className="text-[#00E5FF]" />
          </div>
          <span className="font-display font-extrabold tracking-tight text-white text-base">
            OPS<span className="text-[#00E5FF]">.</span>PORTFOLIO
          </span>
        </Link>

        <nav className="flex items-center gap-1.5">
          <NavLink to="/" end className={linkClass} data-testid="nav-landing-link">
            Overview
          </NavLink>
          <NavLink
            to="/sentinel"
            className={linkClass}
            data-testid="nav-sentinel-link"
          >
            <span className="inline-flex items-center gap-1.5">
              <Activity size={12} /> Sentinel-Ops
            </span>
          </NavLink>
          <NavLink
            to="/rootcause"
            className={linkClass}
            data-testid="nav-rootcause-link"
          >
            <span className="inline-flex items-center gap-1.5">
              <Bug size={12} /> RootCause-AI
            </span>
          </NavLink>
        </nav>

        <div className="hidden md:flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#A0A0A0]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00CC66] live-dot inline-block" />
          systems online
        </div>
      </div>
    </header>
  );
}
