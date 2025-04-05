import { Pages } from "../../pages/SidebarApp";
import styles from "./Navigation.module.scss";

type NavigationProps = {
  setPage: (page: Pages) => void;
};

export const Navigation = ({ setPage }: NavigationProps) => {
  return (
    <nav className={styles.navigation}>
      <ul>
        <li>
          <button className="button primary" onClick={() => setPage("scripts")}>
            Scripts
          </button>
        </li>
        <li>
          <button className="button primary" onClick={() => setPage("connect")}>
            Connect
          </button>
        </li>
      </ul>
    </nav>
  );
};
