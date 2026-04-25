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
  if (label.length <= 12) return label;
  return label.slice(0, 12) + "...";
}

export default function NodeGraphThumbnail({ nodes, links }: NodeGraphThumbnailProps) {
  if (nodes.length === 0) {
    return (
      <div className="w-full h-[240px] bg-cabinet-bg rounded border border-cabinet-border overflow-hidden flex items-center justify-center">
        <span className="text-sm text-cabinet-inkMuted">No nodes</span>
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
    <div className="w-full h-[240px] bg-cabinet-bg rounded border border-cabinet-border overflow-hidden">
      <svg width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
        {/* Links */}
        {links.map((link) => {
          const fromNode = nodeMap.get(link.fromNodeId);
          const toNode = nodeMap.get(link.toNodeId);
          if (!fromNode || !toNode) return null;

          const start = {
            x: fromNode.x + (fromNode.width || 318) - 18,
            y: fromNode.y + (fromNode.height || 220) * 0.48,
          };
          const end = {
            x: toNode.x + 18,
            y: toNode.y + (toNode.height || 220) * 0.48,
          };

          return (
            <path
              key={link.id}
              d={buildBezierPath(start, end)}
              stroke="#c0bbb3"
              strokeWidth={2}
              fill="none"
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const w = node.width || 318;
          const h = node.height || 220;
          const fill = NODE_COLORS[node.type] || "#f0ece4";
          const isOption = node.type === "option";
          const isDark = node.type === "source" || node.type === "generated";

          return (
            <g key={node.id}>
              <rect
                x={node.x}
                y={node.y}
                width={w}
                height={h}
                rx={4}
                fill={fill}
                stroke={isOption ? "#c0bbb3" : "#1a1a1a"}
                strokeWidth={1}
              />
              <text
                x={node.x + w / 2}
                y={node.y + h / 2}
                fontSize={12}
                fill={isDark ? "#f0ece4" : "#1a1a1a"}
                dominantBaseline="middle"
                textAnchor="middle"
              >
                {truncateLabel(node.data?.option?.title || node.type)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
