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
      <h3 className='header3'>
        Device {isConnected ? 'connected' : 'disconnected'}
      </h3>
      <ul>
        <li>
          <strong>Firmware:</strong> {deviceInfo?.fw_version || ''}
        </li>
        <li>
          <strong>Model:</strong> {deviceInfo?.hw_model_name || ''}
        </li>
        <li>
          <strong>Status:</strong> {isPlaying ? 'Playing' : 'Stopped'}
        </li>
      </ul>
    </div>
  )
}
