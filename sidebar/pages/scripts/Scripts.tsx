import styles from './ScriptsPage.module.scss'
import VideosJson from '../../../data/videos.json'

type Video = {
  id: string
  name: string
  thumbnail_url: string
  stream_url: string
  script_url: string
}

type VideosData = {
  videos: Video[]
}

export const ScriptsPage = () => {
  const openUrl = (url: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.update(tabs[0].id ?? 0, { url: url })
    })
  }

  return (
    <section className='page'>
      <h1 className='header2'>Scripts</h1>

      <div className={styles.videoList}>
        {(VideosJson as VideosData).videos.map((video) => (
          <div
            key={video.id}
            className={styles.videoItem}
            onClick={() => openUrl(video.stream_url)}
          >
            <div className={styles.thumbnailContainer}>
              <img
                src={video.thumbnail_url}
                alt={video.name}
                className={styles.thumbnail}
              />
              <div className={styles.videoTitle}>
                <h3>{video.name}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
