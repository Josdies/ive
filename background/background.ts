import { HandyApi, createHandyApi, DeviceInfo } from '../src/api/handyApi'

// Type definitions
type HandyConfig = {
  connectionKey: string
  offset: number
  stroke: {
    min: number
    max: number
  }
  wasManuallyDisconnected: boolean
}

type HandyState = {
  config: HandyConfig
  isConnected: boolean
  deviceInfo: DeviceInfo | null
  isPlaying: boolean
  error: string | null
}

// Constants from environment vars
const HANDY_BASE_URL = 'https://www.handyfeeling.com/api/handy-rest/v3'
const HANDY_APPLICATION_ID = 'qPH5gJibT7vahb3v27DdWkagy53yeOqD'

// Initialize state
let handyApi: HandyApi | null = null
let eventSource: EventSource | null = null

const state: HandyState = {
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
}

// Load stored config
async function loadConfig() {
  try {
    const storedData = await chrome.storage.local.get('handy-storage')
    if (storedData['handy-storage']) {
      const parsedData = JSON.parse(storedData['handy-storage'])
      if (parsedData.state?.config) {
        state.config = {
          ...state.config,
          ...parsedData.state.config,
        }
        console.log('Loaded stored config:', state.config)
      }
    }
  } catch (error) {
    console.error('Error loading config:', error)
  }
}

// Save config
async function saveConfig() {
  try {
    const dataToStore = {
      state: {
        config: {
          connectionKey: state.config.connectionKey,
          offset: state.config.offset,
          stroke: {
            min: state.config.stroke.min,
            max: state.config.stroke.max,
          },
          wasManuallyDisconnected: state.config.wasManuallyDisconnected,
        },
      },
    }
    await chrome.storage.local.set({
      'handy-storage': JSON.stringify(dataToStore),
    })
  } catch (error) {
    console.error('Error saving config:', error)
  }
}

// Initialize API
function initializeApi() {
  if (!handyApi && state.config.connectionKey) {
    handyApi = createHandyApi(
      HANDY_BASE_URL,
      HANDY_APPLICATION_ID,
      state.config.connectionKey,
    )
    console.log('API initialized with key:', state.config.connectionKey)
  }
  return handyApi
}

// Connect to device
async function connectDevice() {
  try {
    if (!state.config.connectionKey || state.config.connectionKey.length < 5) {
      state.error = 'Connection key must be at least 5 characters'
      broadcastState()
      return false
    }

    state.error = null

    // Clean up any existing connections
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }

    // Initialize API if needed
    if (!handyApi) {
      handyApi = createHandyApi(
        HANDY_BASE_URL,
        HANDY_APPLICATION_ID,
        state.config.connectionKey,
      )
    } else {
      handyApi.setConnectionKey(state.config.connectionKey)
    }

    // Synchronize time
    await handyApi.syncTime()

    // Create SSE connection for events
    eventSource = handyApi.createEventSource()

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error)
    }

    eventSource.addEventListener('device_status', (event) => {
      console.log('Handy: event: device_status', event)
      const data = JSON.parse(event.data)
      state.isConnected = data.data.connected
      state.deviceInfo = data.data.info
      broadcastState()
    })

    eventSource.addEventListener('device_connected', (event) => {
      console.log('Handy: event: device_connected', event.data)
      const data = JSON.parse(event.data)
      state.isConnected = true
      state.deviceInfo = data.data.info
      broadcastState()
    })

    eventSource.addEventListener('device_disconnected', (event) => {
      console.log('Handy: event: device_disconnected', event.data)
      state.isConnected = false
      broadcastState()
    })

    eventSource.addEventListener('mode_changed', (event) => {
      console.log('Handy: event: mode_changed', event.data)
      state.isPlaying = false
      broadcastState()
    })

    eventSource.addEventListener('hsp_state_changed', (event) => {
      console.log('Handy: event: hsp_state_changed', event.data)
      const data = JSON.parse(event.data)
      // Set isPlaying based on play_state
      state.isPlaying = data.data.data?.play_state === 1
      broadcastState()
    })

    // Initialize device settings
    await handyApi.getOffset()
    const strokeSettings = await handyApi.getStrokeSettings()

    if (strokeSettings) {
      state.config.stroke = {
        min: strokeSettings.min,
        max: strokeSettings.max,
      }
    }

    // Apply current offset and stroke settings to device
    await handyApi.setOffset(state.config.offset)
    await handyApi.setStrokeSettings({
      min: state.config.stroke.min,
      max: state.config.stroke.max,
    })

    // Save updated config
    saveConfig()
    broadcastState()
    return true
  } catch (error) {
    console.error('Handy: Error connecting to device:', error)
    state.error = 'Failed to connect to device'
    broadcastState()
    return false
  }
}

// Disconnect device
async function disconnectDevice() {
  try {
    if (handyApi && state.isConnected) {
      await handyApi.stop()
    }

    if (eventSource) {
      eventSource.close()
      eventSource = null
    }

    state.isConnected = false
    state.deviceInfo = null
    state.isPlaying = false
    state.config.wasManuallyDisconnected = true

    // Save updated config
    saveConfig()
    broadcastState()
    return true
  } catch (error) {
    console.error('Error disconnecting:', error)
    return true // Always consider disconnect successful for better UX
  }
}

// Set connection key
async function setConnectionKey(key: string) {
  state.config.connectionKey = key

  if (handyApi) {
    handyApi.setConnectionKey(key)
  } else {
    initializeApi()
  }

  saveConfig()
  broadcastState()
}

// Set offset
async function setOffset(offset: number) {
  state.config.offset = offset

  if (handyApi && state.isConnected) {
    await handyApi.setOffset(offset)
  }

  saveConfig()
  broadcastState()
  return true
}

// Set stroke settings
async function setStrokeSettings(min: number, max: number) {
  state.config.stroke = { min, max }

  if (handyApi && state.isConnected) {
    await handyApi.setStrokeSettings({ min, max })
  }

  saveConfig()
  broadcastState()
  return true
}

// Setup script
async function setupScript(scriptUrl: string) {
  if (!handyApi || !state.isConnected) {
    console.warn('Not connected to a device - setupScript')
    return false
  }

  try {
    const success = await handyApi.setupScript(scriptUrl)

    if (!success) {
      state.error = 'Failed to set up script'
      broadcastState()
    }

    return success
  } catch (error) {
    console.error('Handy: Error setting up script:', error)
    state.error = 'Failed to set up script'
    broadcastState()
    return false
  }
}

// Play script
async function play(videoTime: number, playbackRate = 1.0, loop = false) {
  if (!handyApi || !state.isConnected) {
    state.error = 'Not connected to a device'
    broadcastState()
    return false
  }

  try {
    const hspState = await handyApi.play(videoTime, playbackRate, loop)

    if (hspState) {
      state.isPlaying = hspState.play_state === 1
      // Sync immediately
      handyApi.syncVideoTime(videoTime)
      broadcastState()
      return true
    }

    return false
  } catch (error) {
    console.error('Handy: Error playing script:', error)
    state.error = 'Failed to play script'
    broadcastState()
    return false
  }
}

// Stop script
async function stop() {
  if (!handyApi || !state.isConnected) {
    state.error = 'Not connected to a device'
    broadcastState()
    return false
  }

  try {
    const hspState = await handyApi.stop()

    if (hspState) {
      state.isPlaying = hspState.play_state === 1
      broadcastState()
      return true
    }

    return false
  } catch (error) {
    console.error('Handy: Error stopping script:', error)
    state.error = 'Failed to stop script'
    broadcastState()
    return false
  }
}

// Sync video time
async function syncVideoTime(videoTime: number) {
  if (!handyApi || !state.isConnected || !state.isPlaying) {
    return false
  }

  try {
    return await handyApi.syncVideoTime(videoTime)
  } catch (error) {
    console.error('Handy: Error syncing video time:', error)
    // Don't show errors for sync operations
    return false
  }
}

// Broadcast state to all connected contexts
function broadcastState() {
  chrome.runtime
    .sendMessage({
      type: 'handy_state_update',
      state: {
        config: state.config,
        isConnected: state.isConnected,
        deviceInfo: state.deviceInfo,
        isPlaying: state.isPlaying,
        error: state.error,
      },
    })
    .catch((err) => {
      // This error is expected when no listeners are active
      if (!err.message.includes('Could not establish connection')) {
        console.error('Error broadcasting state:', err)
      }
    })
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.type, message)

  const handleAsyncOperation = async () => {
    try {
      switch (message.type) {
        case 'handy_get_state':
          return state

        case 'handy_connect':
          return await connectDevice()

        case 'handy_disconnect':
          return await disconnectDevice()

        case 'handy_set_connection_key':
          await setConnectionKey(message.key)
          return true

        case 'handy_set_offset':
          return await setOffset(message.offset)

        case 'handy_set_stroke_settings':
          return await setStrokeSettings(message.min, message.max)

        case 'handy_setup_script':
          return await setupScript(message.scriptUrl)

        case 'handy_play':
          return await play(
            message.videoTime,
            message.playbackRate,
            message.loop,
          )

        case 'handy_stop':
          return await stop()

        case 'handy_sync_video_time':
          return await syncVideoTime(message.videoTime)

        default:
          return { error: 'Unknown message type' }
      }
    } catch (error) {
      console.error('Error handling message:', error)
      return { error: String(error) }
    }
  }

  // For asynchronous operations, we need to return true from the listener
  // and then call sendResponse when the async operation completes
  handleAsyncOperation().then(sendResponse)
  return true
})

// Track active contexts that need the connection
const activeContexts = {
  popup: false,
  contentScript: false,
}

// Initialize on startup - just load config but don't connect
async function init() {
  await loadConfig()
  // Only initialize API, but don't connect yet
  if (state.config.connectionKey) {
    initializeApi()
  }
}

// New function to check if we need to connect or disconnect
async function updateConnectionState() {
  const needsConnection = activeContexts.popup || activeContexts.contentScript

  if (
    needsConnection &&
    !state.isConnected &&
    state.config.connectionKey &&
    !state.config.wasManuallyDisconnected
  ) {
    console.log('Auto-connecting because a context needs it')
    connectDevice().catch(console.error)
  } else if (!needsConnection && state.isConnected) {
    console.log('Auto-disconnecting because no contexts need it')
    disconnectDevice().catch(console.error)
  }
}

// Listen for context activation/deactivation
chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message.type === 'handy_context_active') {
    console.log(
      `Context ${message.context} is now ${message.active ? 'active' : 'inactive'}`,
    )
    activeContexts[message.context as keyof typeof activeContexts] =
      message.active
    updateConnectionState()
    sendResponse(true)
  }
  return true // Keep listening
})

init().catch(console.error)
