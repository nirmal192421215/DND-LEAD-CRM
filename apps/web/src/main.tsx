import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register PWA Service Worker
if ('serviceWorker' in navigator && !window.location.host.includes('localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('DND CRM Service Worker registered:', reg.scope))
      .catch((err) => console.log('Service Worker registration skipped:', err));
  });
}
