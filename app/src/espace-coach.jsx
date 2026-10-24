/**
 * Point d'entree de l'Espace coach (espace-coach.html), page separee de
 * l'application des clients : son code n'est pas charge par index.html.
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { EspaceCoach } from "./ui/EspaceCoach.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <EspaceCoach />
  </React.StrictMode>
);
