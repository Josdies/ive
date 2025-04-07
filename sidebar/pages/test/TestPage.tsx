import { useRef, useEffect, useState } from 'react'
import { useHandyStore } from '../../store/useHandyStore'
import { useShallow } from 'zustand/shallow'
import { DeviceInfo } from '../../components/deviceInfo/DeviceInfo'

// Sample video and script URLs for testing
const DEMO_VIDEO_URL =
  'https://sweettecheu.s3.eu-central-1.amazonaws.com/testsync/sync_video_2021.mp4'
const DEMO_SCRIPT_URL =
  'https://sweettecheu.s3.eu-central-1.amazonaws.com/testsync/sync_video_2021.csv'

export const TestPage = () => {
  const { isConnected, setupScript, play, stop, syncVideoTime } = useHandyStore(
    useShallow((state) => ({
      isConnected: state.isConnected,
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

  // Track script setup status
  const [isScriptSetup, setIsScriptSetup] = useState(false)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [setupStatus, setSetupStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')

  // Video state tracking
  const shouldPlayAfterSetupRef = useRef(false)
  const videoPositionRef = useRef(0)
  const videoRateRef = useRef(1)

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current !== null) {
        window.clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
    }
  }, [])

  // Initial script setup when connected
  useEffect(() => {
    if (isConnected && !isScriptSetup && !isSettingUp) {
      setIsSettingUp(true)
      setSetupStatus('loading')

      const setupWithRetry = async () => {
        try {
          const success = await setupScript(DEMO_SCRIPT_URL)

          if (success) {
            setIsScriptSetup(true)
            setSetupStatus('success')

            // If video was playing, resume device playback
            if (shouldPlayAfterSetupRef.current && videoRef.current) {
              play(videoRef.current.currentTime, videoRef.current.playbackRate)
              setupSyncInterval()
            }
          } else {
            // Try once more after a short delay
            setTimeout(async () => {
              try {
                const retrySuccess = await setupScript(DEMO_SCRIPT_URL)
                setIsScriptSetup(retrySuccess)
                setSetupStatus(retrySuccess ? 'success' : 'error')

                if (
                  retrySuccess &&
                  shouldPlayAfterSetupRef.current &&
                  videoRef.current
                ) {
                  play(
                    videoRef.current.currentTime,
                    videoRef.current.playbackRate,
                  )
                  setupSyncInterval()
                }
              } catch {
                setSetupStatus('error')
              } finally {
                setIsSettingUp(false)
              }
            }, 1000)
            return
          }
        } catch {
          setSetupStatus('error')
        } finally {
          setIsSettingUp(false)
        }
      }

      setupWithRetry()
    }

    // Reset setup status when disconnected
    if (!isConnected) {
      setIsScriptSetup(false)
      setSetupStatus('idle')
      shouldPlayAfterSetupRef.current = false
    }
  }, [isConnected, isScriptSetup, isSettingUp, setupScript, play])

  // Setup sync interval
  const setupSyncInterval = () => {
    if (syncIntervalRef.current !== null) {
      window.clearInterval(syncIntervalRef.current)
    }

    syncIntervalRef.current = window.setInterval(() => {
      if (videoRef.current && isConnected && !videoRef.current.paused) {
        syncVideoTime(videoRef.current.currentTime)
      } else if (syncIntervalRef.current !== null) {
        window.clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
    }, 5000) // Sync every 5 seconds
  }

  // Handle video play
  const handleVideoPlay = () => {
    if (!videoRef.current || !isConnected) return

    // Update tracking refs
    shouldPlayAfterSetupRef.current = true
    videoPositionRef.current = videoRef.current.currentTime
    videoRateRef.current = videoRef.current.playbackRate

    // If script is already set up, start playback immediately
    if (isScriptSetup) {
      play(videoRef.current.currentTime, videoRef.current.playbackRate)
      setupSyncInterval()
    } else {
      // Script setup is in progress - video will continue playing
      // We'll sync with device once setup completes (via useEffect)
      console.log(
        'Video playing but script not ready yet - will sync when ready',
      )

      // If we're not currently setting up, trigger setup
      if (!isSettingUp && setupStatus !== 'loading') {
        setIsSettingUp(true)
        setSetupStatus('loading')

        setupScript(DEMO_SCRIPT_URL)
          .then((success) => {
            setIsScriptSetup(success)
            setSetupStatus(success ? 'success' : 'error')
            setIsSettingUp(false)

            if (
              success &&
              shouldPlayAfterSetupRef.current &&
              videoRef.current &&
              !videoRef.current.paused
            ) {
              play(videoRef.current.currentTime, videoRef.current.playbackRate)
              setupSyncInterval()
            }
          })
          .catch(() => {
            setSetupStatus('error')
            setIsSettingUp(false)
          })
      }
    }
  }

  // Handle video pause
  const handleVideoPause = () => {
    shouldPlayAfterSetupRef.current = false

    if (isConnected) {
      stop()

      // Clear sync interval
      if (syncIntervalRef.current !== null) {
        window.clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
    }
  }

  // Handle video seeking
  const handleVideoSeeking = () => {
    if (isConnected) {
      stop() // Stop first when seeking to prevent unexpected behavior

      // Clear sync interval
      if (syncIntervalRef.current !== null) {
        window.clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
    }
  }

  // Handle seeking end
  const handleSeekEnd = () => {
    if (videoRef.current && isConnected && !videoRef.current.paused) {
      videoPositionRef.current = videoRef.current.currentTime

      if (isScriptSetup) {
        play(videoRef.current.currentTime, videoRef.current.playbackRate) // Resume playback with new position
        setupSyncInterval()
      } else {
        // Will be handled when script setup completes
        shouldPlayAfterSetupRef.current = true
      }
    }
  }

  // Handle playback rate change
  const handleRateChange = () => {
    if (!videoRef.current) return

    videoRateRef.current = videoRef.current.playbackRate

    if (isConnected && !videoRef.current.paused && isScriptSetup) {
      // We need to stop and restart with new playback rate
      stop().then(() => {
        if (videoRef.current && !videoRef.current.paused) {
          play(videoRef.current.currentTime, videoRef.current.playbackRate)
          setupSyncInterval()
        }
      })
    }
  }

  // Get status indicator styles
  const getStatusIndicator = () => {
    if (!isConnected) return null

    if (setupStatus === 'loading') {
      return (
        <div
          style={{
            padding: '10px',
            marginBottom: '10px',
            backgroundColor: 'rgba(255, 165, 0, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 165, 0, 0.4)',
            fontSize: '0.85rem',
          }}
        >
          Setting up synchronization...
        </div>
      )
    }

    if (setupStatus === 'error') {
      return (
        <div
          style={{
            padding: '10px',
            marginBottom: '10px',
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 0, 0, 0.4)',
            fontSize: '0.85rem',
          }}
        >
          Synchronization error. Video will play but device won't sync. Try
          reconnecting your device.
        </div>
      )
    }

    if (setupStatus === 'success') {
      return (
        <div
          style={{
            padding: '10px',
            marginBottom: '10px',
            backgroundColor: 'rgba(0, 255, 0, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(0, 255, 0, 0.4)',
            fontSize: '0.85rem',
          }}
        >
          Synchronization ready
        </div>
      )
    }

    return null
  }

  return (
    <section className='page'>
      <h1 className='header2'>Test Player</h1>
      <DeviceInfo />
      {isConnected && (
        <div style={{ marginTop: '16px' }}>
          {getStatusIndicator()}

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
      )}
    </section>
  )
}
