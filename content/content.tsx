import React from 'react'
import ReactDOM from 'react-dom/client'
import { ContentApp } from './ContentApp'
import scripts from '../data/scripts.json'

const root = document.createElement('div')
root.id = 'crx-root'
root.style.zIndex = '2147483640'
root.style.position = 'fixed'
root.style.inset = '0'
root.style.pointerEvents = 'none'
document.body.appendChild(root)

const url = window.location.href
const videoUrl = Object.keys(scripts).find((key) => url.includes(key))
const script = videoUrl ? scripts[videoUrl as keyof typeof scripts] : null

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    {script && <ContentApp script={script} />}
  </React.StrictMode>,
)
