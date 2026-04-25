import { useState } from "react";
import { ArchiveRestore } from "lucide-react";
import Sidebar from "./Sidebar";
import ContentRenderer from "./ContentRenderer";
import { archiveData } from "@/data";

export default function ArchivePage() {
  const [selectedId, setSelectedId] = useState<string>(archiveData[0].id);

  const selectedItem = archiveData.find((a) => a.id === selectedId) || archiveData[0];

  return (
    <div className="flex h-full">
      <Sidebar
        title="Archive"
        items={archiveData.map((a) => ({
          id: a.id,
          title: a.title,
          summary: `Archived ${a.archivedDate} · ${a.originalType}`,
          groupLabel: a.groupLabel,
        }))}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      <div className="flex-1 bg-cabinet-paper flex flex-col h-full overflow-hidden">
        <div className="px-8 pt-6 pb-2 flex-shrink-0">
          {/* Top info row */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-mono text-cabinet-inkMuted">
              Archived on {selectedItem.archivedDate}
            </span>
            <button
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-cabinet-ink2 hover:text-cabinet-ink transition-colors px-2 py-1 rounded hover:bg-cabinet-itemBg"
              title="Restore to active"
            >
              <ArchiveRestore size={14} />
              Restore
            </button>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-medium text-cabinet-ink mt-4 leading-tight">
            {selectedItem.title}
          </h1>

          {/* Original type badge */}
          <div className="mt-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] px-2 py-1 rounded bg-cabinet-itemBg text-cabinet-ink2">
              {selectedItem.originalType}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto cabinet-scrollbar px-8 pb-12 mt-4">
          <ContentRenderer content={selectedItem.content} />
        </div>
      </div>
    </div>
  );
}
