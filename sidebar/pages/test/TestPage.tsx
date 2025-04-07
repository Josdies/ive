import { useRef, useEffect } from 'react'
import { useHandyStore } from '../../store/useHandyStore'
import { useShallow } from 'zustand/shallow'
import { DeviceInfo } from '../../components/deviceInfo/DeviceInfo'

// Sample video and script URLs for testing
const DEMO_VIDEO_URL =
  'https://sweettecheu.s3.eu-central-1.amazonaws.com/testsync/sync_video_2021.mp4'
const DEMO_SCRIPT_URL =
  'https://sweettecheu.s3.eu-central-1.amazonaws.com/testsync/sync_video_2021.csv'

export const TestPage = () => {
  const { isConnected, error, setupScript, play, stop, syncVideoTime } =
    useHandyStore(
      useShallow((state) => ({
        isConnected: state.isConnected,
        error: state.error,
        setupScript: state.setupScript,
        play: state.play,
        stop: state.stop,
        syncVideoTime: state.syncVideoTime,
      })),
    )

  // Video player ref
  const videoRef = useRef<HTMLVideoElement>(null)

  // Sync interval for periodic sync
  const syncIntervalRef = useRef<number | null>(null)

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
    }

    return () => {
      if (setupTimer !== null) {
        window.clearTimeout(setupTimer)
      }
    }
  }, [isConnected, setupScript])

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

  return (
    <section className='page'>
      <h1 className='header2'>Test Player</h1>
      <DeviceInfo />
      {isConnected ? (
        <div style={{ marginTop: '16px' }}>
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
            }}
          >
            <p>
              This demo uses the built-in sample video and script. Play, pause,
              and seek to test synchronization.
            </p>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '16px',
            backgroundColor: 'rgba(255,0,0,0.05)',
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          <p>Please connect your device first on the Connect page.</p>
          {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        </div>
      )}
    </section>
  )
}
