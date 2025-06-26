import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { safeInvoke } from '../utils/tauri';
import PageContainer from '../components/PageContainer';
import { useTranslation } from '../contexts/LocaleContext';
import { Card, Tabs, Switch, Button, message, Typography, Space, Divider } from 'antd';
import { logger } from '../utils/logger';

const { TabPane } = Tabs;
const { Text, Title } = Typography;

const DebugPage: React.FC = () => {
  const { t } = useTranslation();
  const [result, setResult] = useState<string>('');
  const [debugOptions, setDebugOptions] = useState({
    enableLogging: true,
    enableDetailedErrors: false,
    enablePerformanceMonitor: false,
    enableDevTools: false,
    enableConsoleOutput: true,
  });
  const [logHistory, setLogHistory] = useState<string[]>([]);

  const checkEnvironment = () => {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      windowTauri:
        typeof window !== 'undefined' && (window as any).__TAURI__ ? 'Available' : 'Not Available',
      invokeFunction: typeof invoke !== 'undefined' ? 'Available' : 'Not Available',
      tauriApi: '@tauri-apps/api loaded',
      // 检查更多 Tauri 相关的全局变量
      windowTauriInternals:
        typeof (window as any).__TAURI_INTERNALS__ !== 'undefined' ? 'Available' : 'Not Available',
    };

    setResult(JSON.stringify(info, null, 2));
  };

  const testInvoke = async () => {
    try {
      // 尝试调用一个简单的命令
      const response = await invoke('greet', { name: 'Test' });
      setResult(`Success: ${response}`);
    } catch (error: any) {
      setResult(
        `Error: ${error}\nError Type: ${typeof error}\nError Stack: ${error?.stack || 'No stack'}`
      );
    }
  };

  const testSafeInvoke = async () => {
    try {
      const response = await safeInvoke('greet', { name: 'Test' });
      setResult(`Safe Invoke Success: ${response}`);
    } catch (error) {
      setResult(`Safe Invoke Error: ${error}`);
    }
  };

  const testDeepSeekConnection = async () => {
    try {
      // 使用一个测试 API 密钥
      const testApiKey = localStorage.getItem('deepseek_api_key') || 'test-key';
      const testApiUrl = localStorage.getItem('deepseek_api_url') || 'https://api.deepseek.com';

      setResult('Testing DeepSeek connection...');

      const response = await invoke('test_deepseek_connection', {
        apiKey: testApiKey,
        apiUrl: testApiUrl,
      });

      setResult(`DeepSeek Connection Test Result: ${response}`);
    } catch (error: any) {
      setResult(
        `DeepSeek Test Error: ${error}\nError Type: ${typeof error}\nError Message: ${error?.message || 'No message'}`
      );
    }
  };

  // 加载调试选项
  useEffect(() => {
    const savedOptions = localStorage.getItem('debugOptions');
    if (savedOptions) {
      setDebugOptions(JSON.parse(savedOptions));
    }
  }, []);

  // 保存调试选项
  const saveDebugOptions = () => {
    localStorage.setItem('debugOptions', JSON.stringify(debugOptions));
    message.success('调试选项已保存');
    
    // 应用调试设置
    if (debugOptions.enableLogging) {
      logger.info('调试日志已启用');
    }
  };

  // 清除日志
  const clearLogs = async () => {
    try {
      await safeInvoke('clear_logs');
      setLogHistory([]);
      message.success('日志已清除');
    } catch (error) {
      message.error('清除日志失败');
    }
  };

  // 导出日志
  const exportLogs = async () => {
    try {
      const logs = await safeInvoke<string[]>('export_logs');
      const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debug-logs-${new Date().toISOString()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('日志已导出');
    } catch (error) {
      message.error('导出日志失败');
    }
  };

  return (
    <PageContainer>
      <h1>{t('debug.title')}</h1>
      <Tabs defaultActiveKey="1">
        <TabPane tab="调试选项" key="1">
          <Card>
            <Title level={4}>调试设置</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>启用日志记录</Text>
                <Switch
                  checked={debugOptions.enableLogging}
                  onChange={(checked) => setDebugOptions({ ...debugOptions, enableLogging: checked })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>启用详细错误信息</Text>
                <Switch
                  checked={debugOptions.enableDetailedErrors}
                  onChange={(checked) => setDebugOptions({ ...debugOptions, enableDetailedErrors: checked })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>启用性能监控</Text>
                <Switch
                  checked={debugOptions.enablePerformanceMonitor}
                  onChange={(checked) => setDebugOptions({ ...debugOptions, enablePerformanceMonitor: checked })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>启用开发者工具</Text>
                <Switch
                  checked={debugOptions.enableDevTools}
                  onChange={(checked) => setDebugOptions({ ...debugOptions, enableDevTools: checked })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>启用控制台输出</Text>
                <Switch
                  checked={debugOptions.enableConsoleOutput}
                  onChange={(checked) => setDebugOptions({ ...debugOptions, enableConsoleOutput: checked })}
                />
              </div>
              <Divider />
              <Space>
                <Button type="primary" onClick={saveDebugOptions}>保存设置</Button>
                <Button onClick={clearLogs}>清除日志</Button>
                <Button onClick={exportLogs}>导出日志</Button>
              </Space>
            </Space>
          </Card>
        </TabPane>
        
        <TabPane tab="测试工具" key="2">
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space wrap>
                <Button onClick={checkEnvironment}>
                  {t('debug.checkEnvironment')}
                </Button>
                <Button onClick={testInvoke}>
                  {t('debug.testInvoke')}
                </Button>
                <Button onClick={testSafeInvoke}>
                  {t('debug.testSafeInvoke')}
                </Button>
                <Button onClick={testDeepSeekConnection}>
                  {t('debug.testDeepSeek')}
                </Button>
              </Space>
              
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: 16,
                  borderRadius: 4,
                  overflow: 'auto',
                  minHeight: 200,
                  maxHeight: 400,
                }}
              >
                {result || t('debug.clickToTest')}
              </pre>
            </Space>
          </Card>
        </TabPane>
        
        <TabPane tab="日志记录" key="3">
          <Card>
            <Title level={4}>实时日志</Title>
            <div
              style={{
                background: '#000',
                color: '#0f0',
                padding: 16,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 12,
                minHeight: 300,
                maxHeight: 500,
                overflow: 'auto',
              }}
            >
              {logHistory.length > 0 ? (
                logHistory.map((log, index) => (
                  <div key={index}>{log}</div>
                ))
              ) : (
                <Text style={{ color: '#666' }}>暂无日志记录</Text>
              )}
            </div>
          </Card>
        </TabPane>
      </Tabs>
    </PageContainer>
  );
};

export default DebugPage;
