import { useState, useEffect } from 'react'
import { Slider, RangeSlider } from '@mantine/core'
import { useShallow } from 'zustand/shallow'
import clsx from 'clsx'
import { useHandySetup, useHandyStore } from '@/store/useHandyStore'
import { DeviceInfo } from '../deviceInfo/DeviceInfo'
import styles from './DeviceConnect.module.scss'

export const DeviceConnect = () => {
  const {
    config,
    isConnected,
    error,
    connect,
    disconnect,
    setOffset,
    setStrokeSettings,
    setConnectionKey: storeSetConnectionKey,
  } = useHandyStore(
    useShallow((state) => ({
      config: state.config,
      isConnected: state.isConnected,
      error: state.error,
      connect: state.connect,
      disconnect: state.disconnect,
      setOffset: state.setOffset,
      setStrokeSettings: state.setStrokeSettings,
      setConnectionKey: state.setConnectionKey,
    })),
  )

  // Initialize Handy API
  useHandySetup()

  const [connectionKey, setConnectionKey] = useState('')
  const [currentOffset, setCurrentOffset] = useState(0)
  const [strokeRange, setStrokeRange] = useState<[number, number]>([0, 1])

  // Load initial values from store
  useEffect(() => {
    if (config.connectionKey) {
      setConnectionKey(config.connectionKey)
    }
  }, [config.connectionKey])

  useEffect(() => {
    setCurrentOffset(config.offset)
  }, [config.offset])

  useEffect(() => {
    setStrokeRange([config.stroke.min, config.stroke.max])
  }, [config.stroke])

  useEffect(() => {
    if (connectionKey && connectionKey !== config.connectionKey) {
      storeSetConnectionKey(connectionKey)
    }
  }, [connectionKey, config.connectionKey, storeSetConnectionKey])

  const handleConnect = async () => {
    try {
      if (isConnected) {
        await disconnect()
        return
      }

      await connect()
    } catch (err) {
      console.error('Error during connect/disconnect:', err)
    }
  }

  const handleOffsetChangeEnd = async (value: number) => {
    try {
      await setOffset(value)
    } catch (err) {
      console.error('Error changing offset:', err)
    }
  }

  const handleStrokeRangeChange = (value: [number, number]) => {
    setStrokeRange(value)
  }

  const handleStrokeRangeChangeEnd = async (value: [number, number]) => {
    try {
      await setStrokeSettings(value[0], value[1])
    } catch (err) {
      console.error('Error changing stroke settings:', err)
    }
  }

  return (
    <div className={styles.deviceConnect}>
      <h2 className='header3'>Device Connection</h2>

      {error && !isConnected && (
        <div className={styles.errorMessage}>Error: {error}</div>
      )}

      <div className={styles.connectionForm}>
        <input
          type='text'
          className='input'
          placeholder='Connection Key'
          value={connectionKey}
          onChange={(e) => setConnectionKey(e.target.value)}
          disabled={isConnected}
        />

        <button
          className={clsx(
            'button primary',
            isConnected && 'active',
            styles.connectButton,
          )}
          onClick={handleConnect}
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </button>
      </div>

      <DeviceInfo />

      {isConnected && (
        <div className={styles.settings}>
          <h3>Settings</h3>

          <div className={styles.settingsGroup}>
            <label htmlFor='offset'>
              Timing Offset: <strong>{currentOffset}ms</strong>
            </label>
            <Slider
              id='offset'
              min={-500}
              max={500}
              value={currentOffset}
              onChange={setCurrentOffset}
              onChangeEnd={handleOffsetChangeEnd}
              marks={[
                { value: -500, label: '-500ms' },
                { value: 0, label: '0' },
                { value: 500, label: '500ms' },
              ]}
              className={styles.slider}
            />
          </div>

          <div className={styles.settingsGroup}>
            <label htmlFor='stroke-range'>
              Stroke Range:{' '}
              <strong>
                {(strokeRange[0] * 100).toFixed(0)}% -{' '}
                {(strokeRange[1] * 100).toFixed(0)}%
              </strong>
            </label>
            <RangeSlider
              id='stroke-range'
              min={0}
              max={1}
              step={0.01}
              minRange={0.05}
              value={strokeRange}
              onChange={handleStrokeRangeChange}
              onChangeEnd={handleStrokeRangeChangeEnd}
              marks={[
                { value: 0, label: '0%' },
                { value: 0.5, label: '50%' },
                { value: 1, label: '100%' },
              ]}
              className={styles.slider}
            />
          </div>
        </div>
      )}
    </div>
  )
}
