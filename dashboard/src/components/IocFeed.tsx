import React from "react";

interface Ioc {
  session_id: string;
  source_ip: string;
  generated_at: string;
  suggested_block_rule: string;
  indicators: { urls: string[]; commands: string[] };
}

export default function IocFeed({ iocs }: { iocs: Ioc[] }) {
  return (
    <div className="space-y-3">
      {iocs.length === 0 ? (
        <p className="text-gray-600 italic">No IOCs emitted yet.</p>
      ) : (
        iocs.map((ioc, i) => (
          <div key={i} className="text-xs border border-red-900 rounded p-2 bg-red-950/30">
            <div className="text-red-400 font-bold">{ioc.source_ip}</div>
            <div className="text-gray-400">{ioc.indicators.urls.join(", ") || "no urls"}</div>
            <code className="text-green-400 block mt-1">{ioc.suggested_block_rule}</code>
          </div>
        ))
      )}
    </div>
  );
}
