import React from 'react';
import { Switch, Space } from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <Space size="small" style={{ marginRight: 8 }}>
      <SunOutlined style={{ 
        fontSize: 18, 
        color: isDarkMode ? '#8c8c8c' : '#faad14',
        transition: 'color 0.3s ease'
      }} />
      <Switch
        checked={isDarkMode}
        onChange={toggleTheme}
        checkedChildren={<MoonOutlined style={{ fontSize: 12 }} />}
        unCheckedChildren={<SunOutlined style={{ fontSize: 12 }} />}
      />
      <MoonOutlined style={{ 
        fontSize: 18, 
        color: isDarkMode ? '#1890ff' : '#8c8c8c',
        transition: 'color 0.3s ease'
      }} />
    </Space>
  );
};

export default ThemeToggle;