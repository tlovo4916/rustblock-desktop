import React from 'react';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';

const CustomSwitch: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <div 
      onClick={toggleTheme}
      style={{
        width: 36,
        height: 18,
        borderRadius: 9,
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        padding: 1,
        display: 'flex',
        alignItems: 'center',
        border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'transparent'}`,
        boxShadow: isDarkMode ? '0 0 6px rgba(255, 255, 255, 0.1)' : 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)';
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          backgroundColor: isDarkMode ? '#f0f0f0' : '#ffffff',
          position: 'absolute',
          left: isDarkMode ? 19 : 2,
          transition: 'left 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isDarkMode ? '0 1px 3px rgba(0, 0, 0, 0.3)' : '0 1px 2px rgba(0, 0, 0, 0.1)',
        }}
      >
        {isDarkMode ? (
          <MoonOutlined style={{ fontSize: 9, color: '#1890ff' }} />
        ) : (
          <SunOutlined style={{ fontSize: 9, color: '#fa8c16' }} />
        )}
      </div>
    </div>
  );
};

export default CustomSwitch;