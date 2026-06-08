import React, { useMemo } from "react";
import { ReactFlow, Background, Controls, Node, Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface AttackTreeProps {
  logs: any[];
}

export default function AttackTree({ logs }: AttackTreeProps) {
  const { nodes, edges } = useMemo(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Group logs by session
    const sessions: Record<string, any[]> = {};
    logs.forEach((log) => {
      if (!sessions[log.session_id]) {
        sessions[log.session_id] = [];
      }
      sessions[log.session_id].push(log);
    });

    let xOffset = 0;

    Object.entries(sessions).forEach(([sessionId, sessionLogs], sessionIdx) => {
      let yOffset = 0;
      let prevId: string | null = null;

      // Add a root node for the session (Attacker IP)
      const rootId = `session-${sessionId}`;
      const ip = sessionLogs[0]?.ip_address || "Unknown IP";
      newNodes.push({
        id: rootId,
        position: { x: xOffset, y: yOffset },
        data: { label: `Attacker: ${ip}` },
        style: {
          background: "#ef4444",
          color: "white",
          border: "none",
          borderRadius: "8px",
        },
      });
      prevId = rootId;
      yOffset += 100;

      sessionLogs.forEach((log, logIdx) => {
        const nodeId = `log-${sessionId}-${logIdx}`;

        let bgColor = "#3b82f6"; // default blue
        if (
          ["cat /etc/passwd", "wget", "curl", "chmod", "nc", "nmap"].some((c) =>
            log.command.includes(c),
          )
        ) {
          bgColor = "#f59e0b"; // warning orange
        }

        newNodes.push({
          id: nodeId,
          position: { x: xOffset, y: yOffset },
          data: { label: log.command },
          style: {
            background: bgColor,
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "12px",
            padding: "10px",
          },
        });

        if (prevId) {
          newEdges.push({
            id: `edge-${prevId}-${nodeId}`,
            source: prevId,
            target: nodeId,
            animated: true,
            style: { stroke: "#4b5563" },
          });
        }

        prevId = nodeId;
        yOffset += 80;
      });

      xOffset += 250;
    });

    return { nodes: newNodes, edges: newEdges };
  }, [logs]);

  return (
    <ReactFlow nodes={nodes} edges={edges} fitView>
      <Background color="#1f2937" gap={16} />
      <Controls />
    </ReactFlow>
  );
}
