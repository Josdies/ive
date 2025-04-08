import { useState, useEffect } from 'react'
import { Slider, RangeSlider } from '@mantine/core'
import {
  useHandyStore,
  useHandySetup,
} from '../../../shared/store/useHandyStore'
import { useShallow } from 'zustand/shallow'
import { DeviceInfo } from '../deviceInfo/DeviceInfo'
import styles from './HandyConnect.module.scss'
import clsx from 'clsx'

export const HandyConnect = () => {
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

  const handleOffsetChange = (value: number) => {
    setCurrentOffset(value)
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
    <div className={styles.handyConnect}>
      <h1 className='header2'>Connect to Handy</h1>
      <p>Enter your Handy connection key</p>

      {error && !isConnected && (
        <div className={styles.errorMessage}>Error: {error}</div>
      )}

      <input
        type='text'
        className='input'
        placeholder='Connection Key'
        value={connectionKey}
        onChange={(e) => {
          setConnectionKey(e.target.value)
        }}
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

      <DeviceInfo />

      {isConnected && (
        <div className={styles.settings}>
          <h3 className='header3'>Settings</h3>

          <label htmlFor='offset'>
            Offset: <strong>{currentOffset}ms</strong> (adjust timing between
            video and device)
          </label>
          <Slider
            id='offset'
            min={-500}
            max={500}
            value={currentOffset}
            onChange={handleOffsetChange}
            onChangeEnd={handleOffsetChangeEnd}
            marks={[
              { value: -500, label: '-500ms' },
              { value: -250, label: '-250ms' },
              { value: 0, label: '0ms' },
              { value: 250, label: '250ms' },
              { value: 500, label: '500ms' },
            ]}
            className={styles.offsetSlider}
          />

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
              { value: 0.25, label: '25%' },
              { value: 0.5, label: '50%' },
              { value: 0.75, label: '75%' },
              { value: 1, label: '100%' },
            ]}
            className={styles.offsetSlider}
          />

          <p>
            Adjust offset and stroke range settings to customize your
            experience.
          </p>
        </div>
      )}
    </div>
  )
}
