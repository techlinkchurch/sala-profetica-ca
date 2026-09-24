import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../design-system";
import { Painel } from "./Painel";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Painel />
  </StrictMode>,
);
