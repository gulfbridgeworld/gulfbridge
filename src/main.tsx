import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const swUrl = new URL('./sw.js', window.location.href)

  void navigator.serviceWorker.register(swUrl.href).catch((error: unknown) => {
    console.error('GulfBridge offline support could not be enabled:', error)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
