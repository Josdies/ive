import styles from './PopupApp.module.scss'
import { DeviceConnect } from '../src/components/deviceConnect/DeviceConnect'
import { useHandySetup } from '@/store/useHandyStore'

export const PopupApp = () => {
  useHandySetup('popup', true)

  return (
    <div className={styles.popupApp}>
      <DeviceConnect />
    </div>
  )
}
