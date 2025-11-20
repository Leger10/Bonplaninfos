import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import './i18n.js'; // Ensure i18n is initialized before the app renders
import '@/index.css';

// Register the service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);