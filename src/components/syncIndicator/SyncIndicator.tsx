import { memo } from 'react'
import styles from './SyncIndicator.module.scss'

export const SyncIndicator = memo(
  ({
    isConnected,
    isPlaying,
    isScriptSetup,
    onSyncClick,
  }: {
    isConnected: boolean
    isPlaying: boolean
    isScriptSetup: boolean
    onSyncClick: () => void
  }) => {
    // Get status text based on connection state
    const getStatusText = () => {
      if (!isConnected) return 'Disconnected'
      if (!isScriptSetup) return 'Setting up...'
      if (isPlaying) return 'Syncing'
      return 'Click to sync'
    }

    return (
      <div
        className={`${styles.syncIndicator} ${
          !isConnected
            ? styles.disconnected
            : isPlaying
              ? styles.playing
              : styles.connected
        }`}
        onClick={onSyncClick}
      >
        <div className={styles.statusDot}></div>
        <span className={styles.statusText}>{getStatusText()}</span>
      </div>
    )
  },
)
