import { useState, useCallback } from "react";
import Sidebar from "./Sidebar";
import ContentArea from "./ContentArea";
import { notesData } from "@/data";

export default function NotesPage() {
  const [selectedId, setSelectedId] = useState<string>(notesData[0].id);

  const selectedNote = notesData.find((n) => n.id === selectedId) || notesData[0];

  const handleRefresh = useCallback(() => {
    // Simulate refresh — in a real app, this would refetch data
  }, []);

  return (
    <div className="flex h-full">
      <Sidebar
        title="All Notes"
        items={notesData.map((n) => ({
          id: n.id,
          title: n.title,
          summary: n.summary,
          groupLabel: n.groupLabel,
        }))}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      <ContentArea
        title={selectedNote.title}
        timestamp={selectedNote.lastEdited}
        content={selectedNote.content}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
