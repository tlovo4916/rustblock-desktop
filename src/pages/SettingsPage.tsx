import React, { useState, useEffect } from 'react';
import { Tabs, Card, Button, Modal, message } from 'antd';
import { Settings, Wrench } from 'lucide-react';
import { safeInvoke } from '../utils/tauri';
import PerformanceMonitor from '../components/PerformanceMonitor';
import ToolStatus from '../components/ToolStatus';
import { logger } from '../utils/logger';
import PageContainer from '../components/PageContainer';
import { useTranslation } from '../contexts/LocaleContext';

const { TabPane } = Tabs;

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
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
      message.error(t('settings.enterApiKey'));
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

      message.success(t('settings.saveSuccess'));
    } catch (error) {
      logger.error('保存配置失败:', error);
      message.error(t('settings.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 测试API连接
  const testConnection = async () => {
    if (!apiKey.trim()) {
      message.error(t('settings.enterApiKey'));
      return;
    }

    setTesting(true);
    try {
      const isConnected = await safeInvoke<boolean>('test_deepseek_connection', {
        apiKey,
        apiUrl,
      });

      if (isConnected) {
        message.success(t('settings.testSuccess'));
      } else {
        message.error(t('settings.testFailed'));
      }
    } catch (error) {
      logger.error('测试连接失败:', error);
      message.error(`${t('settings.testFailed')}: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <PageContainer>
      <h1>{t('settings.title')}</h1>
      <Card style={{ minHeight: 'calc(100vh - 150px)' }}>
        <Tabs defaultActiveKey="general">
          <TabPane tab={t('settings.general')} key="general">
            <div>
              {/* AI配置 */}
              <div style={{ marginBottom: 32 }}>
                <h3>{t('settings.aiConfig')}</h3>
                <div style={{ display: 'grid', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8 }}>{t('settings.apiKey')}:</label>
                    <input
                      style={{
                        width: '100%',
                        padding: 8,
                        border: '1px solid #d9d9d9',
                        borderRadius: 4,
                      }}
                      placeholder={t('settings.apiKeyPlaceholder')}
                      type="password"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8 }}>{t('settings.apiUrl')}:</label>
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
                      {loading ? t('settings.saving') : t('settings.save')}
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
                      {testing ? t('settings.testing') : t('settings.test')}
                    </button>
                  </div>
                </div>
              </div>

              {/* 编程环境设置 */}
              <div style={{ marginBottom: 32 }}>
                <h3>{t('settings.programming')}</h3>
                <div style={{ display: 'grid', gap: 16 }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" defaultChecked />
                      {t('settings.autoSave')}
                    </label>
                  </div>
                </div>
              </div>

              {/* 设备设置 */}
              <div style={{ marginBottom: 32 }}>
                <h3>{t('settings.deviceSettings')}</h3>
                <div style={{ display: 'grid', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8 }}>{t('settings.baudRate')}:</label>
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
                      {t('settings.autoDetect')}
                    </label>
                  </div>
                  <div>
                    <Button icon={<Wrench size={16} />} onClick={() => setShowToolStatus(true)}>
                      {t('settings.checkTools')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* 关于信息 */}
              <div>
                <h3>{t('settings.about')}</h3>
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
                  <p>{t('settings.version')}: 0.0.1</p>
                  <p>{t('settings.team')}: SupieDT Team</p>
                  <p>{t('settings.builtWith')}</p>
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
                      {t('settings.checkUpdate')}
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
                      {t('settings.viewLogs')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </TabPane>

          <TabPane tab={t('settings.performance')} key="performance">
            <PerformanceMonitor />
          </TabPane>
        </Tabs>
      </Card>

      {/* 工具状态模态框 */}
      <Modal
        title={t('settings.systemToolsStatus')}
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
