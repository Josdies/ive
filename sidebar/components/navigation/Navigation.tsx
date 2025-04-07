import clsx from 'clsx'
import { useNavigationStore } from '../../store/useNavigationStore'
import styles from './Navigation.module.scss'
import { useShallow } from 'zustand/shallow'

export const Navigation = () => {
  const { page, setPage, isDevelopmentMode } = useNavigationStore(
    useShallow((state) => ({
      page: state.page,
      setPage: state.setPage,
      isDevelopmentMode: state.isDevelopmentMode,
    })),
  )

  return (
    <nav className={styles.navigation}>
      <ul>
        <li>
          <button
            className={clsx('button primary', page === 'scripts' && 'active')}
            onClick={() => setPage('scripts')}
          >
            Scripts
          </button>
        </li>
        <li>
          <button
            className={clsx('button primary', page === 'connect' && 'active')}
            onClick={() => setPage('connect')}
          >
            Connect
          </button>
        </li>
        {isDevelopmentMode && (
          <li>
            <button
              className={clsx('button primary', page === 'test' && 'active')}
              onClick={() => setPage('test')}
            >
              Test
            </button>
          </li>
        )}
      </ul>
    </nav>
  )
}
