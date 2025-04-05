import React from 'react'
import ReactDOM from 'react-dom/client'
import { ContentApp } from './components/ContentApp'

const root = document.createElement('div')
root.id = 'crx-root'
root.style.zIndex = '999999'
root.style.position = 'fixed'
root.style.inset = '0'
root.style.pointerEvents = 'none'
document.body.appendChild(root)

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ContentApp />
  </React.StrictMode>,
)
