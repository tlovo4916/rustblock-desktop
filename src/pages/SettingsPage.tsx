import React, { useState, useEffect } from 'react';
import { Tabs, Card, Button, Modal, message } from 'antd';
import { Settings, Wrench } from 'lucide-react';
import { safeInvoke } from '../utils/tauri';
import PerformanceMonitor from '../components/PerformanceMonitor';
import ToolStatus from '../components/ToolStatus';
import { logger } from '../utils/logger';
import PageContainer from '../components/PageContainer';

const { TabPane } = Tabs;

const SettingsPage: React.FC = () => {
  const [showToolStatus, setShowToolStatus] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('https://api.deepseek.com');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  // 从localStorage加载配置
  useEffect(() => {
    const savedApiKey = localStorage.getItem('deepseek_api_key') || '';
    const savedApiUrl = localStorage.getItem('deepseek_api_url') || 'https://api.deepseek.com';
    setApiKey(savedApiKey);
    setApiUrl(savedApiUrl);
  }, []);

  // 保存AI配置
  const saveAIConfig = async () => {
    if (!apiKey.trim()) {
      message.error('请输入API密钥');
      return;
    }

    setLoading(true);
    try {
      // 保存到localStorage
      localStorage.setItem('deepseek_api_key', apiKey);
      localStorage.setItem('deepseek_api_url', apiUrl);

      // 触发一个自定义事件，让其他组件知道配置已更新
      window.dispatchEvent(
        new CustomEvent('ai-config-updated', {
          detail: { apiKey, apiUrl },
        })
      );

      message.success('AI配置保存成功！现在可以使用AI助手了');
    } catch (error) {
      logger.error('保存配置失败:', error);
      message.error('保存配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 测试API连接
  const testConnection = async () => {
    if (!apiKey.trim()) {
      message.error('请输入API密钥');
      return;
    }

    setTesting(true);
    try {
      const isConnected = await safeInvoke<boolean>('test_deepseek_connection', {
        apiKey,
        apiUrl,
      });

      if (isConnected) {
        message.success('API连接测试成功！');
      } else {
        message.error('API连接测试失败，请检查密钥和网络连接');
      }
    } catch (error) {
      logger.error('测试连接失败:', error);
      message.error(`测试失败: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <PageContainer>
      <h1>应用设置</h1>
      <Card style={{ minHeight: 'calc(100vh - 150px)' }}>
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
                        borderRadius: 4,
                      }}
                      placeholder="输入你的DeepSeek API密钥..."
                      type="password"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8 }}>API服务地址:</label>
                    <input
                      style={{
                        width: '100%',
                        padding: 8,
                        border: '1px solid #d9d9d9',
                        borderRadius: 4,
                      }}
                      value={apiUrl}
                      onChange={e => setApiUrl(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      style={{
                        background: loading ? '#d9d9d9' : '#1890ff',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: 4,
                        cursor: loading ? 'not-allowed' : 'pointer',
                      }}
                      onClick={saveAIConfig}
                      disabled={loading}
                    >
                      {loading ? '保存中...' : '保存AI配置'}
                    </button>
                    <button
                      style={{
                        background: testing ? '#d9d9d9' : '#52c41a',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: 4,
                        cursor: testing ? 'not-allowed' : 'pointer',
                      }}
                      onClick={testConnection}
                      disabled={testing || !apiKey}
                    >
                      {testing ? '测试中...' : '测试连接'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 编程环境设置 */}
              <div style={{ marginBottom: 32 }}>
                <h3>🔧 编程环境</h3>
                <div style={{ display: 'grid', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8 }}>界面主题:</label>
                    <select
                      style={{
                        padding: 8,
                        border: '1px solid #d9d9d9',
                        borderRadius: 4,
                        width: 200,
                      }}
                    >
                      <option value="light">浅色主题</option>
                      <option value="dark">深色主题</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8 }}>界面语言:</label>
                    <select
                      style={{
                        padding: 8,
                        border: '1px solid #d9d9d9',
                        borderRadius: 4,
                        width: 200,
                      }}
                    >
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
                    <select
                      style={{
                        padding: 8,
                        border: '1px solid #d9d9d9',
                        borderRadius: 4,
                        width: 200,
                      }}
                    >
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
                  <div>
                    <Button icon={<Wrench size={16} />} onClick={() => setShowToolStatus(true)}>
                      检查系统工具状态
                    </Button>
                  </div>
                </div>
              </div>

              {/* 关于信息 */}
              <div>
                <h3>ℹ️ 关于</h3>
                <div
                  style={{
                    background: '#f0f0f0',
                    padding: 16,
                    borderRadius: 8,
                    border: '1px solid #e8e8e8',
                  }}
                >
                  <p>
                    <strong>RustBlock Desktop</strong>
                  </p>
                  <p>版本: 0.0.1</p>
                  <p>开发团队: SupieDT Team</p>
                  <p>基于 Tauri + React + Rust 构建</p>
                  <div style={{ marginTop: 16 }}>
                    <button
                      style={{
                        background: '#52c41a',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        marginRight: 8,
                      }}
                    >
                      检查更新
                    </button>
                    <button
                      style={{
                        background: '#faad14',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      查看日志
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </TabPane>

          <TabPane tab="性能监控" key="performance">
            <PerformanceMonitor />
          </TabPane>
        </Tabs>
      </Card>

      {/* 工具状态模态框 */}
      <Modal
        title="系统工具状态"
        open={showToolStatus}
        onCancel={() => setShowToolStatus(false)}
        footer={null}
        width={800}
        height={600}
        style={{ height: '600px' }}
        bodyStyle={{ height: '500px', padding: 0 }}
      >
        <ToolStatus />
      </Modal>
    </PageContainer>
  );
};

export default SettingsPage;
