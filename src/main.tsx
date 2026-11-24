import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register WaliPintar PWA Service Worker (/service-worker.js)
// Tidak menghapus data login/localStorage saat update sehingga user langsung pakai versi terbaru.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    let isRefreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (isRefreshing) return;
      isRefreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register('/service-worker.js', { updateViaCache: 'none' })
      .then((registration) => {
        registration.update().catch(() => {});
      })
      .catch((err) => {
        console.warn('ServiceWorker registration failed:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
