import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { chromeLocalStorage } from '../../shared/util/chromeLocalStorage'
import { useEffect } from 'react'
import { DeviceInfo, HandyApi, createHandyApi } from '../../shared/api/handyApi'

const HANDY_BASE_URL = import.meta.env.VITE_HANDY_BASE_URL
const HANDY_APPLICATION_ID = import.meta.env.VITE_HANDY_APPLICATION_ID

// Persistent configuration - only what we need to store
type HandyConfig = {
  connectionKey: string
  offset: number
  stroke: {
    min: number
    max: number
  }
}

// Main Handy state
type HandyState = {
  config: HandyConfig
  isConnected: boolean
  deviceInfo: DeviceInfo | null
  isPlaying: boolean
  error: string | null
  api: HandyApi | null
  eventSource: EventSource | null
}

// Actions available on the store
type HandyActions = {
  setConfig: (config: Partial<HandyConfig>) => void
  setConnectionKey: (key: string) => void
  setOffset: (offset: number) => void
  setStrokeSettings: (min: number, max: number) => void
  setApi: (api: HandyApi | null) => void
  setEventSource: (eventSource: EventSource | null) => void
  setIsConnected: (isConnected: boolean) => void
  setDeviceInfo: (deviceInfo: DeviceInfo | null) => void
  setIsPlaying: (isPlaying: boolean) => void
  setError: (error: string | null) => void

  // Core device operations
  connect: () => Promise<boolean>
  disconnect: () => Promise<boolean>
  setupScript: (scriptUrl: string) => Promise<boolean>
  play: (
    videoTime: number,
    playbackRate?: number,
    loop?: boolean,
  ) => Promise<boolean>
  stop: () => Promise<boolean>
  syncVideoTime: (videoTime: number) => Promise<boolean>
}

// The full store type
type HandyStore = HandyState & HandyActions

// Create the store
export const useHandyStore = create<HandyStore>()(
  persist(
    (set, get) => ({
      // Initial state
      config: {
        connectionKey: '',
        offset: 0,
        stroke: {
          min: 0,
          max: 100,
        },
      },
      isConnected: false,
      deviceInfo: null,
      isPlaying: false,
      error: null,
      api: null,
      eventSource: null,

      // State setters
      setConfig: (config) =>
        set((state) => ({
          config: { ...state.config, ...config },
        })),

      setConnectionKey: (connectionKey) =>
        set((state) => ({
          config: { ...state.config, connectionKey },
        })),

      setOffset: (offset) =>
        set((state) => ({
          config: { ...state.config, offset },
        })),

      setStrokeSettings: (min, max) =>
        set((state) => ({
          config: { ...state.config, stroke: { min, max } },
        })),

      setApi: (api) => set({ api }),
      setEventSource: (eventSource) => set({ eventSource }),
      setIsConnected: (isConnected) => set({ isConnected }),
      setDeviceInfo: (deviceInfo) => set({ deviceInfo }),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setError: (error) => set({ error }),

      // Core device operations
      connect: async () => {
        const state = get()

        if (
          !state.config.connectionKey ||
          state.config.connectionKey.length < 5
        ) {
          set({ error: 'Connection key must be at least 5 characters' })
          return false
        }

        set({ error: null })

        try {
          // Clean up any existing connections
          if (state.eventSource) {
            state.eventSource.close()
            set({ eventSource: null })
          }

          // Initialize API if needed
          let api = state.api

          if (!api) {
            api = createHandyApi(
              HANDY_BASE_URL,
              HANDY_APPLICATION_ID,
              state.config.connectionKey,
            )
            set({ api })
          } else {
            api.setConnectionKey(state.config.connectionKey)
          }

          // Synchronize time
          await api.syncTime()

          // Create SSE connection for events
          const eventSource = api.createEventSource()

          eventSource.onerror = (error) => {
            console.error('EventSource error:', error)
          }

          eventSource.addEventListener('device_status', (event) => {
            console.log('Handy: event: device_status', event)
            const data = JSON.parse(event.data)
            set({
              isConnected: data.data.connected,
              deviceInfo: data.data.info,
            })
          })

          eventSource.addEventListener('device_connected', (event) => {
            console.log('Handy: event: device_connected', event.data)
            const data = JSON.parse(event.data)
            set({
              isConnected: true,
              deviceInfo: data.data.info,
            })
          })

          eventSource.addEventListener('device_disconnected', (event) => {
            console.log('Handy: event: device_disconnected', event.data)
            set({ isConnected: false })
          })

          eventSource.addEventListener('mode_changed', (event) => {
            console.log('Handy: event: mode_changed', event.data)
            set({ isPlaying: false })
          })

          eventSource.addEventListener('hsp_state_changed', (event) => {
            console.log('Handy: event: hsp_state_changed', event.data)
            const data = JSON.parse(event.data)
            // Set isPlaying based on play_state
            set({ isPlaying: data.data.data?.play_state === 1 })
          })

          // Store the event source
          set({ eventSource })

          // Initialize device settings
          await api.getOffset()
          const strokeSettings = await api.getStrokeSettings()

          if (strokeSettings) {
            set((state) => ({
              config: {
                ...state.config,
                stroke: {
                  min: strokeSettings.min,
                  max: strokeSettings.max,
                },
              },
            }))
          }

          return true
        } catch (error) {
          console.error('Handy: Error connecting to device:', error)
          set({ error: 'Failed to connect to device' })
          return false
        }
      },

      disconnect: async () => {
        const state = get()

        if (state.api && state.isConnected) {
          await state.api.stop()
        }

        if (state.eventSource) {
          state.eventSource.close()
          set({ eventSource: null })
        }

        set({
          isConnected: false,
          deviceInfo: null,
          isPlaying: false,
        })

        // We always consider disconnect successful for better UX
        return true
      },

      setupScript: async (scriptUrl) => {
        const state = get()

        if (!state.api || !state.isConnected) {
          console.warn('Not connected to a device - setupScript')
          return false
        }

        try {
          const success = await state.api.setupScript(scriptUrl)

          if (!success) {
            set({ error: 'Failed to set up script' })
          }

          return success
        } catch (error) {
          console.error('Handy: Error setting up script:', error)
          set({ error: 'Failed to set up script' })
          return false
        }
      },

      play: async (videoTime, playbackRate = 1.0, loop = false) => {
        const state = get()

        if (!state.api || !state.isConnected) {
          set({ error: 'Not connected to a device' })
          return false
        }

        try {
          const hspState = await state.api.play(videoTime, playbackRate, loop)

          if (hspState) {
            set({ isPlaying: hspState.play_state === 1 })
            // Sync immediately
            state.api.syncVideoTime(videoTime)
            return true
          }

          return false
        } catch (error) {
          console.error('Handy: Error playing script:', error)
          set({ error: 'Failed to play script' })
          return false
        }
      },

      stop: async () => {
        const state = get()

        if (!state.api || !state.isConnected) {
          set({ error: 'Not connected to a device' })
          return false
        }

        try {
          const hspState = await state.api.stop()

          if (hspState) {
            set({ isPlaying: hspState.play_state === 1 })
            return true
          }

          return false
        } catch (error) {
          console.error('Handy: Error stopping script:', error)
          set({ error: 'Failed to stop script' })
          return false
        }
      },

      syncVideoTime: async (videoTime) => {
        const state = get()

        if (!state.api || !state.isConnected || !state.isPlaying) {
          return false
        }

        try {
          return await state.api.syncVideoTime(videoTime)
        } catch (error) {
          console.error('Handy: Error syncing video time:', error)
          // Don't show errors for sync operations
          return false
        }
      },
    }),
    {
      name: 'handy-storage',
      storage: createJSONStorage(() => chromeLocalStorage),
      partialize: (state) => ({
        config: {
          connectionKey: state.config.connectionKey,
          offset: state.config.offset,
          stroke: {
            min: state.config.stroke.min,
            max: state.config.stroke.max,
          },
        },
      }),
    },
  ),
)

// Hook to manage Handy API lifecycle
export const useHandySetup = () => {
  const { api, setApi, config } = useHandyStore()

  // Initialize API on mount
  useEffect(() => {
    if (!api) {
      const newApi = createHandyApi(
        HANDY_BASE_URL,
        HANDY_APPLICATION_ID,
        config.connectionKey,
      )
      setApi(newApi)
    }
  }, [api, setApi, config.connectionKey])
}
