import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { HandyConfig } from '../store/useHapticStore'

const HANDY_BASE_URL = import.meta.env.VITE_HANDY_BASE_URL
const HANDY_APPLICATION_ID = import.meta.env.VITE_HANDY_APPLICATION_ID

export type DeviceInfo = {
  fw_version: string
  hw_model_name: string
  session_id: string
  fw_status?: number
  hw_model_no?: number
  hw_model_variant?: number
  fw_feature_flags?: string
}

export type DeviceTimeInfo = {
  time: number
  clock_offset: number
  rtd: number
}

export type OffsetResponse = {
  offset: number
}

export type HspState = {
  play_state: number | string
  pause_on_starving?: boolean
  points: number
  max_points: number
  current_point: number
  current_time: number
  loop: boolean
  playback_rate: number
  first_point_time: number
  last_point_time: number
  stream_id: number | string
  tail_point_stream_index: number
  tail_point_stream_index_threshold: number
}

export type StrokeSettings = {
  min: number
  max: number
  min_absolute?: number
  max_absolute?: number
}

export const useHandy = (config: HandyConfig) => {
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Refs for handling event sources and timers
  const eventSourceRef = useRef<EventSource | null>(null)
  const syncTimerRef = useRef<number | null>(null)

  // Time synchronization related state
  const serverTimeOffsetRef = useRef<number>(0)

  const fetchHeaders = useMemo(
    () => ({
      'X-Connection-Key': config.connectionKey,
      Authorization: `Bearer ${HANDY_APPLICATION_ID}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }),
    [config.connectionKey],
  )

  const estimateServerTime = useCallback(() => {
    return Math.round(Date.now() + serverTimeOffsetRef.current)
  }, [])

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

  const syncTime = useCallback(async () => {
    console.log('Handy: syncTime')
    try {
      const samples: { rtd: number; offset: number }[] = []
      const sampleCount = 10

      for (let i = 0; i < sampleCount; i++) {
        try {
          const start = Date.now()
          const response = await fetch(`${HANDY_BASE_URL}/servertime`)
          const data = await response.json()

          if (!data.server_time) continue

          const end = Date.now()
          const rtd = end - start // Round trip delay
          const serverTimeEst = rtd / 2 + data.server_time

          samples.push({
            rtd,
            offset: serverTimeEst - end,
          })
        } catch (error) {
          console.warn('Error during time sync sample:', error)
          // Continue with other samples
        }
      }

      // Even with only one sample, we can still get an approximate offset
      if (samples.length > 0) {
        samples.sort((a, b) => a.rtd - b.rtd)

        const usableSamples =
          samples.length > 3
            ? samples.slice(0, Math.ceil(samples.length * 0.8))
            : samples

        const averageOffset =
          usableSamples.reduce((acc, sample) => acc + sample.offset, 0) /
          usableSamples.length
        serverTimeOffsetRef.current = averageOffset
      }

      return true
    } catch (error) {
      console.error('Error syncing time:', error)
      // Don't block the flow for time sync errors
      return true
    }
  }, [])

  const syncVideoTime = useCallback(
    async (videoTime: number): Promise<boolean> => {
      console.log('Handy: syncVideoTime')
      if (!isConnected || !isPlaying) {
        return false
      }

      try {
        const response = await fetch(`${HANDY_BASE_URL}/hssp/synctime`, {
          method: 'PUT',
          headers: fetchHeaders,
          body: JSON.stringify({
            current_time: Math.round(videoTime * 1000),
            server_time: estimateServerTime(),
            filter: 0.5,
          }),
        })

        const data = await response.json()
        return data.result.stream_id || false
      } catch (error) {
        console.error('Error syncing video time:', error)
        // Don't show errors for sync operations
        return false
      }
    },
    [estimateServerTime, fetchHeaders, isConnected, isPlaying],
  )

  const getOffset = useCallback(async (): Promise<number | null> => {
    console.log('Handy: getOffset')
    try {
      const response = await fetch(`${HANDY_BASE_URL}/hstp/offset`, {
        method: 'GET',
        headers: fetchHeaders,
      })
      const data = await response.json()

      return data.offset ?? 0
    } catch (error) {
      console.error('Error getting offset:', error)
      return 0
    }
  }, [fetchHeaders])

  const setHandyOffset = useCallback(
    async (newOffset: number): Promise<boolean> => {
      console.log('Handy: setOffset')
      if (!isConnected) {
        setError('Not connected to a device')
        return false
      }

      try {
        const response = await fetch(`${HANDY_BASE_URL}/hstp/offset`, {
          method: 'PUT',
          headers: fetchHeaders,
          body: JSON.stringify({ offset: newOffset }),
        })

        const data = await response.json()

        return data.result || false
      } catch (error) {
        console.error('Error setting offset:', error)
        setError('Failed to set offset')
        return false
      }
    },
    [fetchHeaders, isConnected],
  )

  const getStrokeSettings =
    useCallback(async (): Promise<StrokeSettings | null> => {
      console.log('Handy: getStrokeSettings')
      if (!isConnected) {
        setError('Not connected to a device')
        return null
      }

      try {
        const response = await fetch(`${HANDY_BASE_URL}/slider/stroke`, {
          method: 'GET',
          headers: fetchHeaders,
        })
        const data = await response.json()

        return data?.result ?? null
      } catch (error) {
        console.error('Error getting stroke settings:', error)
        return null
      }
    }, [fetchHeaders, isConnected])

  const setStrokeSettings = useCallback(
    async (settings: StrokeSettings): Promise<boolean> => {
      console.log('Handy: setStrokeSettings')
      if (!isConnected) {
        setError('Not connected to a device')
        return false
      }

      try {
        const response = await fetch(`${HANDY_BASE_URL}/slider/stroke`, {
          method: 'PUT',
          headers: fetchHeaders,
          body: JSON.stringify({
            min: settings.min,
            max: settings.max,
          }),
        })

        const data = await response.json()

        return !!data?.result
      } catch (error) {
        console.error('Error setting stroke settings:', error)
        setError('Failed to set stroke settings')
        return false
      }
    },
    [fetchHeaders, isConnected],
  )

  const connect = useCallback(async (): Promise<boolean> => {
    console.log('Handy: connect')
    if (config.connectionKey?.length < 5) {
      setError('Connection key must be at least 5 characters')
      return false
    }

    setError(null)

    try {
      closeEventSource()

      await syncTime()

      // Create SSE connection
      const eventSource = new EventSource(
        `${HANDY_BASE_URL}/sse?ck=${config.connectionKey}&apikey=${HANDY_APPLICATION_ID}`,
      )

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error)
      }

      eventSource.addEventListener('device_status', (event) => {
        console.log('Handy: event: device_status', event)
        try {
          const data = JSON.parse(event.data)
          setIsConnected(data.data.connected)
          if (data.data.connected && data.data.info) {
            setDeviceInfo(data.data.info)
          }
        } catch (error) {
          console.error('Error parsing device status event:', error)
        }
      })

      eventSource.addEventListener('device_connected', (event) => {
        console.log('Handy: event: device_connected', event.data)
        try {
          const data = JSON.parse(event.data)
          setIsConnected(true)
          if (data.data.info) {
            setDeviceInfo(data.data.info)
          }
        } catch (error) {
          console.error('Error parsing device connected event:', error)
        }
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
        try {
          const data = JSON.parse(event.data)
          const playState = data.data.data.play_state
          setIsPlaying(
            playState === 1 ||
              playState === 'PLAYING' ||
              playState === 'playing',
          )
        } catch (error) {
          console.error('Error parsing HSP state changed event:', error)
        }
      })

      // Store refs and state
      eventSourceRef.current = eventSource

      await getOffset()
      await getStrokeSettings()

      return true
    } catch (error) {
      console.error('Error connecting to device:', error)
      setError('Failed to connect to device')
      return false
    }
  }, [
    closeEventSource,
    config.connectionKey,
    getOffset,
    getStrokeSettings,
    syncTime,
  ])

  const setupScript = useCallback(
    async (scriptUrl: string): Promise<boolean> => {
      console.log('Handy: setupScript')
      if (!isConnected) {
        console.warn('Not connected to a device - setupScript')
        return false
      }

      try {
        const response = await fetch(`${HANDY_BASE_URL}/hssp/setup`, {
          method: 'PUT',
          headers: fetchHeaders,
          body: JSON.stringify({ url: scriptUrl }),
        })

        const data = await response.json()
        return !!data.result.stream_id || false
      } catch (error) {
        console.error('Error setting up script:', error)
        setError('Failed to set up script')
        return false
      }
    },
    [fetchHeaders, isConnected],
  )

  const play = useCallback(
    async (videoTime: number): Promise<boolean> => {
      console.log('Handy: play')
      if (!isConnected) {
        setError('Not connected to a device')
        return false
      }

      try {
        const response = await fetch(`${HANDY_BASE_URL}/hssp/play`, {
          method: 'PUT',
          headers: fetchHeaders,
          body: JSON.stringify({
            start_time: Math.round(videoTime * 1000),
            server_time: estimateServerTime(),
            playback_rate: 1.0,
            loop: false,
          }),
        })

        const data = await response.json()
        if (data.result.stream_id) {
          setIsPlaying(data.result.play_state === 1)
          syncVideoTime(videoTime)
          return true
        }
        return data.success || false
      } catch (error) {
        console.error('Error playing script:', error)
        setError('Failed to play script')
        return false
      }
    },
    [estimateServerTime, fetchHeaders, isConnected, syncVideoTime],
  )

  const stop = useCallback(async (): Promise<boolean> => {
    console.log('Handy: stop')
    if (!isConnected) {
      setError('Not connected to a device')
      return false
    }

    // Clear any sync timers
    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current)
      syncTimerRef.current = null
    }

    try {
      const response = await fetch(`${HANDY_BASE_URL}/hssp/stop`, {
        method: 'PUT',
        headers: fetchHeaders,
      })

      const data = await response.json()
      if (data.result.stream_id) {
        setIsPlaying(data.result.play_state === 2)
        return true
      }
      return false
    } catch (error) {
      console.error('Error stopping script:', error)
      setError('Failed to stop script')
      return false
    }
  }, [fetchHeaders, isConnected])

  const disconnect = useCallback(async (): Promise<boolean> => {
    console.log('Handy: disconnect')
    await stop()
    closeEventSource()
    setIsConnected(false)
    setDeviceInfo(null)
    setIsPlaying(false)

    // We always disconnect for user experience
    return true
  }, [closeEventSource, stop])

  // Clean up when the hook unmounts
  useEffect(() => {
    return () => {
      closeEventSource()
    }
  }, [closeEventSource])

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
    setOffset: setHandyOffset,
    getStrokeSettings,
    setStrokeSettings,
  }
}
