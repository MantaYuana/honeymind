import React from "react";

interface Ioc {
  session_id: string;
  source_ip: string;
  generated_at: string;
  suggested_block_rule: string;
  indicators: { urls: string[]; commands: string[] };
}

export default function IocFeed({ iocs }: { iocs: Ioc[] }) {
  if (iocs.length === 0) {
    return (
      <p className="text-[#859397] italic text-sm px-2 py-4 text-center">
        No IOCs exported yet.
      </p>
    );
  }

  return (
    <div className="space-y-2 p-2">
      {iocs.map((ioc, i) => (
        <div
          key={i}
          className="rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/5 p-3 glow-red"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[13px] font-bold text-[#ffb4ab]">
              {ioc.source_ip}
            </span>
            <span className="rounded bg-[#ef4444]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ffb4ab]">
              IOC · High
            </span>
          </div>
          {ioc.indicators?.urls?.length > 0 && (
            <div className="mt-1 truncate text-[11px] text-[#bbc9cd]">
              {ioc.indicators.urls.join(", ")}
            </div>
          )}
          <code className="mt-2 block rounded bg-[#010f1f] px-2 py-1 font-mono text-[11px] text-[#10B981]">
            {ioc.suggested_block_rule}
          </code>
        </div>
      ))}
    </div>
  );
}
