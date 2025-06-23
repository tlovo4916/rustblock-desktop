import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { CheckCircle, XCircle, AlertCircle, Download } from 'lucide-react';
import { logger } from '../utils/logger';

interface Tool {
  name: string;
  displayName: string;
  installed: boolean;
  version?: string;
  required: boolean;
  installCommand?: string;
  description: string;
}

interface ToolStatusProps {
  onToolsReady?: (ready: boolean) => void;
}

const ToolStatus: React.FC<ToolStatusProps> = ({ onToolsReady }) => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);

  // 检查工具状态
  const checkTools = async () => {
    setLoading(true);
    try {
      const toolsStatus = await invoke<Record<string, any>>('check_system_tools');

      const toolsList: Tool[] = [
        {
          name: 'arduino-cli',
          displayName: 'Arduino CLI',
          installed: toolsStatus['arduino-cli']?.installed || false,
          version: toolsStatus['arduino-cli']?.version,
          required: true,
          description: '用于编译和上传 Arduino 代码',
          installCommand: 'brew install arduino-cli',
        },
        {
          name: 'python3',
          displayName: 'Python 3',
          installed: toolsStatus['python3']?.installed || false,
          version: toolsStatus['python3']?.version,
          required: true,
          description: '用于 MicroPython 开发',
          installCommand: 'brew install python3',
        },
        {
          name: 'mpremote',
          displayName: 'mpremote',
          installed: toolsStatus['mpremote']?.installed || false,
          version: toolsStatus['mpremote']?.version,
          required: false,
          description: '用于上传 MicroPython 代码',
          installCommand: 'pip3 install mpremote',
        },
        {
          name: 'esptool',
          displayName: 'esptool',
          installed: toolsStatus['esptool']?.installed || false,
          version: toolsStatus['esptool']?.version,
          required: false,
          description: '用于 ESP32 固件烧录',
          installCommand: 'pip3 install esptool',
        },
        {
          name: 'platformio',
          displayName: 'PlatformIO',
          installed: toolsStatus['platformio']?.installed || false,
          version: toolsStatus['platformio']?.version,
          required: false,
          description: '高级嵌入式开发平台',
          installCommand: 'pip3 install platformio',
        },
      ];

      setTools(toolsList);

      // 检查必需工具是否都已安装
      const allRequiredInstalled = toolsList.filter(t => t.required).every(t => t.installed);

      if (onToolsReady) {
        onToolsReady(allRequiredInstalled);
      }
    } catch (error) {
      logger.error('检查工具状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 安装工具
  const installTool = async (toolName: string) => {
    setInstalling(toolName);
    try {
      const result = await invoke<{ success: boolean; message: string }>('install_tool', {
        toolName,
      });

      if (result.success) {
        // 重新检查工具状态
        await checkTools();
      } else {
        alert(`安装失败: ${result.message}`);
      }
    } catch (error) {
      logger.error('安装工具失败:', error);
      alert(`安装失败: ${error}`);
    } finally {
      setInstalling(null);
    }
  };

  useEffect(() => {
    checkTools();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div>正在检查系统工具...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h3>系统工具状态</h3>
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={checkTools}
          style={{
            padding: '8px 16px',
            background: '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          刷新状态
        </button>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {tools.map(tool => (
          <div
            key={tool.name}
            style={{
              border: '1px solid #d9d9d9',
              borderRadius: 8,
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: tool.installed ? '#f6ffed' : '#fff2f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {tool.installed ? (
                <CheckCircle size={24} color="#52c41a" />
              ) : tool.required ? (
                <XCircle size={24} color="#ff4d4f" />
              ) : (
                <AlertCircle size={24} color="#faad14" />
              )}

              <div>
                <div style={{ fontWeight: 'bold' }}>
                  {tool.displayName}
                  {tool.version && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 12,
                        color: '#666',
                        fontWeight: 'normal',
                      }}
                    >
                      v{tool.version}
                    </span>
                  )}
                  {tool.required && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 10,
                        background: '#ff4d4f',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: 3,
                      }}
                    >
                      必需
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{tool.description}</div>
                {!tool.installed && tool.installCommand && (
                  <div
                    style={{
                      fontSize: 11,
                      color: '#999',
                      marginTop: 4,
                      fontFamily: 'monospace',
                    }}
                  >
                    手动安装: {tool.installCommand}
                  </div>
                )}
              </div>
            </div>

            {!tool.installed && (
              <button
                onClick={() => installTool(tool.name)}
                disabled={installing === tool.name}
                style={{
                  padding: '6px 12px',
                  background: installing === tool.name ? '#d9d9d9' : '#1890ff',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: installing === tool.name ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Download size={14} />
                {installing === tool.name ? '安装中...' : '自动安装'}
              </button>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 24,
          padding: 16,
          background: '#e6f7ff',
          borderRadius: 8,
          fontSize: 12,
          color: '#1890ff',
        }}
      >
        <strong>提示：</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
          <li>必需工具需要安装才能使用基本功能</li>
          <li>可选工具可以扩展支持更多设备类型</li>
          <li>某些工具可能需要管理员权限安装</li>
          <li>安装完成后请刷新状态以确认</li>
        </ul>
      </div>
    </div>
  );
};

export default ToolStatus;
