import { useState, useEffect } from 'react'
import { Slider } from '@mantine/core'
import { useHandyStore, useHandySetup } from '../../store/useHandyStore'
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
    setConnectionKey: storeSetConnectionKey,
  } = useHandyStore(
    useShallow((state) => ({
      config: state.config,
      isConnected: state.isConnected,
      error: state.error,
      connect: state.connect,
      disconnect: state.disconnect,
      setOffset: state.setOffset,
      setConnectionKey: state.setConnectionKey,
    })),
  )

  // Initialize Handy API
  useHandySetup()

  const [connectionKey, setConnectionKey] = useState('')
  const [currentOffset, setCurrentOffset] = useState(0)

  useEffect(() => {
    if (config.connectionKey) {
      setConnectionKey(config.connectionKey)
    }
  }, [config.connectionKey])

  useEffect(() => {
    setCurrentOffset(config.offset)
  }, [config.offset])

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
    try {
      setCurrentOffset(value)
      setOffset(value)
    } catch (err) {
      console.error('Error changing offset:', err)
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
            marks={[
              { value: -500, label: '-500ms' },
              { value: -250, label: '-250ms' },
              { value: 0, label: '0ms' },
              { value: 250, label: '250ms' },
              { value: 500, label: '500ms' },
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
