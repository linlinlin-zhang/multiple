import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ShareViewerPage from "./components/share/ShareViewerPage";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ShareViewerPage />
  </StrictMode>
);
