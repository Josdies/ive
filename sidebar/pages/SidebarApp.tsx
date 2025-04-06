import { Navigation } from '../components/navigation/Navigation'
import styles from './SidebarApp.module.scss'
import { ScriptsPage } from './scripts/Scripts'
import { ConnectPage } from './connect/ConnectPage'
import { useNavigationStore } from '../store/useNavigationStore'

export const SidebarApp = () => {
  const page = useNavigationStore((state) => state.page)

  return (
    <div className={styles.sidebarApp}>
      <Navigation />
      {page === 'scripts' && <ScriptsPage />}
      {page === 'connect' && <ConnectPage />}
    </div>
  )
}
