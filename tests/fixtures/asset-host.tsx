import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AssetHost } from './AssetHost'
import './host.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AssetHost />
  </StrictMode>,
)
