import { useState } from "react";
import { Navigation } from "../components/navigation/Navigation";
import styles from "./SidebarApp.module.scss";
import { ScriptsPage } from "./scripts/Scripts";
import { ConnectPage } from "./connect/ConnectPage";

export type Pages = "scripts" | "connect";

export const SidebarApp = () => {
  const [page, setPage] = useState<Pages>("connect");

  return (
    <div className={styles.sidebarApp}>
      <Navigation setPage={setPage} />
      {page === "scripts" && <ScriptsPage />}
      {page === "connect" && <ConnectPage />}
    </div>
  );
};
