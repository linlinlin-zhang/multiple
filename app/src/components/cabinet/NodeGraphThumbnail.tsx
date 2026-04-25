import type { Node, Link } from "@/types";

interface NodeGraphThumbnailProps {
  nodes: Node[];
  links: Link[];
  width?: number;
  height?: number;
}

const NODE_COLORS: Record<string, string> = {
  source: "#3d9a92",
  analysis: "#d9bc68",
  option: "#f0ece4",
  generated: "#bd453c",
};

function buildBezierPath(start: { x: number; y: number }, end: { x: number; y: number }): string {
  const distance = Math.max(120, Math.abs(end.x - start.x) * 0.42);
  const c1x = start.x + distance;
  const c2x = end.x - distance;
  const c1y = start.y + (end.y - start.y) * 0.08;
  const c2y = end.y - (end.y - start.y) * 0.08;
  return `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;
}

function truncateLabel(label: string): string {
  if (label.length <= 14) return label;
  return label.slice(0, 14) + "...";
}

function getNodeLabel(node: Node): string {
  switch (node.type) {
    case "source":
      return "Source";
    case "analysis":
      return "Analysis";
    case "option":
    case "generated":
      return node.data?.option?.title || "Option";
    default:
      return node.type;
  }
}

export default function NodeGraphThumbnail({ nodes, links }: NodeGraphThumbnailProps) {
  if (nodes.length === 0) {
    return (
      <div className="w-full h-[240px] bg-cabinet-bg rounded border border-cabinet-border overflow-hidden flex items-center justify-center">
        <span className="text-sm text-cabinet-inkMuted">No graph data</span>
      </div>
    );
  }

  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxX = Math.max(...nodes.map((n) => n.x + (n.width || 318)));
  const maxY = Math.max(...nodes.map((n) => n.y + (n.height || 220)));

  const pad = 40;
  const viewBox = `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;

  const nodeMap = new Map<string, Node>();
  for (const node of nodes) {
    nodeMap.set(node.nodeId, node);
  }

  return (
    <div className="w-full h-[240px] bg-cabinet-bg rounded border border-cabinet-border overflow-hidden relative">
      <svg width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Links shadow layer */}
        {links.map((link) => {
          const fromNode = nodeMap.get(link.fromNodeId);
          const toNode = nodeMap.get(link.toNodeId);
          if (!fromNode || !toNode) return null;

          const start = {
            x: fromNode.x + (fromNode.width || 318) - 18,
            y: fromNode.y + Math.min((fromNode.height || 220) * 0.48, (fromNode.height || 220) - 32),
          };
          const end = {
            x: toNode.x + 18,
            y: toNode.y + Math.min((toNode.height || 220) * 0.48, (toNode.height || 220) - 32),
          };

          return (
            <path
              key={`${link.id}-shadow`}
              d={buildBezierPath(start, end)}
              stroke="#c0bbb3"
              strokeWidth={4}
              fill="none"
              opacity="0.3"
            />
          );
        })}

        {/* Links main layer */}
        {links.map((link) => {
          const fromNode = nodeMap.get(link.fromNodeId);
          const toNode = nodeMap.get(link.toNodeId);
          if (!fromNode || !toNode) return null;

          const start = {
            x: fromNode.x + (fromNode.width || 318) - 18,
            y: fromNode.y + Math.min((fromNode.height || 220) * 0.48, (fromNode.height || 220) - 32),
          };
          const end = {
            x: toNode.x + 18,
            y: toNode.y + Math.min((toNode.height || 220) * 0.48, (toNode.height || 220) - 32),
          };

          return (
            <g key={link.id}>
              <path
                d={buildBezierPath(start, end)}
                stroke="#8a8a8a"
                strokeWidth={2}
                fill="none"
              />
              <circle cx={start.x} cy={start.y} r={6} fill="#c0bbb3" />
              <circle cx={end.x} cy={end.y} r={6} fill="#c0bbb3" />
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const w = node.width || 318;
          const h = node.height || 220;
          const fill = NODE_COLORS[node.type] || "#f0ece4";
          const isOption = node.type === "option";
          const isDark = node.type === "source" || node.type === "generated";
          const label = truncateLabel(getNodeLabel(node));

          return (
            <g key={node.id}>
              <rect
                x={node.x}
                y={node.y}
                width={w}
                height={h}
                rx={4}
                ry={4}
                fill={fill}
                stroke={isOption ? "#c0bbb3" : "#1a1a1a"}
                strokeWidth={1}
                filter="url(#shadow)"
              />
              <text
                x={node.x + w / 2}
                y={node.y + h / 2}
                fontSize={12}
                fill={isDark ? "#f0ece4" : "#1a1a1a"}
                dominantBaseline="middle"
                textAnchor="middle"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Info overlay */}
      <div className="absolute bottom-2 right-2 text-[11px] font-mono text-cabinet-inkMuted bg-cabinet-paper/80 px-2 py-1 rounded pointer-events-none">
        {nodes.length} nodes · {links.length} links
      </div>
    </div>
  );
}
