import FileCabinet from "@/components/cabinet/FileCabinet";
import SettingsPage from "@/components/settings/SettingsPage";
import MaterialLibraryPage from "@/components/material/MaterialLibraryPage";
import { useEffect } from "react";

function getCurrentView() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");
  if (view === "settings") return "settings";
  if (view === "library") return "library";
  return "history";
}

export default function App() {
  const view = getCurrentView();
  useEffect(() => {
    document.title = view === "settings"
      ? "麦田创作 / 设置"
      : view === "library"
        ? "麦田创作 / 素材库"
        : "麦田创作 / 历史记录";
  }, [view]);
  if (view === "settings") return <SettingsPage />;
  if (view === "library") return <MaterialLibraryPage />;
  return <FileCabinet />;
}
