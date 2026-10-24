import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { FiletApp } from "./ui/FiletErreur.jsx";
import { brancherConsentement } from "./lib/consentement.js";

// Aucun envoi a l'IA sans accord explicite (lib/consentement.js).
brancherConsentement();
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <FiletApp>
      <App />
    </FiletApp>
  </React.StrictMode>
);
