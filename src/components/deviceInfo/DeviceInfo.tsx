import { useShallow } from 'zustand/shallow'
import clsx from 'clsx'
import { useHandyStore } from '@/store/useHandyStore'
import styles from './DeviceInfo.module.scss'

export const DeviceInfo = () => {
  const { isConnected, deviceInfo, isPlaying } = useHandyStore(
    useShallow((state) => ({
      isConnected: state.isConnected,
      deviceInfo: state.deviceInfo,
      isPlaying: state.isPlaying,
    })),
  )

  return (
    <div
      className={clsx(
        styles.deviceInfo,
        isConnected ? styles.connected : styles.disconnected,
      )}
    >
      <h3 className={styles.title}>
        <span
          className={clsx(
            styles.statusDot,
            isConnected ? styles.connected : styles.disconnected,
          )}
        ></span>
        Device {isConnected ? 'Connected' : 'Disconnected'}
      </h3>

      <ul className={styles.infoList}>
        <li className={styles.infoItem}>
          <span className={styles.label}>Firmware:</span>
          <span
            className={clsx(
              styles.value,
              !deviceInfo?.fw_version && styles.empty,
            )}
          >
            {deviceInfo?.fw_version || 'Not available'}
          </span>
        </li>
        <li className={styles.infoItem}>
          <span className={styles.label}>Model:</span>
          <span
            className={clsx(
              styles.value,
              !deviceInfo?.hw_model_name && styles.empty,
            )}
          >
            {deviceInfo?.hw_model_name || 'Not available'}
          </span>
        </li>
        <li className={styles.infoItem}>
          <span className={styles.label}>Status:</span>
          <span
            className={clsx(
              styles.value,
              isPlaying ? styles.playing : styles.stopped,
            )}
          >
            {isPlaying ? 'Playing' : 'Stopped'}
          </span>
        </li>
      </ul>
    </div>
  )
}
