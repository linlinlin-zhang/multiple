import FileCabinet from "@/components/cabinet/FileCabinet";
import SettingsPage from "@/components/settings/SettingsPage";
import MaterialLibraryPage from "@/components/material/MaterialLibraryPage";
import UserGuidePage from "@/components/guide/UserGuidePage";
import { useEffect } from "react";

function getCurrentView() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");
  if (view === "settings") return "settings";
  if (view === "library") return "library";
  if (view === "guide") return "guide";
  return "history";
}

export default function App() {
  const view = getCurrentView();
  useEffect(() => {
    document.title = view === "settings"
      ? "织境 / 设置"
      : view === "library"
        ? "织境 / 素材库"
        : view === "guide"
          ? "织境 / 使用介绍"
          : "织境 / 历史记录";
  }, [view]);
  if (view === "settings") return <SettingsPage />;
  if (view === "library") return <MaterialLibraryPage />;
  if (view === "guide") return <UserGuidePage />;
  return <FileCabinet />;
}
