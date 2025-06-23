import React from 'react';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';

const CustomSwitch: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <div 
      onClick={toggleTheme}
      style={{
        width: 44,
        height: 22,
        borderRadius: 11,
        backgroundColor: isDarkMode ? '#177ddc' : 'rgba(0, 0, 0, 0.25)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'none',
        padding: 2,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          position: 'absolute',
          left: isDarkMode ? 22 : 2,
          transition: 'left 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
        }}
      >
        {isDarkMode ? (
          <MoonOutlined style={{ fontSize: 10, color: '#177ddc' }} />
        ) : (
          <SunOutlined style={{ fontSize: 10, color: '#faad14' }} />
        )}
      </div>
    </div>
  );
};

export default CustomSwitch;