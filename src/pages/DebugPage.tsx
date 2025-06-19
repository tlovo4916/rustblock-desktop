import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { safeInvoke } from '../utils/tauri';

const DebugPage: React.FC = () => {
  const [result, setResult] = useState<string>('');

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

  return (
    <div style={{ padding: 24 }}>
      <h1>Tauri 环境调试</h1>
      <div
        style={{
          background: 'white',
          padding: 24,
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <button onClick={checkEnvironment} style={{ marginRight: 8 }}>
            检查环境
          </button>
          <button onClick={testInvoke} style={{ marginRight: 8 }}>
            测试 invoke
          </button>
          <button onClick={testSafeInvoke} style={{ marginRight: 8 }}>
            测试 safeInvoke
          </button>
          <button onClick={testDeepSeekConnection}>测试 DeepSeek 连接</button>
        </div>

        <pre
          style={{
            background: '#f5f5f5',
            padding: 16,
            borderRadius: 4,
            overflow: 'auto',
          }}
        >
          {result || '点击按钮进行测试'}
        </pre>
      </div>
    </div>
  );
};

export default DebugPage;
