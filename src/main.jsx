import { createRoot } from 'react-dom/client'
import { PublicPageConfig } from './context/PublicPageConfig'
import { loadConfig } from './lib/configIO'
import App from './App.jsx'
import './index.css'

const config = loadConfig()

createRoot(document.getElementById('root')).render(
  <PublicPageConfig initialConfig={config}>
    <App />
  </PublicPageConfig>
)
