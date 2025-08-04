
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);

// Use a Babel transform for JSX - this is how it works in a browser-based setup
const renderedApp = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// This is a workaround because the environment uses Babel standalone
// and expects JSX to be transpiled, but we are in a TSX file.
// We'll trust that the `script` tag with type `text/babel` in index.html will handle this.
// For a real build process, this would be handled by a bundler like Webpack or Vite.
root.render(renderedApp);
