import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../design-system";
import { Avaliacao } from "./Avaliacao";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Avaliacao />
  </StrictMode>,
);
