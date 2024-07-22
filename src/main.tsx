import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import 'react-tooltip/dist/react-tooltip.css'
// @ts-ignore
//import * as serviceWorkerRegistration from './serviceWorkerRegistration'; 

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
//serviceWorkerRegistration.register();
