import { createRoot } from 'react-dom/client'
import { PublicPageConfig } from './context/PublicPageConfig'
import { loadPublicConfig } from './lib/configIO'
import App from './App.jsx'
import './index.css'

const developmentPreviewPlatform = import.meta.env.DEV
  && import.meta.env.VITE_PAGE_PREVIEW_TENANT_ID
  && import.meta.env.VITE_PAGE_PREVIEW_TENANT_SLUG
  && import.meta.env.VITE_PAGE_PREVIEW_PUBLIC_URL
  && import.meta.env.VITE_PAGE_PREVIEW_CONTROL_PLANE_ORIGIN
  ? {
      configAuthority: 'control_plane',
      tenantId: import.meta.env.VITE_PAGE_PREVIEW_TENANT_ID,
      tenantSlug: import.meta.env.VITE_PAGE_PREVIEW_TENANT_SLUG,
      publicUrl: import.meta.env.VITE_PAGE_PREVIEW_PUBLIC_URL,
      controlPlaneOrigin: import.meta.env.VITE_PAGE_PREVIEW_CONTROL_PLANE_ORIGIN,
      publicApiBaseUrl: import.meta.env.VITE_PAGE_PREVIEW_CONTROL_PLANE_ORIGIN,
      useRuntimeConfig: true,
    }
  : null

const config = loadPublicConfig(developmentPreviewPlatform)

createRoot(document.getElementById('root')).render(
  <PublicPageConfig initialConfig={config}>
    <App />
  </PublicPageConfig>
)
