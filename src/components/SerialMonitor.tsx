import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { logger } from '../utils/logger';

interface SerialMonitorProps {
  port: string;
  baudRate: number;
  onClose?: () => void;
}

interface SerialData {
  timestamp: number;
  data: string;
  direction: 'rx' | 'tx';
}

const SerialMonitor: React.FC<SerialMonitorProps> = ({ port, baudRate, onClose }) => {
  const [data, setData] = useState<SerialData[]>([]);
  const [input, setInput] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showTimestamp, setShowTimestamp] = useState(true);
  const [lineEnding, setLineEnding] = useState('\n');
  const [displayMode, setDisplayMode] = useState<'ascii' | 'hex'>('ascii');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);

  // 模拟读取串口数据
  const readSerialData = async () => {
    try {
      const response = await invoke<string>('read_serial_data', { port });
      if (response) {
        setData(prev => [
          ...prev,
          {
            timestamp: Date.now(),
            data: response,
            direction: 'rx',
          },
        ]);
      }
    } catch (error) {
      logger.error('读取串口数据失败:', error);
    }
  };

  // 发送数据
  const sendData = async () => {
    if (!input.trim()) return;

    try {
      const dataToSend = input + lineEnding;
      await invoke('write_serial_data', { port, data: dataToSend });

      setData(prev => [
        ...prev,
        {
          timestamp: Date.now(),
          data: input,
          direction: 'tx',
        },
      ]);

      setInput('');
    } catch (error) {
      logger.error('发送数据失败:', error);
    }
  };

  // 清空数据
  const clearData = () => {
    setData([]);
  };

  // 导出数据
  const exportData = () => {
    const content = data
      .map(item => {
        const time = new Date(item.timestamp).toLocaleTimeString();
        const prefix = item.direction === 'rx' ? '<<' : '>>';
        return `[${time}] ${prefix} ${item.data}`;
      })
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serial_log_${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 格式化数据显示
  const formatData = (str: string, mode: 'ascii' | 'hex') => {
    if (mode === 'hex') {
      return str
        .split('')
        .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(' ')
        .toUpperCase();
    }
    return str;
  };

  // 自动滚动
  const scrollToBottom = () => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [data]);

  useEffect(() => {
    // 开始定期读取串口数据
    intervalRef.current = window.setInterval(readSerialData, 100);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [port]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 工具栏 */}
      <div
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid #d9d9d9',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>端口: {port}</span>
          <span>波特率: {baudRate}</span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button
            onClick={clearData}
            style={{
              padding: '4px 8px',
              border: '1px solid #d9d9d9',
              borderRadius: 4,
              background: 'white',
              cursor: 'pointer',
            }}
          >
            🗑️ 清空
          </button>

          <button
            onClick={exportData}
            disabled={data.length === 0}
            style={{
              padding: '4px 8px',
              border: '1px solid #d9d9d9',
              borderRadius: 4,
              background: 'white',
              cursor: data.length > 0 ? 'pointer' : 'not-allowed',
              opacity: data.length > 0 ? 1 : 0.5,
            }}
          >
            💾 导出
          </button>

          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={e => setAutoScroll(e.target.checked)}
            />
            自动滚动
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="checkbox"
              checked={showTimestamp}
              onChange={e => setShowTimestamp(e.target.checked)}
            />
            时间戳
          </label>

          <select
            value={displayMode}
            onChange={e => setDisplayMode(e.target.value as 'ascii' | 'hex')}
            style={{
              padding: '4px 8px',
              border: '1px solid #d9d9d9',
              borderRadius: 4,
            }}
          >
            <option value="ascii">ASCII</option>
            <option value="hex">HEX</option>
          </select>
        </div>
      </div>

      {/* 数据显示区 */}
      <div
        style={{
          flex: 1,
          padding: 16,
          background: '#f5f5f5',
          overflowY: 'auto',
          fontFamily: 'Consolas, Monaco, monospace',
          fontSize: 13,
        }}
      >
        {data.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', padding: 32 }}>等待数据...</div>
        ) : (
          <>
            {data.map((item, index) => (
              <div
                key={index}
                style={{
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                {showTimestamp && (
                  <span style={{ color: '#999', fontSize: 11 }}>
                    [{new Date(item.timestamp).toLocaleTimeString()}]
                  </span>
                )}
                <span
                  style={{
                    color: item.direction === 'rx' ? '#1890ff' : '#52c41a',
                    fontWeight: 'bold',
                  }}
                >
                  {item.direction === 'rx' ? '<<' : '>>'}
                </span>
                <span
                  style={{
                    color: item.direction === 'rx' ? '#333' : '#666',
                    wordBreak: 'break-all',
                  }}
                >
                  {formatData(item.data, displayMode)}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 输入区 */}
      <div
        style={{
          padding: 16,
          borderTop: '1px solid #d9d9d9',
          display: 'flex',
          gap: 8,
        }}
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              sendData();
            }
          }}
          placeholder="输入要发送的数据..."
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #d9d9d9',
            borderRadius: 4,
            fontSize: 14,
          }}
        />

        <select
          value={lineEnding}
          onChange={e => setLineEnding(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d9d9d9',
            borderRadius: 4,
          }}
        >
          <option value="">无结束符</option>
          <option value="\n">换行符 (LF)</option>
          <option value="\r">回车符 (CR)</option>
          <option value="\r\n">回车换行 (CRLF)</option>
        </select>

        <button
          onClick={sendData}
          style={{
            padding: '8px 16px',
            background: '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          发送
        </button>
      </div>
    </div>
  );
};

export default SerialMonitor;
