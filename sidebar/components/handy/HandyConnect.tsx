import { useState, useEffect } from 'react'
import { useHandyStore, useHandySetup } from '../../store/useHandyStore'
import { useShallow } from 'zustand/shallow'
import { DeviceInfo } from '../deviceInfo/DeviceInfo'

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

  // Load connection key from store
  useEffect(() => {
    if (config.connectionKey) {
      setConnectionKey(config.connectionKey)
    }
  }, [config.connectionKey])

  useEffect(() => {
    setCurrentOffset(config.offset)
  }, [config.offset])

  // Update store when connection key changes in component
  useEffect(() => {
    if (connectionKey && connectionKey !== config.connectionKey) {
      storeSetConnectionKey(connectionKey)
    }
  }, [connectionKey, config.connectionKey, storeSetConnectionKey])

  // Handle connect button click
  const handleConnect = async () => {
    try {
      if (isConnected) {
        // Disconnect
        await disconnect()
        return
      }

      // Connect - success is handled by store effects
      await connect()
    } catch (err) {
      console.error('Error during connect/disconnect:', err)
    }
  }

  // Handle offset change
  const handleOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const newOffset = parseInt(e.target.value, 10)
      setCurrentOffset(newOffset)
      setOffset(newOffset)
    } catch (err) {
      console.error('Error changing offset:', err)
    }
  }

  return (
    <div className='handy-connect'>
      <h1 className='header2'>Connect to Handy</h1>
      <p>Enter your Handy connection key</p>

      {error && !isConnected && (
        <div
          style={{
            color: 'red',
            marginBottom: '10px',
            padding: '8px',
            backgroundColor: 'rgba(255,0,0,0.05)',
            borderRadius: '4px',
          }}
        >
          Error: {error}
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <input
          type='text'
          className='input'
          placeholder='Connection Key'
          value={connectionKey}
          onChange={(e) => {
            setConnectionKey(e.target.value)
          }}
          disabled={isConnected}
          style={{ marginBottom: '8px' }}
        />

        <button
          className={`button primary ${isConnected ? 'active' : ''}`}
          onClick={handleConnect}
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </button>
      </div>

      <DeviceInfo />

      {isConnected && (
        <div style={{ marginTop: '16px' }}>
          <h3 className='header3'>Settings</h3>

          <label htmlFor='offset'>
            Offset: <strong>{currentOffset}ms</strong> (adjust timing between
            video and device)
          </label>
          <input
            type='range'
            id='offset'
            min='-500'
            max='500'
            value={currentOffset}
            onChange={handleOffsetChange}
            className='input'
            style={{ width: '100%' }}
          />
          <div>
            <p>
              Adjust offset and stroke range settings to customize your
              experience.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
