import styles from './PopupApp.module.scss'
import { DeviceConnect } from '../src/components/deviceConnect/DeviceConnect'

export const PopupApp = () => {
  return (
    <div className={styles.popupApp}>
      <DeviceConnect />
    </div>
  )
}
