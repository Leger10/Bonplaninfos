import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App.jsx";
import "@/index.css";
import { HelmetProvider } from "react-helmet-async";
import ErrorBoundary from "@/components/ErrorBoundary";
import { initI18n } from "./i18n";
import LanguageTutorial from "@/components/tutorial/LanguageTutorial";
import { LanguageProvider } from "@/contexts/LanguageContext"; // ✅ AJOUT

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => console.log("SW registered:", registration))
      .catch((error) => console.log("SW registration failed:", error));
  });
}

(async () => {
  await initI18n();

  const root = ReactDOM.createRoot(document.getElementById("root"));

  root.render(
    <React.StrictMode>
      <HelmetProvider>
        <ErrorBoundary>
          <LanguageProvider> {/* ✅ CONTEXTE GLOBAL */}
            <LanguageTutorial />
            <App />
          </LanguageProvider>
        </ErrorBoundary>
      </HelmetProvider>
    </React.StrictMode>
  );
})();