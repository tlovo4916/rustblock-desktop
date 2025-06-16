import React from 'react';

const Sidebar: React.FC = () => {
  return (
    <div style={{
      width: 200,
      background: '#001529',
      color: 'white',
      padding: 16,
      minHeight: '100vh'
    }}>
      <h3 style={{ color: 'white', marginBottom: 24 }}>RustBlock</h3>
      <div>
        <div style={{ padding: 8, cursor: 'pointer' }}>🏠 首页</div>
        <div style={{ padding: 8, cursor: 'pointer' }}>🔧 编程环境</div>
        <div style={{ padding: 8, cursor: 'pointer' }}>📱 设备管理</div>
        <div style={{ padding: 8, cursor: 'pointer' }}>🤖 AI助手</div>
        <div style={{ padding: 8, cursor: 'pointer' }}>⚙️ 设置</div>
      </div>
    </div>
  );
};

export default Sidebar; 