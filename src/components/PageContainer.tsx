import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface PageContainerProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const PageContainer: React.FC<PageContainerProps> = ({ children, style }) => {
  const { isDarkMode } = useTheme();
  
  return (
    <div
      className={isDarkMode ? 'dark-page-container' : 'light-page-container'}
      style={{
        padding: 24,
        minHeight: 'calc(100vh - 64px)',
        backgroundColor: isDarkMode ? '#141414' : '#ffffff',
        color: isDarkMode ? '#e8e8e8' : '#141414',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default PageContainer;