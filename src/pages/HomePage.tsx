import React from 'react';
import PageContainer from '../components/PageContainer';

const HomePage: React.FC = () => {
  return (
    <PageContainer>
      <h1>欢迎使用 RustBlock Desktop</h1>
      <div
        style={{
          padding: 24,
          borderRadius: 8,
          backgroundColor: 'var(--bg-secondary, #f5f5f5)',
          border: '1px solid var(--border-color, #d9d9d9)',
        }}
      >
        <h2>🎯 面向10岁以下小朋友的可视化编程环境</h2>
        <p>支持 Arduino、micro:bit 等硬件设备编程</p>

        <div style={{ marginTop: 32 }}>
          <h3>✨ 主要功能</h3>
          <ul>
            <li>🧩 拖拽式积木编程 - 像搭积木一样简单</li>
            <li>📱 智能设备检测 - 自动识别连接的硬件</li>
            <li>🤖 AI编程助手 - 友好的学习伙伴</li>
            <li>🚀 一键代码上传 - 让创意变成现实</li>
          </ul>
        </div>

        <div style={{ marginTop: 32 }}>
          <h3>🔗 快速开始</h3>
          <ol>
            <li>连接你的 Arduino 或 micro:bit 设备</li>
            <li>前往"编程环境"开始创作</li>
            <li>拖拽积木块组成你的程序</li>
            <li>点击上传，看看你的设备有什么反应！</li>
          </ol>
        </div>
      </div>
    </PageContainer>
  );
};

export default HomePage;
