import React, { useState, useEffect } from 'react';
import { Tabs, Card, Button, Modal, message, Form, Input, Select, Divider, Space, Typography, Switch } from 'antd';
import { SettingOutlined, KeyOutlined, ApiOutlined, RobotOutlined, SaveOutlined, ExperimentOutlined, ToolOutlined } from '@ant-design/icons';
import { safeInvoke } from '../utils/tauri';
import PerformanceMonitor from '../components/PerformanceMonitor';
import ToolStatus from '../components/ToolStatus';
import { logger } from '../utils/logger';
import PageContainer from '../components/PageContainer';
import { useTranslation } from '../contexts/LocaleContext';
import { useTheme } from '../contexts/ThemeContext';
import { apiKeyStorage } from '../utils/secureStorage';
import ErrorBoundary from '../components/ErrorBoundary';
import { validateApiKey, validateUrl } from '../utils/inputValidation';

const { TabPane } = Tabs;
const { Title, Text } = Typography;

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const [showToolStatus, setShowToolStatus] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('https://api.deepseek.com');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [selectedModel, setSelectedModel] = useState('deepseek-chat');
  
  // 存储每个提供商的API密钥
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>({});

  // 支持的模型列表
  const supportedModels = [
    { value: 'deepseek-chat', name: 'DeepSeek Chat (V3)', baseUrl: 'https://api.deepseek.com' },
    { value: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)', baseUrl: 'https://api.deepseek.com' },
    { value: 'gpt-4o', name: 'GPT-4o', baseUrl: 'https://api.openai.com' },
    { value: 'gpt-4o-mini', name: 'GPT-4o Mini', baseUrl: 'https://api.openai.com' },
  ];

  // 从localStorage加载配置
  useEffect(() => {
    const loadConfig = async () => {
      // 首次运行时迁移旧的API密钥
      await apiKeyStorage.migrateFromLocalStorage();
      
      const savedModel = localStorage.getItem('ai_model') || 'deepseek-chat';
      
      // 从安全存储加载所有提供商的API密钥
      const keys = await apiKeyStorage.getAllApiKeys();
      setProviderKeys(keys);
      
      // 根据选择的模型设置对应的API密钥和URL
      const model = supportedModels.find(m => m.value === savedModel);
      if (model) {
        const provider = model.baseUrl.includes('deepseek') ? 'deepseek' : 'openai';
        setApiKey(keys[provider] || '');
        setApiUrl(model.baseUrl);
      }
      
      setSelectedModel(savedModel);
    };
    
    loadConfig();
  }, []);

  // 当选择模型改变时，更新API URL和加载对应的API密钥
  useEffect(() => {
    const model = supportedModels.find(m => m.value === selectedModel);
    if (model && model.baseUrl) {
      setApiUrl(model.baseUrl);
      
      // 根据模型加载对应提供商的API密钥
      const provider = model.baseUrl.includes('deepseek') ? 'deepseek' : 'openai';
      setApiKey(providerKeys[provider] || '');
    }
  }, [selectedModel, providerKeys]);

  // 保存AI配置
  const saveAIConfig = async () => {
    if (!apiKey.trim()) {
      message.error(t('settings.enterApiKey'));
      return;
    }

    // 验证API密钥格式
    const apiKeyValidation = validateApiKey(apiKey);
    if (!apiKeyValidation.isValid) {
      message.error(apiKeyValidation.errors.join(' '));
      return;
    }

    // 验证API URL格式
    const urlValidation = validateUrl(apiUrl);
    if (!urlValidation.isValid) {
      message.error(urlValidation.errors.join(' '));
      return;
    }

    setLoading(true);
    try {
      // 根据当前选择的模型确定提供商
      const model = supportedModels.find(m => m.value === selectedModel);
      const provider = model?.baseUrl.includes('deepseek') ? 'deepseek' : 'openai';
      
      // 保存到安全存储（使用验证后的清理版本）
      await apiKeyStorage.setApiKey(provider as 'deepseek' | 'openai', apiKeyValidation.sanitized);
      
      // 更新内存中的提供商密钥（使用验证后的清理版本）
      setProviderKeys(prev => ({ ...prev, [provider]: apiKeyValidation.sanitized }));
      
      // 保存当前选择的模型和URL（这些不是敏感信息，可以继续使用localStorage）
      localStorage.setItem('ai_model', selectedModel);
      localStorage.setItem('ai_api_url', urlValidation.sanitized);
      
      // 保持向后兼容
      if (provider === 'deepseek') {
        localStorage.setItem('deepseek_api_url', urlValidation.sanitized);
      }

      // 触发一个自定义事件，让其他组件知道配置已更新
      window.dispatchEvent(
        new CustomEvent('ai-config-updated', {
          detail: { 
            apiKey: apiKeyValidation.sanitized, 
            apiUrl: urlValidation.sanitized, 
            model: selectedModel,
            provider,
            providerKeys: { ...providerKeys, [provider]: apiKeyValidation.sanitized }
          },
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

    // 验证API密钥格式
    const apiKeyValidation = validateApiKey(apiKey);
    if (!apiKeyValidation.isValid) {
      message.error(apiKeyValidation.errors.join(' '));
      return;
    }

    // 验证API URL格式
    const urlValidation = validateUrl(apiUrl);
    if (!urlValidation.isValid) {
      message.error(urlValidation.errors.join(' '));
      return;
    }

    setTesting(true);
    try {
      const isConnected = await safeInvoke<boolean>('test_ai_connection', {
        apiKey: apiKeyValidation.sanitized,
        apiUrl: urlValidation.sanitized,
        model: selectedModel,
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
                    <label style={{ display: 'block', marginBottom: 8 }}>{t('settings.aiModel')}:</label>
                    <Select
                      style={{ maxWidth: 500 }}
                      value={selectedModel}
                      onChange={setSelectedModel}
                    >
                      {supportedModels.map(model => (
                        <Select.Option key={model.value} value={model.value}>
                          {model.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8 }}>{t('settings.apiKey')}:</label>
                    <Input.Password
                      style={{
                        maxWidth: 500,
                      }}
                      placeholder={t('settings.apiKeyPlaceholder')}
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8 }}>{t('settings.apiUrl')}:</label>
                    <Input
                      style={{ maxWidth: 500 }}
                      value={apiUrl}
                      onChange={e => setApiUrl(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <ErrorBoundary isolate>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={loading}
                        onClick={saveAIConfig}
                      >
                        {t('settings.save')}
                      </Button>
                    </ErrorBoundary>
                    <ErrorBoundary isolate>
                      <Button
                        icon={<ExperimentOutlined />}
                        loading={testing}
                        onClick={testConnection}
                        disabled={!apiKey}
                      >
                        {t('settings.test')}
                      </Button>
                    </ErrorBoundary>
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
                    <Button icon={<ToolOutlined />} onClick={() => setShowToolStatus(true)}>
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
            <ErrorBoundary 
              isolate
              fallback={
                <div style={{ padding: 32, textAlign: 'center' }}>
                  <h4 style={{ color: '#ff4d4f' }}>性能监控加载失败</h4>
                  <p>无法加载性能监控组件，请刷新页面重试。</p>
                </div>
              }
            >
              <PerformanceMonitor />
            </ErrorBoundary>
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
        <ErrorBoundary 
          isolate
          fallback={
            <div style={{ padding: 32, textAlign: 'center' }}>
              <h4 style={{ color: '#ff4d4f' }}>工具状态加载失败</h4>
              <p>无法加载工具状态信息。</p>
            </div>
          }
        >
          <ToolStatus />
        </ErrorBoundary>
      </Modal>
    </PageContainer>
  );
};

export default SettingsPage;
