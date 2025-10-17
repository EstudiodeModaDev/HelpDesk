import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/authContext.tsx'
import { ConfirmProvider } from './components/ModalDelete/ConfirmProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfirmProvider>
      <AuthProvider>
          <App />
      </AuthProvider>
    </ConfirmProvider>
  </StrictMode>
)
