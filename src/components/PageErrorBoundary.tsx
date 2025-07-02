import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { Result, Button } from 'antd';
import { useTranslation } from '../contexts/LocaleContext';
import { useTheme } from '../contexts/ThemeContext';

interface PageErrorBoundaryProps {
  children: React.ReactNode;
  pageName: string;
}

const PageErrorBoundary: React.FC<PageErrorBoundaryProps> = ({ children, pageName }) => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();

  const reloadPage = () => {
    window.location.reload();
  };

  const goHome = () => {
    window.location.href = '/';
  };

  return (
    <ErrorBoundary
      fallback={
        <div 
          style={{ 
            padding: '40px',
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isDarkMode ? '#141414' : '#fff',
          }}
        >
          <Result
            status="error"
            title={t('error.pageError')}
            subTitle={t('error.pageErrorDesc').replace('{page}', pageName)}
            extra={[
              <Button type="primary" key="reload" onClick={reloadPage}>
                {t('error.reload')}
              </Button>,
              <Button key="home" onClick={goHome}>
                {t('error.goHome')}
              </Button>,
            ]}
          />
        </div>
      }
      onError={(error, errorInfo) => {
        console.error(`Error in ${pageName} page:`, error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default PageErrorBoundary;