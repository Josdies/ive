import { useEffect, useState, useCallback, useRef } from 'react'
import { HandyConfig } from '../store/useHapticStore'
import {
  DeviceInfo,
  HandyApi,
  StrokeSettings,
  createHandyApi,
} from '../../shared/api/handyApi'

const HANDY_BASE_URL = import.meta.env.VITE_HANDY_BASE_URL
const HANDY_APPLICATION_ID = import.meta.env.VITE_HANDY_APPLICATION_ID

export const useHandy = (config: HandyConfig) => {
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const apiRef = useRef<HandyApi | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const syncTimerRef = useRef<number | null>(null)

  // Initialize API on mount or when config changes
  useEffect(() => {
    if (!apiRef.current) {
      apiRef.current = createHandyApi(
        HANDY_BASE_URL,
        HANDY_APPLICATION_ID,
        config.connectionKey,
      )
    } else if (config.connectionKey) {
      apiRef.current.setConnectionKey(config.connectionKey)
    }
  }, [config.connectionKey])

  // Clean up event source
  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current)
      syncTimerRef.current = null
    }
  }, [])

  // Clean up when unmounting
  useEffect(() => {
    return () => {
      closeEventSource()
    }
  }, [closeEventSource])

  const connect = useCallback(async (): Promise<boolean> => {
    console.log('Handy: connect')
    if (!apiRef.current) {
      setError('API not initialized')
      return false
    }

    if (config.connectionKey?.length < 5) {
      setError('Connection key must be at least 5 characters')
      return false
    }

    setError(null)

    try {
      closeEventSource()

      // Synchronize time
      await apiRef.current.syncTime()

      // Create SSE connection for events
      const eventSource = apiRef.current.createEventSource()

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error)
      }

      eventSource.addEventListener('device_status', (event) => {
        console.log('Handy: event: device_status', event)
        const data = JSON.parse(event.data)
        setIsConnected(data.data.connected)
        setDeviceInfo(data.data.info)
      })

      eventSource.addEventListener('device_connected', (event) => {
        console.log('Handy: event: device_connected', event.data)
        const data = JSON.parse(event.data)
        setIsConnected(true)
        setDeviceInfo(data.data.info)
      })

      eventSource.addEventListener('device_disconnected', (event) => {
        console.log('Handy: event: device_disconnected', event.data)
        setIsConnected(false)
      })

      eventSource.addEventListener('mode_changed', (event) => {
        console.log('Handy: event: mode_changed', event.data)
        setIsPlaying(false)
      })

      eventSource.addEventListener('hsp_state_changed', (event) => {
        console.log('Handy: event: hsp_state_changed', event.data)
        const data = JSON.parse(event.data)
        // Set isPlaying based on play_state
        setIsPlaying(data.data.data?.play_state === 1)
      })

      // Store refs
      eventSourceRef.current = eventSource

      // Initialize device info
      await apiRef.current.getOffset()
      await apiRef.current.getStrokeSettings()

      return true
    } catch (error) {
      console.error('Handy: Error connecting to device:', error)
      setError('Failed to connect to device')
      return false
    }
  }, [closeEventSource, config.connectionKey])

  const disconnect = useCallback(async (): Promise<boolean> => {
    console.log('Handy: disconnect')

    if (apiRef.current && isConnected) {
      await apiRef.current.stop()
    }

    closeEventSource()
    setIsConnected(false)
    setDeviceInfo(null)
    setIsPlaying(false)

    // We always consider disconnect successful for better UX
    return true
  }, [closeEventSource, isConnected])

  const setupScript = useCallback(
    async (scriptUrl: string): Promise<boolean> => {
      console.log('Handy: setupScript')
      if (!apiRef.current || !isConnected) {
        console.warn('Not connected to a device - setupScript')
        return false
      }

      try {
        const success = await apiRef.current.setupScript(scriptUrl)

        if (!success) {
          setError('Failed to set up script')
        }

        return success
      } catch (error) {
        console.error('Handy: Error setting up script:', error)
        setError('Failed to set up script')
        return false
      }
    },
    [isConnected],
  )

  const play = useCallback(
    async (videoTime: number): Promise<boolean> => {
      console.log('Handy: play')
      if (!apiRef.current || !isConnected) {
        setError('Not connected to a device')
        return false
      }

      try {
        const hspState = await apiRef.current.play(videoTime)

        if (hspState) {
          setIsPlaying(hspState.play_state === 1)
          // Sync immediately
          apiRef.current.syncVideoTime(videoTime)
          return true
        }

        return false
      } catch (error) {
        console.error('Handy: Error playing script:', error)
        setError('Failed to play script')
        return false
      }
    },
    [isConnected],
  )

  const stop = useCallback(async (): Promise<boolean> => {
    console.log('Handy: stop')
    if (!apiRef.current || !isConnected) {
      setError('Not connected to a device')
      return false
    }

    // Clear any sync timers
    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current)
      syncTimerRef.current = null
    }

    try {
      const hspState = await apiRef.current.stop()

      if (hspState) {
        setIsPlaying(hspState.play_state === 1)
        return true
      }

      return false
    } catch (error) {
      console.error('Handy: Error stopping script:', error)
      setError('Failed to stop script')
      return false
    }
  }, [isConnected])

  const syncVideoTime = useCallback(
    async (videoTime: number): Promise<boolean> => {
      console.log('Handy: syncVideoTime')
      if (!apiRef.current || !isConnected || !isPlaying) {
        return false
      }

      try {
        return await apiRef.current.syncVideoTime(videoTime)
      } catch (error) {
        console.error('Handy: Error syncing video time:', error)
        // Don't show errors for sync operations
        return false
      }
    },
    [isConnected, isPlaying],
  )

  const getOffset = useCallback(async (): Promise<number | null> => {
    console.log('Handy: getOffset')
    if (!apiRef.current) {
      return null
    }

    try {
      return await apiRef.current.getOffset()
    } catch (error) {
      console.error('Handy: Error getting offset:', error)
      return 0
    }
  }, [])

  const setOffset = useCallback(
    async (newOffset: number): Promise<boolean> => {
      console.log('Handy: setOffset')
      if (!apiRef.current || !isConnected) {
        setError('Not connected to a device')
        return false
      }

      try {
        return await apiRef.current.setOffset(newOffset)
      } catch (error) {
        console.error('Handy: Error setting offset:', error)
        setError('Failed to set offset')
        return false
      }
    },
    [isConnected],
  )

  const getStrokeSettings =
    useCallback(async (): Promise<StrokeSettings | null> => {
      console.log('Handy: getStrokeSettings')
      if (!apiRef.current || !isConnected) {
        setError('Not connected to a device')
        return null
      }

      try {
        return await apiRef.current.getStrokeSettings()
      } catch (error) {
        console.error('Handy: Error getting stroke settings:', error)
        return null
      }
    }, [isConnected])

  const setStrokeSettings = useCallback(
    async (settings: { min: number; max: number }): Promise<boolean> => {
      console.log('Handy: setStrokeSettings')
      if (!apiRef.current || !isConnected) {
        setError('Not connected to a device')
        return false
      }

      try {
        const result = await apiRef.current.setStrokeSettings(settings)
        return !!result
      } catch (error) {
        console.error('Handy: Error setting stroke settings:', error)
        setError('Failed to set stroke settings')
        return false
      }
    },
    [isConnected],
  )

  return {
    isConnected,
    deviceInfo,
    isPlaying,
    error,
    connect,
    disconnect,
    setupScript,
    play,
    stop,
    syncVideoTime,
    getOffset,
    setOffset,
    getStrokeSettings,
    setStrokeSettings,
  }
}
