import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/authContext.tsx'
import { ConfirmProvider } from './components/ModalDelete/ConfirmProvider.tsx'
import { RepositoriesProvider } from './repositories/repositoriesContext.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:  0,
      retry:      1,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    },
    mutations: {
      retry: 0,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfirmProvider>
        <AuthProvider>
          <RepositoriesProvider>
            <QueryClientProvider client={queryClient}>
              <App />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#1f2937',
                    color: '#fff',
                    border: '1px solid #374151',
                  },
                }}
              />
            </QueryClientProvider>
          </RepositoriesProvider>
        </AuthProvider>
    </ConfirmProvider>
  </StrictMode>
)
