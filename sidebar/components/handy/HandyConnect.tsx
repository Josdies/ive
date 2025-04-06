import { useShallow } from 'zustand/shallow'
import { useHapticStore } from '../../store/useHapticStore'
import { useState, useEffect } from 'react'

export const HandyConnect = () => {
  const { config, setConfig } = useHapticStore(
    useShallow((state) => ({
      config: state.config,
      setConfig: state.setConfig,
    })),
  )

  const [connectionKey, setConnectionKey] = useState('')

  useEffect(() => {
    if (config.handy?.connectionKey) {
      setConnectionKey(config.handy.connectionKey)
    }
  }, [config.handy?.connectionKey])

  const handleConnect = () => {}

  return (
    <div className='handy-connect'>
      <h1>Connect to Handy</h1>
      <p>Enter your Handy connection key</p>
      <input
        type='text'
        placeholder='Connection Key'
        value={connectionKey}
        onChange={(e) => {
          setConnectionKey(e.target.value)
          setConfig('handy', { connectionKey })
        }}
      />
      <button className='button primary' onClick={handleConnect}>
        Connect
      </button>
    </div>
  )
}
