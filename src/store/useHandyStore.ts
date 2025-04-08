import { create } from 'zustand'
import { DeviceInfo } from '../api/handyApi'
import { useEffect } from 'react'

// Persistent configuration - only what we need to store
type HandyConfig = {
  connectionKey: string
  offset: number
  stroke: {
    min: number
    max: number
  }
  wasManuallyDisconnected: boolean
}

// Main Handy state
type HandyState = {
  config: HandyConfig
  isConnected: boolean
  deviceInfo: DeviceInfo | null
  isPlaying: boolean
  error: string | null
}

// Actions available on the store
type HandyActions = {
  setConnectionKey: (key: string) => Promise<void>
  setOffset: (offset: number) => Promise<boolean>
  setStrokeSettings: (min: number, max: number) => Promise<boolean>

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

// Define message type for better type safety
type BackgroundMessage = {
  type: string
  [key: string]: unknown
}

// Helper function to send messages to background script
async function sendMessageToBackground<T>(
  message: BackgroundMessage,
): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve(response as T)
      }
    })
  })
}

// Create the store
export const useHandyStore = create<HandyStore>()(() => ({
  // Initial state
  config: {
    connectionKey: '',
    offset: 0,
    stroke: {
      min: 0,
      max: 1,
    },
    wasManuallyDisconnected: false,
  },
  isConnected: false,
  deviceInfo: null,
  isPlaying: false,
  error: null,

  // Actions
  setConnectionKey: async (connectionKey: string) => {
    await sendMessageToBackground({
      type: 'handy_set_connection_key',
      key: connectionKey,
    })
  },

  setOffset: async (offset: number) => {
    return await sendMessageToBackground({
      type: 'handy_set_offset',
      offset,
    })
  },

  setStrokeSettings: async (min: number, max: number) => {
    return await sendMessageToBackground({
      type: 'handy_set_stroke_settings',
      min,
      max,
    })
  },

  // Core device operations
  connect: async () => {
    return await sendMessageToBackground({
      type: 'handy_connect',
    })
  },

  disconnect: async () => {
    return await sendMessageToBackground({
      type: 'handy_disconnect',
    })
  },

  setupScript: async (scriptUrl: string) => {
    return await sendMessageToBackground({
      type: 'handy_setup_script',
      scriptUrl,
    })
  },

  play: async (videoTime: number, playbackRate = 1.0, loop = false) => {
    return await sendMessageToBackground({
      type: 'handy_play',
      videoTime,
      playbackRate,
      loop,
    })
  },

  stop: async () => {
    return await sendMessageToBackground({
      type: 'handy_stop',
    })
  },

  syncVideoTime: async (videoTime: number) => {
    return await sendMessageToBackground({
      type: 'handy_sync_video_time',
      videoTime,
    })
  },
}))

// Hook to manage Handy state updates from background
export const useHandySetup = (
  context: 'popup' | 'contentScript' = 'popup',
  needsConnection = true,
) => {
  useEffect(() => {
    // Get initial state
    const fetchInitialState = async () => {
      try {
        const state = await sendMessageToBackground<HandyState>({
          type: 'handy_get_state',
        })

        useHandyStore.setState(state)
      } catch (error) {
        console.error('Error fetching initial state:', error)
      }
    }

    fetchInitialState()

    // Tell background this context is active and needs connection
    if (needsConnection) {
      sendMessageToBackground({
        type: 'handy_context_active',
        context,
        active: true,
      }).catch(console.error)
    }

    // Listen for state updates from background
    const handleStateUpdate = (message: {
      type: string
      state: HandyState
    }) => {
      if (message.type === 'handy_state_update') {
        useHandyStore.setState(message.state)
      }
    }

    chrome.runtime.onMessage.addListener(handleStateUpdate)

    // Cleanup
    return () => {
      if (needsConnection) {
        // Tell background this context is no longer active
        sendMessageToBackground({
          type: 'handy_context_active',
          context,
          active: false,
        }).catch(console.error)
      }

      chrome.runtime.onMessage.removeListener(handleStateUpdate)
    }
  }, [context, needsConnection])
}
