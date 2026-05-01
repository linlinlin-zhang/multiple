import FileCabinet from "@/components/cabinet/FileCabinet";
import SettingsPage from "@/components/settings/SettingsPage";

function getCurrentView() {
  const params = new URLSearchParams(window.location.search);
  return params.get("view") === "settings" ? "settings" : "history";
}

export default function App() {
  return getCurrentView() === "settings" ? <SettingsPage /> : <FileCabinet />;
}
