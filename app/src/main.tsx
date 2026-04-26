import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { I18nProvider } from './lib/i18n'

const savedLang = localStorage.getItem('oryzae-lang') as 'zh' | 'en' | null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider initialLang={savedLang || 'zh'}>
        <App />
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
)
