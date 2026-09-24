import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../design-system";
import { PoliticaPrivacidade } from "./PoliticaPrivacidade";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PoliticaPrivacidade />
  </StrictMode>,
);
