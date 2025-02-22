import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import './polyfills';

// Create root element error handler
const getRootElement = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Failed to find the root element. Make sure there is a <div id="root"></div> in your index.html');
  }
  return rootElement;
};

// Error display component
const displayError = (error) => {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgb(17, 17, 17);
    color: rgb(229, 231, 235);
    padding: 20px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    white-space: pre-wrap;
    z-index: 9999;
    overflow: auto;
  `;
  errorDiv.innerHTML = `
    <h2 style="color: rgb(239, 68, 68); font-size: 1.5rem; margin-bottom: 1rem;">Runtime Error:</h2>
    <pre style="background: rgb(31, 31, 31); padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; overflow: auto;">
      ${error.stack || error.message}
    </pre>
    <button onclick="location.reload()" style="
      margin-top: 1rem;
      padding: 0.75rem 1.5rem;
      background: rgb(234, 88, 12);
      color: white;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      font-family: inherit;
      transition: background-color 0.2s;
    " onmouseover="this.style.backgroundColor='rgb(249, 115, 22)'"
      onmouseout="this.style.backgroundColor='rgb(234, 88, 12)'">
      Reload Application
    </button>
  `;
  document.body.appendChild(errorDiv);
};

// Error handlers
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  displayError(event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  displayError(event.reason);
});

// Initialize React
try {
  const root = createRoot(getRootElement());
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to initialize React:', error);
  displayError(error);
}