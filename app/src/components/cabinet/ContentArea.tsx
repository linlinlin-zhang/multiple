import { useState } from "react";
import { RotateCcw } from "lucide-react";
import ContentRenderer from "./ContentRenderer";

interface ContentAreaProps {
  title: string;
  timestamp: string;
  content: string;
  onRefresh?: () => void;
}

export default function ContentArea({ title, timestamp, content, onRefresh }: ContentAreaProps) {
  const [isSpinning, setIsSpinning] = useState(false);

  const handleRefresh = () => {
    setIsSpinning(true);
    onRefresh?.();
    setTimeout(() => setIsSpinning(false), 500);
  };

  return (
    <div className="flex-1 bg-cabinet-paper flex flex-col h-full overflow-hidden">
      <div className="px-8 pt-6 pb-2 flex-shrink-0">
        {/* Top info row */}
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-mono text-cabinet-inkMuted">
            {timestamp}
          </span>
          {onRefresh && (
            <button
              onClick={handleRefresh}
              className="text-cabinet-inkMuted hover:text-cabinet-ink transition-colors"
              title="Refresh"
            >
              <RotateCcw
                size={16}
                className={isSpinning ? "animate-spin-refresh" : ""}
              />
            </button>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-medium text-cabinet-ink mt-4 leading-tight">
          {title}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto cabinet-scrollbar px-8 pb-12">
        <ContentRenderer content={content} />
      </div>
    </div>
  );
}
