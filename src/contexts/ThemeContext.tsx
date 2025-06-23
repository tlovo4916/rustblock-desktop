import React, { createContext, useContext, useState, useEffect } from 'react';
import { ConfigProvider, theme } from 'antd';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // 从本地存储读取主题设置
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });

  useEffect(() => {
    // 保存主题设置到本地存储
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    
    // 更新文档根元素的主题类
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <ConfigProvider
        theme={{
          algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 6,
            colorBgContainer: isDarkMode ? '#1f1f1f' : '#ffffff',
            colorBgElevated: isDarkMode ? '#262626' : '#ffffff',
            colorBgLayout: isDarkMode ? '#141414' : '#f0f2f5',
            colorText: isDarkMode ? '#e8e8e8' : 'rgba(0, 0, 0, 0.88)',
            colorTextSecondary: isDarkMode ? '#b8b8b8' : 'rgba(0, 0, 0, 0.65)',
            colorTextTertiary: isDarkMode ? '#8c8c8c' : 'rgba(0, 0, 0, 0.45)',
            colorTextQuaternary: isDarkMode ? '#5c5c5c' : 'rgba(0, 0, 0, 0.25)',
            colorBorder: isDarkMode ? '#434343' : '#d9d9d9',
            colorBorderSecondary: isDarkMode ? '#303030' : '#f0f0f0',
            colorFill: isDarkMode ? '#262626' : 'rgba(0, 0, 0, 0.04)',
            colorFillSecondary: isDarkMode ? '#1f1f1f' : 'rgba(0, 0, 0, 0.02)',
            colorFillTertiary: isDarkMode ? '#141414' : 'rgba(0, 0, 0, 0.01)',
            colorBgBase: isDarkMode ? '#141414' : '#ffffff',
            colorBgSpotlight: isDarkMode ? '#262626' : 'rgba(0, 0, 0, 0.85)',
            colorBgMask: isDarkMode ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.45)',
          },
          components: {
            Layout: {
              bodyBg: isDarkMode ? '#141414' : '#f0f2f5',
              headerBg: isDarkMode ? '#141414' : '#ffffff',
              siderBg: isDarkMode ? '#1f1f1f' : '#ffffff',
              lightSiderBg: '#ffffff',
              lightTriggerBg: '#ffffff',
              lightTriggerColor: 'rgba(0, 0, 0, 0.88)',
            },
            Menu: {
              itemBg: isDarkMode ? '#1f1f1f' : '#ffffff',
              itemColor: isDarkMode ? '#e8e8e8' : 'rgba(0, 0, 0, 0.88)',
              itemHoverBg: isDarkMode ? '#262626' : '#f5f5f5',
              itemHoverColor: isDarkMode ? '#ffffff' : '#1890ff',
              itemSelectedBg: isDarkMode ? '#262626' : '#e6f7ff',
              itemSelectedColor: isDarkMode ? '#ffffff' : '#1890ff',
              darkItemBg: '#1f1f1f',
              darkSubMenuItemBg: '#141414',
              darkItemSelectedBg: '#262626',
            },
            Card: {
              colorBgContainer: isDarkMode ? '#1f1f1f' : '#ffffff',
              colorText: isDarkMode ? '#e8e8e8' : 'rgba(0, 0, 0, 0.88)',
            },
            Table: {
              colorBgContainer: isDarkMode ? '#1f1f1f' : '#ffffff',
              headerBg: isDarkMode ? '#262626' : '#fafafa',
              rowHoverBg: isDarkMode ? '#262626' : '#fafafa',
            },
            Modal: {
              contentBg: isDarkMode ? '#1f1f1f' : '#ffffff',
              headerBg: isDarkMode ? '#1f1f1f' : '#ffffff',
            },
            Input: {
              colorBgContainer: isDarkMode ? '#262626' : '#ffffff',
              colorText: isDarkMode ? '#e8e8e8' : 'rgba(0, 0, 0, 0.88)',
              colorTextPlaceholder: isDarkMode ? '#8c8c8c' : 'rgba(0, 0, 0, 0.25)',
            },
            Select: {
              colorBgContainer: isDarkMode ? '#262626' : '#ffffff',
              colorText: isDarkMode ? '#e8e8e8' : 'rgba(0, 0, 0, 0.88)',
              optionSelectedBg: isDarkMode ? '#262626' : '#e6f4ff',
            },
            Button: {
              colorBgContainer: isDarkMode ? '#262626' : '#ffffff',
              colorText: isDarkMode ? '#e8e8e8' : 'rgba(0, 0, 0, 0.88)',
            },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};