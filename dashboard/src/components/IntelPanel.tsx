import React from "react";

interface Intel {
  session_id: string;
  ip_address: string;
  score: number;
  archetype: string;
  anomaly_score: number;
  tier: number;
}

const TIER_LABEL = ["benign", "suspicious", "hostile", "confirmed"];
const TIER_COLOR = ["#3b82f6", "#eab308", "#f59e0b", "#ef4444"];

export default function IntelPanel({ intel }: { intel: Record<string, Intel> }) {
  const rows = Object.values(intel).sort((a, b) => b.score - a.score);
  return (
    <div className="space-y-2">
      {rows.length === 0 ? (
        <p className="text-gray-600 italic">No sessions analyzed yet.</p>
      ) : (
        rows.map((r) => (
          <div key={r.session_id} className="text-sm flex items-center justify-between gap-2">
            <span className="text-red-400">{r.ip_address}</span>
            <span className="text-gray-300">{r.archetype}</span>
            <span className="text-gray-400">score {r.score}</span>
            <span style={{ color: TIER_COLOR[r.tier] }}>
              {TIER_LABEL[r.tier] ?? r.tier}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
