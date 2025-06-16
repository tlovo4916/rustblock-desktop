import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface DeviceInfo {
  id: string;
  name: string;
  device_type: string;
  port: string;
  vendor_id?: number;
  product_id?: number;
  manufacturer?: string;
  description?: string;
  connected: boolean;
}

// DeviceStatus接口设计用于提供更丰富的设备状态信息
// 包括：驱动状态、设备就绪状态、推荐编程语言、支持的语言列表等
// 后端已完全实现相关功能，前端可在后续开发中使用
/*
interface DeviceStatus {
  device_info: DeviceInfo;
  driver_status?: {
    installed: boolean;
    driver_info?: any;
  };
  ready: boolean;
  recommended_language?: string;
  supported_languages: string[];
}
*/

const DevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanDevices = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('开始扫描设备...');
      const result = await invoke<DeviceInfo[]>('scan_devices');
      console.log('扫描结果:', result);
      setDevices(result);
      
      if (result.length === 0) {
        setError('未检测到设备。请确保设备已正确连接并安装了相应的驱动程序。');
      }
    } catch (err) {
      console.error('扫描设备失败:', err);
      setError(`扫描设备失败: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const connectDevice = async (deviceId: string) => {
    try {
      await invoke('connect_device', { deviceId });
      console.log('设备连接成功');
      // 重新扫描更新状态
      await scanDevices();
    } catch (err) {
      console.error('连接设备失败:', err);
      setError(`连接设备失败: ${err}`);
    }
  };

  const getDeviceTypeIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'Arduino': return '🔧';
      case 'MicroBit': return '📱';
      case 'ESP32': return '🚀';
      case 'RaspberryPiPico': return '🥧';
      default: return '❓';
    }
  };

  const getDeviceTypeColor = (deviceType: string) => {
    switch (deviceType) {
      case 'Arduino': return '#52c41a';
      case 'MicroBit': return '#1890ff';
      case 'ESP32': return '#fa8c16';
      case 'RaspberryPiPico': return '#eb2f96';
      default: return '#8c8c8c';
    }
  };

  useEffect(() => {
    // 页面加载时自动扫描一次
    scanDevices();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>设备管理</h1>
      <div style={{ 
        background: 'white', 
        padding: 24, 
        borderRadius: 8, 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
      }}>
        <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button 
            onClick={scanDevices}
            disabled={loading}
            style={{
              background: loading ? '#d9d9d9' : '#1890ff',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 4,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '🔄 扫描中...' : '🔍 扫描设备'}
          </button>
          
          {devices.length > 0 && (
            <span style={{ color: '#52c41a', fontSize: 14 }}>
              ✅ 发现 {devices.length} 个设备
            </span>
          )}
        </div>

        {error && (
          <div style={{ 
            background: '#fff2f0', 
            border: '1px solid #ffccc7', 
            borderRadius: 4, 
            padding: 12, 
            marginBottom: 16,
            color: '#a8071a'
          }}>
            ⚠️ {error}
          </div>
        )}
        
        <h3>检测到的设备</h3>
        <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 16 }}>
          {devices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#8c8c8c' }}>
              <p>📱 暂未检测到设备</p>
              <p>请连接你的 Arduino、micro:bit 或其他支持的硬件设备</p>
              <p style={{ fontSize: 12, marginTop: 8 }}>
                如果设备已连接但未显示，请检查：<br/>
                • USB连接线是否正常<br/>
                • 设备驱动是否已安装<br/>
                • 设备是否被其他程序占用
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {devices.map((device) => (
                <div key={device.id} style={{
                  border: '1px solid #e8e8e8',
                  borderRadius: 8,
                  padding: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>
                      {getDeviceTypeIcon(device.device_type)}
                    </span>
                    <div>
                      <h4 style={{ 
                        margin: 0, 
                        color: getDeviceTypeColor(device.device_type) 
                      }}>
                        {device.name}
                      </h4>
                      <p style={{ margin: 0, color: '#8c8c8c', fontSize: 12 }}>
                        端口: {device.port}
                        {device.manufacturer && ` • 制造商: ${device.manufacturer}`}
                      </p>
                      {device.vendor_id && device.product_id && (
                        <p style={{ margin: 0, color: '#8c8c8c', fontSize: 10 }}>
                          VID: 0x{device.vendor_id.toString(16).toUpperCase().padStart(4, '0')} • 
                          PID: 0x{device.product_id.toString(16).toUpperCase().padStart(4, '0')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => connectDevice(device.id)}
                      style={{
                        background: device.connected ? '#52c41a' : '#1890ff',
                        color: 'white',
                        border: 'none',
                        padding: '4px 12px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12
                      }}
                    >
                      {device.connected ? '✅ 已连接' : '🔗 连接'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div style={{ marginTop: 32 }}>
          <h3>支持的设备类型</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: 16 }}>
              <h4>🔧 Arduino 系列</h4>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>Arduino Uno</li>
                <li>Arduino Nano</li>
                <li>Arduino Leonardo</li>
                <li>Arduino Mega</li>
              </ul>
            </div>
            <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: 16 }}>
              <h4>📱 micro:bit</h4>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>micro:bit V1</li>
                <li>micro:bit V2</li>
              </ul>
            </div>
            <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: 16 }}>
              <h4>🚀 ESP32 系列</h4>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>ESP32 DevKit</li>
                <li>ESP32-S2</li>
                <li>ESP32-C3</li>
              </ul>
            </div>
            <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: 16 }}>
              <h4>🥧 Raspberry Pi</h4>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>Raspberry Pi Pico</li>
                <li>Raspberry Pi Pico W</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevicesPage; 