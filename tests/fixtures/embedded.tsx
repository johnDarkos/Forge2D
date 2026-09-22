import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { EmbeddedHost } from './EmbeddedHost'
import './host.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EmbeddedHost />
  </StrictMode>,
)
