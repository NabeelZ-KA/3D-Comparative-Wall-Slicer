import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import StandaloneApp from './StandaloneApp.tsx';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StandaloneApp />
  </StrictMode>,
);
