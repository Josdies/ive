import { useState, useEffect, useRef } from 'react'
import { useHandyStore, useHandySetup } from '../../store/useHandyStore'
import { useShallow } from 'zustand/shallow'

// Sample video and script URLs for testing
const DEMO_VIDEO_URL =
  'https://sweettecheu.s3.eu-central-1.amazonaws.com/testsync/sync_video_2021.mp4'
const DEMO_SCRIPT_URL =
  'https://sweettecheu.s3.eu-central-1.amazonaws.com/testsync/sync_video_2021.csv'

export const HandyConnect = () => {
  const {
    config,
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
    setOffset,
    setConnectionKey: storeSetConnectionKey,
  } = useHandyStore(
    useShallow((state) => ({
      config: state.config,
      isConnected: state.isConnected,
      deviceInfo: state.deviceInfo,
      isPlaying: state.isPlaying,
      error: state.error,
      connect: state.connect,
      disconnect: state.disconnect,
      setupScript: state.setupScript,
      play: state.play,
      stop: state.stop,
      syncVideoTime: state.syncVideoTime,
      setOffset: state.setOffset,
      setConnectionKey: state.setConnectionKey,
    })),
  )

  // Initialize Handy API
  useHandySetup()

  const [connectionKey, setConnectionKey] = useState('')
  const [showVideoPlayer, setShowVideoPlayer] = useState(false)
  const [currentOffset, setCurrentOffset] = useState(0)

  // Video player ref
  const videoRef = useRef<HTMLVideoElement>(null)

  // Sync interval for periodic sync
  const syncIntervalRef = useRef<number | null>(null)

  // Load connection key from store
  useEffect(() => {
    if (config.connectionKey) {
      setConnectionKey(config.connectionKey)
    }
  }, [config.connectionKey])

  // Load offset from store
  useEffect(() => {
    setCurrentOffset(config.offset)
  }, [config.offset])

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current !== null) {
        window.clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
    }
  }, [])

  // When connected status changes, handle script setup with delay
  useEffect(() => {
    let setupTimer: number | null = null

    if (isConnected) {
      // Show video player when connected
      setShowVideoPlayer(true)

      // Give a slight delay to ensure connection is established
      setupTimer = window.setTimeout(() => {
        setupScript(DEMO_SCRIPT_URL).then((success) => {
          if (!success) {
            console.warn('Script setup failed, trying again in 1s...')
            // Try again after a second if failed
            window.setTimeout(() => {
              setupScript(DEMO_SCRIPT_URL)
            }, 1000)
          }
        })
      }, 1000)
    } else {
      setShowVideoPlayer(false)
    }

    return () => {
      if (setupTimer !== null) {
        window.clearTimeout(setupTimer)
      }
    }
  }, [isConnected, setupScript])

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
        setShowVideoPlayer(false)
        return
      }

      // Connect - success is handled by store effects
      await connect()
    } catch (err) {
      console.error('Error during connect/disconnect:', err)
    }
  }

  // Handle video play
  const handleVideoPlay = () => {
    try {
      if (videoRef.current && isConnected) {
        // Start playback
        play(videoRef.current.currentTime, videoRef.current.playbackRate)

        // Set up periodic sync
        if (syncIntervalRef.current !== null) {
          window.clearInterval(syncIntervalRef.current)
        }

        // Use window.setInterval for numeric ID and proper cleanup
        syncIntervalRef.current = window.setInterval(() => {
          if (videoRef.current && isConnected && !videoRef.current.paused) {
            syncVideoTime(videoRef.current.currentTime)
          } else if (syncIntervalRef.current !== null) {
            window.clearInterval(syncIntervalRef.current)
            syncIntervalRef.current = null
          }
        }, 5000) // Sync every 5 seconds
      }
    } catch (err) {
      console.error('Error during video play:', err)
    }
  }

  // Handle video pause
  const handleVideoPause = () => {
    try {
      if (isConnected) {
        stop()

        // Clear sync interval
        if (syncIntervalRef.current !== null) {
          window.clearInterval(syncIntervalRef.current)
          syncIntervalRef.current = null
        }
      }
    } catch (err) {
      console.error('Error during video pause:', err)
    }
  }

  // Handle video seeking
  const handleVideoSeeking = () => {
    try {
      if (isConnected) {
        stop() // Stop first when seeking to prevent unexpected behavior

        // Clear sync interval
        if (syncIntervalRef.current !== null) {
          window.clearInterval(syncIntervalRef.current)
          syncIntervalRef.current = null
        }
      }
    } catch (err) {
      console.error('Error during video seeking:', err)
    }
  }

  // Handle seeking end
  const handleSeekEnd = () => {
    try {
      if (videoRef.current && isConnected && !videoRef.current.paused) {
        play(videoRef.current.currentTime, videoRef.current.playbackRate) // Resume playback with new position
      }
    } catch (err) {
      console.error('Error after seek end:', err)
    }
  }

  // Handle playback rate change
  const handleRateChange = () => {
    try {
      if (videoRef.current && isConnected && !videoRef.current.paused) {
        // We need to stop and restart with new playback rate
        stop().then(() => {
          if (videoRef.current) {
            play(videoRef.current.currentTime, videoRef.current.playbackRate)
          }
        })
      }
    } catch (err) {
      console.error('Error during playback rate change:', err)
    }
  }

  // Handle offset change
  const handleOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const newOffset = parseInt(e.target.value)
      setCurrentOffset(newOffset)
      setOffset(newOffset)
    } catch (err) {
      console.error('Error changing offset:', err)
    }
  }

  return (
    <div className='handy-connect'>
      <h2>Connect to Handy</h2>
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

      <div style={{ marginBottom: '20px' }}>
        <input
          type='text'
          className='input'
          placeholder='Connection Key'
          value={connectionKey}
          onChange={(e) => {
            setConnectionKey(e.target.value)
          }}
          disabled={isConnected}
          style={{ marginBottom: '10px' }}
        />

        <button
          className={`button primary ${isConnected ? 'active' : ''}`}
          onClick={handleConnect}
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </button>
      </div>

      {isConnected && deviceInfo && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px',
            backgroundColor: 'rgba(0,255,0,0.05)',
            borderRadius: '8px',
            border: '1px solid rgba(0,255,0,0.2)',
          }}
        >
          <h3>Device Connected</h3>
          <p>
            <strong>Firmware:</strong> {deviceInfo.fw_version || 'Unknown'}
          </p>
          <p>
            <strong>Model:</strong> {deviceInfo.hw_model_name || 'Unknown'}
          </p>
          <p>
            <strong>Status:</strong> {isPlaying ? 'Playing' : 'Stopped'}
          </p>
        </div>
      )}

      {showVideoPlayer && (
        <div style={{ marginTop: '20px' }}>
          <h3>Test Player</h3>

          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor='offset'
              style={{ display: 'block', marginBottom: '5px' }}
            >
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
          </div>

          <video
            ref={videoRef}
            width='100%'
            controls
            onPlay={handleVideoPlay}
            onPause={handleVideoPause}
            onSeeking={handleVideoSeeking}
            onSeeked={handleSeekEnd}
            onRateChange={handleRateChange}
            style={{ maxWidth: '100%', borderRadius: '8px' }}
          >
            <source src={DEMO_VIDEO_URL} type='video/mp4' />
            Your browser does not support the video tag.
          </video>

          <div
            style={{
              marginTop: '10px',
              fontSize: '0.9em',
              color: 'rgba(0,0,0,0.6)',
            }}
          >
            <p>
              This demo uses the built-in sample video and script. Play, pause,
              and seek to test synchronization.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
