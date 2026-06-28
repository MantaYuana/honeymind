"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import AttackTree from "@/components/AttackTree";
import IocFeed from "@/components/IocFeed";

interface LogEntry {
  session_id: string;
  ip_address: string;
  command: string;
  timestamp: string;
}

interface Intel {
  session_id: string;
  ip_address: string;
  score: number;
  archetype: string;
  anomaly_score: number;
  tier: number;
  received_at?: number;
}

interface Ioc {
  session_id: string;
  source_ip: string;
  generated_at: string;
  suggested_block_rule: string;
  indicators: { urls: string[]; commands: string[] };
}

const TIER_LABEL = ["Benign", "Suspicious", "Hostile", "Confirmed"];
const TIER_COLOR = ["#3b82f6", "#eab308", "#f59e0b", "#ef4444"];

// Mirror of ai/threat_scorer.py weights, only for client-side log colouring.
const MALICIOUS = [
  "wget",
  "curl",
  "nc",
  "nmap",
  "chmod",
  "rm",
  "/etc/shadow",
  "/etc/passwd",
];

function severityOf(cmd: string): { tag: string; color: string } {
  const c = cmd.toLowerCase();
  if (MALICIOUS.some((m) => c.includes(m)))
    return { tag: "CRIT", color: "#ef4444" };
  if (c.startsWith("cat") || c.startsWith("sudo") || c.startsWith("ssh"))
    return { tag: "WARN", color: "#F59E0B" };
  return { tag: "CMD", color: "#8aebff" };
}

function timeAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function MetricCard({
  label,
  value,
  icon,
  color,
  barPct,
  note,
  pulse,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
  barPct: number;
  note?: string;
  pulse?: boolean;
}) {
  return (
    <div
      className={`glass-panel relative flex flex-col overflow-hidden rounded-lg p-4 ${
        pulse ? "threat-pulse" : ""
      }`}
    >
      <div
        className="absolute inset-0 z-0"
        style={{
          background: `linear-gradient(to bottom right, ${color}0d, transparent)`,
        }}
      />
      <div className="z-10 flex items-start justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#859397]">
          {label}
        </span>
        <span
          className="material-symbols-outlined text-[20px]"
          style={{ color }}
        >
          {icon}
        </span>
      </div>
      <div className="z-10 mt-2 flex items-baseline gap-2">
        <span
          className="text-[32px] font-bold leading-none"
          style={{ color: pulse ? color : "#d4e4fa" }}
        >
          {value}
        </span>
        {note && (
          <span className="text-[11px] font-bold uppercase" style={{ color }}>
            {note}
          </span>
        )}
      </div>
      <div className="absolute bottom-0 left-0 h-1 w-full bg-[#273647]">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${Math.min(100, barPct)}%`,
            background: color,
            boxShadow: `0 0 10px ${color}cc`,
          }}
        />
      </div>
    </div>
  );
}

const NAV = [
  { icon: "dashboard", label: "Dashboard", active: true },
  { icon: "public", label: "Live Map" },
  { icon: "settings_ethernet", label: "Sessions" },
  { icon: "phonelink_setup", label: "Threat Intel" },
  { icon: "notifications_active", label: "Alerts" },
  { icon: "description", label: "Reports" },
];

export default function Home() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [intel, setIntel] = useState<Record<string, Intel>>({});
  const [iocs, setIocs] = useState<Ioc[]>([]);
  const [connected, setConnected] = useState(false);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const socket: Socket = io();
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("ssh_activity", (d: LogEntry) =>
      setLogs((prev) => [...prev.slice(-300), d]),
    );
    socket.on("intel", (d: Intel) =>
      setIntel((prev) => ({
        ...prev,
        [d.session_id]: { ...d, received_at: Date.now() },
      })),
    );
    socket.on("ioc_feed", (d: Ioc) =>
      setIocs((prev) => [d, ...prev].slice(0, 50)),
    );
    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const intelRows = useMemo(
    () => Object.values(intel).sort((a, b) => b.score - a.score),
    [intel],
  );
  const sessionCount = useMemo(
    () => new Set(logs.map((l) => l.session_id)).size,
    [logs],
  );
  const maxTier = intelRows.reduce((m, r) => Math.max(m, r.tier), 0);

  return (
    <div className="flex h-screen overflow-hidden bg-[#051424] font-sans text-[#d4e4fa]">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <nav className="fixed left-0 top-0 z-50 flex h-full w-[72px] flex-col items-center border-r border-[#3c494c] bg-[#122131] py-4">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[#22d3ee]/50 bg-[#22d3ee]/20">
            <span className="material-symbols-outlined fill-icon text-[#8aebff]">
              shield
            </span>
          </div>
        </div>
        <div className="flex w-full flex-1 flex-col gap-2">
          {NAV.map((n) => (
            <a
              key={n.label}
              aria-label={n.label}
              href="#"
              className={`group relative flex w-full justify-center py-3 transition-colors ${
                n.active
                  ? "border-l-2 border-[#22d3ee] bg-[#22d3ee]/10 text-[#8aebff]"
                  : "text-[#859397] hover:bg-[#273647]/50 hover:text-[#bbc9cd]"
              }`}
            >
              <span className="material-symbols-outlined">{n.icon}</span>
              <span className="pointer-events-none absolute left-full ml-4 z-50 whitespace-nowrap rounded border border-[#3c494c] bg-[#1c2b3c] px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-[#d4e4fa] opacity-0 transition-opacity group-hover:opacity-100">
                {n.label}
              </span>
            </a>
          ))}
        </div>
        <div className="mt-auto flex w-full flex-col items-center gap-2 border-t border-[#3c494c]/30 pt-4">
          <div className="group relative mb-2 w-full px-2">
            <button
              aria-label="Isolate Host"
              className="glow-red flex h-10 w-full items-center justify-center rounded bg-[#ef4444] text-white transition-all hover:bg-[#ef4444]/90 active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">
                dangerous
              </span>
            </button>
          </div>
          <a
            href="#"
            className="flex w-full justify-center py-2 text-[#859397] hover:text-[#bbc9cd]"
          >
            <span className="material-symbols-outlined">settings</span>
          </a>
        </div>
      </nav>

      {/* ── Main column ─────────────────────────────────────── */}
      <div className="relative ml-[72px] flex h-full flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#051424]/80 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-[#8aebff]">
              HoneyMind SOC
            </h1>
            <div className="relative ml-4 hidden md:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#3c494c]">
                search
              </span>
              <input
                className="w-64 rounded border border-[#3c494c] bg-[#0A0E14] py-1.5 pl-9 pr-4 text-sm text-[#d4e4fa] placeholder:text-[#3c494c] focus:border-[#22d3ee] focus:outline-none focus:ring-1 focus:ring-[#22d3ee]/50"
                placeholder="Search hosts, IPs, alerts..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`mr-4 hidden items-center gap-2 rounded-full border px-3 py-1 lg:flex ${
                connected
                  ? "border-[#22d3ee]/20 bg-[#22d3ee]/10"
                  : "border-[#ef4444]/30 bg-[#ef4444]/10"
              }`}
            >
              <div
                className={`h-2 w-2 animate-pulse rounded-full ${connected ? "bg-[#22d3ee]" : "bg-[#ef4444]"}`}
                style={{
                  boxShadow: connected
                    ? "0 0 8px rgba(34,211,238,0.6)"
                    : "0 0 8px rgba(239,68,68,0.6)",
                }}
              />
              <span
                className={`text-[11px] font-bold uppercase tracking-widest ${connected ? "text-[#8aebff]" : "text-[#ffb4ab]"}`}
              >
                {connected ? "Vigilance AI Active" : "Disconnected"}
              </span>
            </div>
            <button className="relative rounded-full p-2 text-[#bbc9cd] hover:bg-[#273647]/30 hover:text-[#8aebff]">
              <span className="material-symbols-outlined">notifications</span>
              {maxTier >= 3 && (
                <span className="glow-red absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-[#0A0E14] bg-[#ef4444]" />
              )}
            </button>
            <button className="ml-2 rounded-full border border-[#3c494c]/30 bg-[#273647] p-2 text-[#bbc9cd] hover:text-[#8aebff]">
              <span className="material-symbols-outlined">account_circle</span>
            </button>
          </div>
        </header>

        {/* Canvas */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto grid max-w-[1600px] grid-cols-12 gap-4">
            {/* Metric bar */}
            <div className="col-span-12 mb-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Commands Captured"
                value={logs.length.toLocaleString()}
                icon="gavel"
                color="#ef4444"
                barPct={Math.min(100, (logs.length / 100) * 100)}
              />
              <MetricCard
                label="Active Sessions"
                value={sessionCount.toLocaleString()}
                icon="dns"
                color="#22d3ee"
                barPct={Math.min(100, sessionCount * 10)}
              />
              <MetricCard
                label="IOCs Exported"
                value={iocs.length.toLocaleString()}
                icon="verified_user"
                color="#10B981"
                barPct={Math.min(100, iocs.length * 20)}
              />
              <MetricCard
                label="Threat Level"
                value={TIER_LABEL[maxTier]}
                icon="memory"
                color={TIER_COLOR[maxTier]}
                barPct={(maxTier / 3) * 100}
                note={maxTier >= 2 ? "Active" : undefined}
                pulse={maxTier >= 3}
              />
            </div>

            {/* Center: kill-chain (real data) */}
            <div className="col-span-12 flex flex-col gap-4 lg:col-span-8">
              <div className="glass-panel relative flex h-[400px] flex-col overflow-hidden rounded-xl border border-white/5">
                <div className="z-10 flex items-center justify-between border-b border-white/5 bg-[#141A24]/50 p-4">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-[#d4e4fa]">
                    <span className="material-symbols-outlined text-[18px] text-[#859397]">
                      radar
                    </span>
                    Live Threat Vectors — Kill Chain
                  </h2>
                  {maxTier >= 3 && (
                    <span className="flex items-center gap-1 rounded border border-[#ef4444]/30 bg-[#ef4444]/10 px-2 py-1 text-[11px] font-bold uppercase text-[#ffb4ab]">
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ef4444]" />{" "}
                      Critical
                    </span>
                  )}
                </div>
                <div className="relative flex-1 bg-[#050B14]">
                  {logs.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm italic text-[#3c494c]">
                      Waiting for attackers...
                    </div>
                  ) : (
                    <AttackTree logs={logs} />
                  )}
                </div>
              </div>
            </div>

            {/* Right: Priority Alerts + IOC feed (real data) */}
            <div className="col-span-12 flex flex-col gap-4 lg:col-span-4">
              <div className="glass-panel flex h-[400px] flex-col rounded-xl border border-white/5">
                <div className="flex items-center justify-between border-b border-white/5 bg-[#141A24]/50 p-4">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-[#d4e4fa]">
                    <span className="material-symbols-outlined text-[18px] text-[#859397]">
                      warning
                    </span>
                    Priority Alerts
                  </h2>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-[#859397]">
                    {intelRows.length} sessions
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {intelRows.length === 0 ? (
                    <p className="px-2 py-4 text-center text-sm italic text-[#859397]">
                      No sessions analyzed yet.
                    </p>
                  ) : (
                    <table className="w-full border-collapse text-left">
                      <tbody className="divide-y divide-white/5">
                        {intelRows.map((r) => (
                          <tr
                            key={r.session_id}
                            className="group transition-colors hover:bg-white/5"
                          >
                            <td className="w-1 p-2">
                              <div
                                className="h-1.5 w-1.5 rounded-full"
                                style={{
                                  background: TIER_COLOR[r.tier],
                                  boxShadow: `0 0 5px ${TIER_COLOR[r.tier]}cc`,
                                }}
                              />
                            </td>
                            <td className="p-2">
                              <div className="font-mono text-[13px] text-[#d4e4fa]">
                                {r.ip_address}
                              </div>
                              <div className="mt-0.5 text-[12px] capitalize text-[#859397]">
                                {r.archetype} · {TIER_LABEL[r.tier]}
                              </div>
                            </td>
                            <td className="p-2 text-right">
                              <div
                                className="text-[13px] font-bold"
                                style={{ color: TIER_COLOR[r.tier] }}
                              >
                                {r.score}
                              </div>
                              <div className="font-mono text-[11px] text-[#3c494c]">
                                {r.received_at ? timeAgo(r.received_at) : ""}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* IOC feed */}
              <div className="glass-panel flex max-h-[300px] flex-col rounded-xl border border-white/5">
                <div className="flex items-center justify-between border-b border-white/5 bg-[#141A24]/50 p-4">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-[#d4e4fa]">
                    <span className="material-symbols-outlined text-[18px] text-[#859397]">
                      security
                    </span>
                    IOC Feed
                  </h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <IocFeed iocs={iocs} />
                </div>
              </div>
            </div>

            {/* Bottom: System Activity Log (real command stream) */}
            <div className="col-span-12">
              <div className="relative flex h-[250px] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#050B14] shadow-inner">
                <div className="z-10 flex items-center justify-between border-b border-white/5 bg-[#273647]/80 px-4 py-2">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[16px] text-[#3c494c]">
                      terminal
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#859397]">
                      System Activity Log
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#3c494c]/50" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#3c494c]/50" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#3c494c]/50" />
                  </div>
                </div>
                <div className="relative flex-1 overflow-y-auto p-4 font-mono text-[12px] leading-relaxed text-[#bbc9cd]">
                  {logs.length === 0 ? (
                    <div className="text-[#10B981]">
                      [OK] SYSTEM_INIT Honeypot online. Waiting for SSH
                      activity...
                    </div>
                  ) : (
                    logs.map((log, i) => {
                      const sev = severityOf(log.command);
                      return (
                        <div
                          key={i}
                          className="mb-1"
                          style={
                            sev.tag === "CRIT"
                              ? {
                                  borderLeft: "2px solid #ef4444",
                                  paddingLeft: 8,
                                  background: "rgba(239,68,68,0.08)",
                                }
                              : undefined
                          }
                        >
                          <span style={{ color: sev.color, fontWeight: 700 }}>
                            [{sev.tag}]
                          </span>{" "}
                          <span className="text-[#859397]">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>{" "}
                          <span className="text-[#ffb4ab]">
                            {log.ip_address}
                          </span>{" "}
                          <span className="text-[#8aebff]">$</span>{" "}
                          <span className="text-[#d4e4fa]">{log.command}</span>
                        </div>
                      );
                    })
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[#8aebff]">root@honeymind:~#</span>
                    <span className="inline-block h-4 w-2 animate-pulse bg-[#8aebff]" />
                  </div>
                  <div ref={logEndRef} />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
