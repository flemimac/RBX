import React from 'react'
import ReactDOM from 'react-dom/client'
import { App, ErrorBoundary } from './components'
import './assets/styles/index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Корневой элемент не найден')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

