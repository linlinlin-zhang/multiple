import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ShareViewerPage from "./components/share/ShareViewerPage";
import "./index.css";
import { I18nProvider } from "./lib/i18n";

const savedLang = localStorage.getItem("oryzae-lang") as "zh" | "en" | null;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider initialLang={savedLang || "zh"}>
      <ShareViewerPage />
    </I18nProvider>
  </StrictMode>
);
