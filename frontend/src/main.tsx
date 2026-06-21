import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global Fetch Interceptor to inject JWT token automatically
const originalFetch = window.fetch;
window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
  const token = localStorage.getItem('token');
  if (token) {
    init = { ...init };
    if (init.headers instanceof Headers) {
      const newHeaders = new Headers(init.headers);
      if (!newHeaders.has('Authorization')) {
        newHeaders.set('Authorization', `Bearer ${token}`);
      }
      init.headers = newHeaders;
    } else if (Array.isArray(init.headers)) {
      const newHeaders = [...init.headers];
      const hasAuth = newHeaders.some(([key]) => key.toLowerCase() === 'authorization');
      if (!hasAuth) {
        newHeaders.push(['Authorization', `Bearer ${token}`]);
      }
      init.headers = newHeaders;
    } else {
      const newHeaders = { ...init.headers } as Record<string, string>;
      if (!newHeaders['Authorization'] && !newHeaders['authorization']) {
        newHeaders['Authorization'] = `Bearer ${token}`;
      }
      init.headers = newHeaders;
    }
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
