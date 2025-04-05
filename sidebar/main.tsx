import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SidebarApp } from "./pages/SidebarApp";
import "./styles/global.scss";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SidebarApp />
  </StrictMode>
);
