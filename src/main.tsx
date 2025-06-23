import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import zhCN from 'antd/locale/zh_CN';
import { ConfigProvider } from 'antd';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <ConfigProvider locale={zhCN}>
          <App />
        </ConfigProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
