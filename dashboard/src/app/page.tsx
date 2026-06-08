"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import AttackTree from "@/components/AttackTree";

export default function Home() {
  const [logs, setLogs] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // connection for socket.io server running on the same port
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("ssh_activity", (data) => {
      setLogs((prev) => [...prev, data]);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 font-mono">
      <header className="mb-8 border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-green-400">HoneyMind Command Center</h1>
        <p className="text-gray-400 text-sm mt-2">
          Active Deception & Threat Intelligence
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Terminal Replay */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 h-[600px] flex flex-col">
          <h2 className="text-xl font-semibold mb-4 text-gray-300 border-b border-gray-800 pb-2">
            Live Terminal Activity
          </h2>
          <div className="flex-1 overflow-y-auto space-y-2">
            {logs.length === 0 ? (
              <p className="text-gray-600 italic">Waiting for attackers...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-sm">
                  <span className="text-blue-400">
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </span>{" "}
                  <span className="text-red-400">{log.ip_address}</span>:{" "}
                  <span className="text-green-300">{log.command}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Kill-Chain Graph */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-lg p-4 h-[600px] flex flex-col">
          <h2 className="text-xl font-semibold mb-4 text-gray-300 border-b border-gray-800 pb-2">
            Kill-Chain Attack Tree
          </h2>
          <div className="flex-1 rounded border border-gray-800 overflow-hidden bg-gray-950">
            <AttackTree logs={logs} />
          </div>
        </div>
      </div>
    </div>
  );
}
