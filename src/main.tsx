import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ConfigProvider locale={zhCN}>
        <App />
      </ConfigProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
