import { applyMotionTokens } from './utils/motion.js';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './motion.css';
import './theme.css';
import App from './App.jsx';
applyMotionTokens(document.documentElement);
createRoot(document.getElementById('root')).render(<StrictMode>
    <App />
  </StrictMode>);
