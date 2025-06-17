import React from 'react';
import { Tabs } from 'antd';
import PerformanceMonitor from '../components/PerformanceMonitor';

const { TabPane } = Tabs;

const SettingsPage: React.FC = () => {
  return (
    <div style={{ padding: 24 }}>
      <h1>应用设置</h1>
      <div style={{ 
        background: 'white', 
        padding: 24, 
        borderRadius: 8, 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
      }}>
        <Tabs defaultActiveKey="general">
          <TabPane tab="通用设置" key="general">
            <div>
        {/* AI配置 */}
        <div style={{ marginBottom: 32 }}>
          <h3>🤖 AI助手配置</h3>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8 }}>DeepSeek API密钥:</label>
              <input
                style={{
                  width: '100%',
                  padding: 8,
                  border: '1px solid #d9d9d9',
                  borderRadius: 4
                }}
                placeholder="输入你的DeepSeek API密钥..."
                type="password"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8 }}>API服务地址:</label>
              <input
                style={{
                  width: '100%',
                  padding: 8,
                  border: '1px solid #d9d9d9',
                  borderRadius: 4
                }}
                defaultValue="https://api.deepseek.com"
              />
            </div>
            <button style={{
              background: '#1890ff',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 4,
              cursor: 'pointer',
              width: 'fit-content'
            }}>
              保存AI配置
            </button>
          </div>
        </div>
        
        {/* 编程环境设置 */}
        <div style={{ marginBottom: 32 }}>
          <h3>🔧 编程环境</h3>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8 }}>界面主题:</label>
              <select style={{
                padding: 8,
                border: '1px solid #d9d9d9',
                borderRadius: 4,
                width: 200
              }}>
                <option value="light">浅色主题</option>
                <option value="dark">深色主题</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8 }}>界面语言:</label>
              <select style={{
                padding: 8,
                border: '1px solid #d9d9d9',
                borderRadius: 4,
                width: 200
              }}>
                <option value="zh-CN">简体中文</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" defaultChecked />
                自动保存项目 (每30秒)
              </label>
            </div>
          </div>
        </div>
        
        {/* 设备设置 */}
        <div style={{ marginBottom: 32 }}>
          <h3>📱 设备设置</h3>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8 }}>默认波特率:</label>
              <select style={{
                padding: 8,
                border: '1px solid #d9d9d9',
                borderRadius: 4,
                width: 200
              }}>
                <option value="9600">9600</option>
                <option value="115200">115200</option>
                <option value="57600">57600</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" defaultChecked />
                自动检测新设备
              </label>
            </div>
          </div>
        </div>
        
        {/* 关于信息 */}
        <div>
          <h3>ℹ️ 关于</h3>
          <div style={{ 
            background: '#f0f0f0', 
            padding: 16, 
            borderRadius: 8,
            border: '1px solid #e8e8e8'
          }}>
            <p><strong>RustBlock Desktop</strong></p>
            <p>版本: 0.0.1</p>
            <p>开发团队: supiedt Team</p>
            <p>基于 Tauri + React + Rust 构建</p>
            <div style={{ marginTop: 16 }}>
              <button style={{
                background: '#52c41a',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 4,
                cursor: 'pointer',
                marginRight: 8
              }}>
                检查更新
              </button>
              <button style={{
                background: '#faad14',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 4,
                cursor: 'pointer'
              }}>
                查看日志
              </button>
            </div>
          </div>
            </div>
          </TabPane>
          
          <TabPane tab="性能监控" key="performance">
            <PerformanceMonitor />
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPage; 