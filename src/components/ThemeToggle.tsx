import React from 'react';
import { Space } from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';
import CustomSwitch from './CustomSwitch';

const ThemeToggle: React.FC = () => {
  const { isDarkMode } = useTheme();

  return (
    <div 
      style={{ 
        marginRight: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <SunOutlined style={{ 
        fontSize: 16, 
        color: isDarkMode ? 'rgba(255, 255, 255, 0.45)' : '#faad14',
        transition: 'all 0.3s ease',
        opacity: isDarkMode ? 0.5 : 1,
      }} />
      <CustomSwitch />
      <MoonOutlined style={{ 
        fontSize: 16, 
        color: isDarkMode ? '#bae7ff' : 'rgba(0, 0, 0, 0.45)',
        transition: 'all 0.3s ease',
        opacity: isDarkMode ? 1 : 0.5,
      }} />
    </div>
  );
};

export default ThemeToggle;