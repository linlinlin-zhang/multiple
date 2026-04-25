import { useState, useCallback } from "react";
import FolderTab from "./FolderTab";
import NotesPage from "./NotesPage";
import ProjectsPage from "./ProjectsPage";
import ArchivePage from "./ArchivePage";
import type { TabId } from "@/types";

const tabs: { id: TabId; label: string; stackOrder: number }[] = [
  { id: "notes", label: "Notes", stackOrder: 1 },
  { id: "projects", label: "Projects", stackOrder: 2 },
  { id: "archive", label: "Archive", stackOrder: 3 },
];

export default function FileCabinet() {
  const [activeTab, setActiveTab] = useState<TabId>("notes");

  const renderPage = useCallback(() => {
    switch (activeTab) {
      case "notes":
        return <NotesPage />;
      case "projects":
        return <ProjectsPage />;
      case "archive":
        return <ArchivePage />;
      default:
        return <NotesPage />;
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-cabinet-bg flex justify-center pt-10 px-4">
      <div className="w-full max-w-[1100px]">
        {/* Tab Bar */}
        <div className="flex items-end pl-6">
          {tabs.map((tab, index) => (
            <FolderTab
              key={tab.id}
              label={tab.label}
              tabId={tab.id}
              active={activeTab === tab.id}
              zIndex={tab.stackOrder}
              overlap={index > 0}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>

        {/* Content */}
        <div
          className="bg-cabinet-paper relative"
          style={{
            height: "calc(100vh - 80px)",
            borderRadius: "0 4px 4px 4px",
            zIndex: 5,
          }}
        >
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
