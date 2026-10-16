import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { offlineSyncService } from './services/offlineSyncService';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Register Service Worker for PWA offline capabilities
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => console.log('SyllabIQ PWA Service Worker Registered'))
      .catch((err) => console.log('SW registration notice:', err));
  });
}

// Initialize automatic offline sync-on-reconnect
offlineSyncService.initAutoSync((res) => {
  if (res.synced > 0) {
    queryClient.invalidateQueries({ queryKey: ['trainee-enrollments'] });
    queryClient.invalidateQueries({ queryKey: ['trainee-dashboard-stats'] });
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);

