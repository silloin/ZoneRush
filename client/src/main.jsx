import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './i18n'
import { BrowserRouter } from 'react-router-dom'

const originalError = console.error;
console.error = (...args) => {
  // Suppress known non-critical errors
  if (args[0]?.includes?.('menu item')) return;
  if (args[0]?.includes?.('Invalid namespace')) return;
  if (args[0]?.includes?.('Watch error')) return; // GPS timeout warnings
  if (typeof args[0] === 'string' && args[0].includes('GeolocationPositionError')) return;
  originalError(...args);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
