import { useEffect, useState, useRef, useCallback } from 'react'
import { useShallow } from 'zustand/shallow'
import { useHandySetup, useHandyStore } from '@/store/useHandyStore'
import styles from './ContentApp.module.scss'

export const ContentApp = ({ script }: { script: string }) => {
  const { isConnected, isPlaying, setupScript, play, stop, syncVideoTime } =
    useHandyStore(
      useShallow((state) => ({
        isConnected: state.isConnected,
        isPlaying: state.isPlaying,
        setupScript: state.setupScript,
        syncVideoTime: state.syncVideoTime,
        play: state.play,
        stop: state.stop,
      })),
    )

  useHandySetup()

  // Local state
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  )
  const [isScriptSetup, setIsScriptSetup] = useState(false)
  const [videoWasPlaying, setVideoWasPlaying] = useState(false)

  const syncIntervalId = useRef<number | null>(null)

  // Find video element
  useEffect(() => {
    if (script && !videoElement) {
      const findLargestVideo = () => {
        const videos = Array.from(document.getElementsByTagName('video'))
        if (videos.length === 0) return null

        // Filter significant videos
        const significantVideos = videos.filter(
          (v) => v.offsetWidth > 100 && v.offsetHeight > 100,
        )

        if (significantVideos.length === 0) return null

        // First try to find playing video
        const playingVideo = significantVideos.find((v) => !v.paused)
        if (playingVideo) {
          setVideoWasPlaying(true)
          return playingVideo
        }

        // Otherwise find largest
        return significantVideos.reduce((largest, current) => {
          const largestArea = largest.offsetWidth * largest.offsetHeight
          const currentArea = current.offsetWidth * current.offsetHeight
          return currentArea > largestArea ? current : largest
        })
      }

      // Check for video element
      const videoCheckInterval = setInterval(() => {
        const found = findLargestVideo()
        if (found) {
          clearInterval(videoCheckInterval)
          setVideoElement(found)
          console.log(
            'Found video:',
            found.offsetWidth,
            found.offsetHeight,
            'playing:',
            !found.paused,
          )
        }
      }, 500)

      return () => clearInterval(videoCheckInterval)
    }
  }, [script, videoElement])

  // Setup script
  useEffect(() => {
    if (videoElement && isConnected && script && !isScriptSetup) {
      console.log('Setting up script:', script)

      // If video is playing, pause it temporarily to prevent sync issues
      const isCurrentlyPlaying = !videoElement.paused
      if (isCurrentlyPlaying) {
        console.log('Pausing video temporarily for setup')
        videoElement.pause()
      }

      setupScript(script)
        .then((success) => {
          setIsScriptSetup(success)
          console.log('Script setup:', success)

          if (success) {
            // Resume video if it was playing
            if (isCurrentlyPlaying || videoWasPlaying) {
              console.log('Resuming video after setup')
              videoElement
                .play()
                .then(() => {
                  // Video play will trigger handler
                })
                .catch((e) => {
                  console.error('Error auto-playing video:', e)
                })
            }
          }
        })
        .catch((e) => {
          console.error('Error setting up script:', e)
        })
    }
  }, [
    videoElement,
    isConnected,
    script,
    isScriptSetup,
    videoWasPlaying,
    setupScript,
  ])

  // Start device playback
  const startDevicePlayback = useCallback(async () => {
    if (!videoElement || !isConnected || !isScriptSetup) return

    console.log(
      'Starting device playback:',
      videoElement.currentTime,
      videoElement.playbackRate,
    )

    try {
      // Start playback using the store action
      const success = await play(
        videoElement.currentTime,
        videoElement.playbackRate,
      )
      console.log('Device playback started:', success)

      if (success) {
        // Set up sync interval
        if (syncIntervalId.current) {
          window.clearInterval(syncIntervalId.current)
        }

        syncIntervalId.current = window.setInterval(() => {
          if (videoElement && !videoElement.paused && isConnected) {
            syncVideoTime(videoElement.currentTime).catch((error) => {
              console.error('Sync error:', error)
            })
          }
        }, 5000)
      }
    } catch (error) {
      console.error('Error starting playback:', error)
    }
  }, [isConnected, isScriptSetup, play, syncVideoTime, videoElement])

  // Stop device playback
  const stopDevicePlayback = useCallback(async () => {
    if (!isConnected) return

    console.log('Stopping device playback')

    try {
      await stop()

      // Clear sync interval
      if (syncIntervalId.current) {
        window.clearInterval(syncIntervalId.current)
        syncIntervalId.current = null
      }
    } catch (error) {
      console.error('Error stopping playback:', error)
    }
  }, [isConnected, stop])

  // Video event handlers
  useEffect(() => {
    if (!videoElement || !isConnected || !isScriptSetup) return

    console.log('Setting up video event listeners')

    const handlePlay = () => {
      console.log('Video play event at', videoElement.currentTime)
      startDevicePlayback()
    }

    const handlePause = () => {
      console.log('Video pause event')
      stopDevicePlayback()
    }

    const handleSeeking = () => {
      console.log('Video seeking event')
      stopDevicePlayback()
    }

    const handleSeeked = () => {
      console.log('Video seeked event to', videoElement.currentTime)
      if (!videoElement.paused) {
        startDevicePlayback()
      }
    }

    const handleRateChange = () => {
      console.log('Video rate change event to', videoElement.playbackRate)
      if (!videoElement.paused) {
        startDevicePlayback()
      }
    }

    const handleEnded = () => {
      console.log('Video ended event')
      stopDevicePlayback()
    }

    // Add event listeners
    videoElement.addEventListener('play', handlePlay)
    videoElement.addEventListener('pause', handlePause)
    videoElement.addEventListener('seeking', handleSeeking)
    videoElement.addEventListener('seeked', handleSeeked)
    videoElement.addEventListener('ratechange', handleRateChange)
    videoElement.addEventListener('ended', handleEnded)

    // If video is already playing, trigger sync
    if (!videoElement.paused) {
      console.log('Video already playing, starting device immediately')
      setTimeout(() => {
        startDevicePlayback()
      }, 500)
    }

    // Cleanup
    return () => {
      videoElement.removeEventListener('play', handlePlay)
      videoElement.removeEventListener('pause', handlePause)
      videoElement.removeEventListener('seeking', handleSeeking)
      videoElement.removeEventListener('seeked', handleSeeked)
      videoElement.removeEventListener('ratechange', handleRateChange)
      videoElement.removeEventListener('ended', handleEnded)
    }
  }, [
    videoElement,
    isConnected,
    isScriptSetup,
    startDevicePlayback,
    stopDevicePlayback,
  ])

  // Page unload handler
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isConnected) {
        stop().catch(console.error)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isConnected, stop])

  // Force sync
  const handleForceSyncClick = () => {
    if (!videoElement || !isConnected || !isScriptSetup) return

    if (videoElement.paused) {
      videoElement.play().catch(console.error)
    } else {
      startDevicePlayback()
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncIntervalId.current) {
        window.clearInterval(syncIntervalId.current)
      }
    }
  }, [])

  // Only render if we have a pending script
  if (!script) {
    return null
  }

  return (
    <div className={styles.contentApp}>
      {/* Simple clickable indicator */}
      <div
        className={`${styles.syncIndicator} ${
          !isConnected
            ? styles.disconnected
            : isPlaying
              ? styles.playing
              : styles.connected
        }`}
        onClick={handleForceSyncClick}
      >
        <div className={styles.statusDot}></div>
        {!isConnected
          ? 'Disconnected'
          : !isScriptSetup
            ? 'Setting up...'
            : isPlaying
              ? 'Syncing'
              : 'Click to sync'}
      </div>
    </div>
  )
}
