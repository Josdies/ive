import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PopupApp } from './PopupApp'
import { createTheme, MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import '@/styles/global.scss'

const theme = createTheme({})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <PopupApp />
    </MantineProvider>
  </StrictMode>,
)
