import { useShallow } from 'zustand/shallow'
import { Navigation } from '../components/navigation/Navigation'
import { ScriptsPage } from './scripts/Scripts'
import { ConnectPage } from './connect/ConnectPage'
import { TestPage } from './test/TestPage'
import { useNavigationStore } from '../../shared/store/useNavigationStore'
import styles from './SidebarApp.module.scss'

export const SidebarApp = () => {
  const { page, isDevelopmentMode } = useNavigationStore(
    useShallow((state) => ({
      page: state.page,
      isDevelopmentMode: state.isDevelopmentMode,
    })),
  )

  return (
    <div className={styles.sidebarApp}>
      <Navigation />
      {page === 'scripts' && <ScriptsPage />}
      {page === 'connect' && <ConnectPage />}
      {isDevelopmentMode && page === 'test' && <TestPage />}
    </div>
  )
}
