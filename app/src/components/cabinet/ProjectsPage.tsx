import { useState } from "react";
import { ExternalLink } from "lucide-react";
import Sidebar from "./Sidebar";
import { projectsData } from "@/data";

export default function ProjectsPage() {
  const [selectedId, setSelectedId] = useState<string>(projectsData[0].id);

  const selectedProject = projectsData.find((p) => p.id === selectedId) || projectsData[0];

  return (
    <div className="flex h-full">
      <Sidebar
        title="All Projects"
        items={projectsData.map((p) => ({
          id: p.id,
          title: p.name,
          summary: p.description.slice(0, 80) + "...",
          groupLabel: p.groupLabel,
        }))}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      <div className="flex-1 bg-cabinet-paper flex flex-col h-full overflow-hidden">
        <div className="px-8 pt-6 pb-2 flex-shrink-0">
          {/* Top info row */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-mono text-cabinet-inkMuted">
              {selectedProject.lastEdited}
            </span>
            <span
              className={`text-[11px] font-medium uppercase tracking-[0.08em] px-2 py-1 rounded ${
                selectedProject.status === "ACTIVE"
                  ? "bg-cabinet-itemBg text-cabinet-ink"
                  : "bg-cabinet-tab2 text-cabinet-paper"
              }`}
            >
              {selectedProject.status}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-medium text-cabinet-ink mt-4 leading-tight">
            {selectedProject.name}
          </h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto cabinet-scrollbar px-8 pb-12">
          <p className="text-[15px] text-cabinet-ink leading-[1.7] mt-2">
            {selectedProject.description}
          </p>

          {/* Tech stack */}
          <div className="mt-6">
            <p className="text-[11px] font-medium text-cabinet-inkMuted uppercase tracking-[0.08em] mb-3">
              Tech Stack
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedProject.techStack.map((tech) => (
                <span
                  key={tech}
                  className="text-[12px] font-mono bg-cabinet-itemBg text-cabinet-ink2 px-2 py-1 rounded"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Link */}
          {selectedProject.link && (
            <div className="mt-6">
              <a
                href={selectedProject.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[14px] text-cabinet-ink hover:text-cabinet-ink2 transition-colors"
              >
                <ExternalLink size={14} />
                {selectedProject.link}
              </a>
            </div>
          )}

          {/* Milestones */}
          <div className="mt-8">
            <p className="text-[11px] font-medium text-cabinet-inkMuted uppercase tracking-[0.08em] mb-4">
              Milestones
            </p>
            <div className="space-y-0">
              {selectedProject.milestones.map((m, index) => (
                <div key={index} className="flex items-start gap-4">
                  <span className="text-[13px] font-mono text-cabinet-inkMuted w-16 flex-shrink-0 pt-[1px]">
                    {m.date}
                  </span>
                  <div className="relative flex items-start">
                    <div className="flex flex-col items-center mr-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          index <= selectedProject.milestones.length - 1
                            ? "bg-cabinet-ink"
                            : "bg-cabinet-border"
                        }`}
                      />
                      {index < selectedProject.milestones.length - 1 && (
                        <div className="w-[1px] h-6 bg-cabinet-border" />
                      )}
                    </div>
                    <span className="text-[14px] text-cabinet-ink leading-[1.5]">
                      {m.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
