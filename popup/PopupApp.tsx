import styles from './PopupApp.module.scss'
import { DeviceConnect } from '../src/components/deviceConnect/DeviceConnect'
import { useHandySetup } from '@/store/useHandyStore'

export const PopupApp = () => {
  useHandySetup('popup', true)

  return (
    <div className={styles.popupApp}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.highlight}>I</span>VE
        </div>
      </div>

      <p className={styles.description}>
        Interactive Video Extension - Control your haptic device and synchronize
        with videos across the web.
      </p>

      <DeviceConnect />
    </div>
  )
}
