import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// iOS standalone detection — more reliable than @media (display-mode: standalone)
if ((window.navigator as unknown as { standalone?: boolean }).standalone === true) {
  document.documentElement.classList.add('standalone')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
