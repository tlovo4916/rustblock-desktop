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

// DeviceStatus接口 - 提供完整的设备状态信息
interface DeviceStatus {
  device_info: DeviceInfo;
  driver_status?: {
    installed: boolean;
    driver_info?: {
      name: string;
      version?: string;
      description?: string;
      download_url?: string;
      install_guide?: string;
    };
  };
  ready: boolean;
  recommended_language?: string;
  supported_languages: string[];
}

const DevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [deviceStatuses, setDeviceStatuses] = useState<Map<string, DeviceStatus>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  const scanDevices = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('开始扫描设备...');
      const result = await invoke<DeviceInfo[]>('scan_devices');
      console.log('扫描结果:', result);
      setDevices(result);
      
      // 获取每个设备的详细状态
      const statusMap = new Map<string, DeviceStatus>();
      for (const device of result) {
        try {
          const status = await invoke<DeviceStatus>('get_device_status', { deviceId: device.id });
          if (status) {
            statusMap.set(device.id, status);
          }
        } catch (err) {
          console.warn(`获取设备 ${device.id} 状态失败:`, err);
        }
      }
      setDeviceStatuses(statusMap);
      
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
      await invoke('connect_serial', { deviceId });
      console.log('设备连接成功');
      setSelectedDevice(deviceId);
      // 重新获取设备状态
      await refreshDeviceStatus(deviceId);
    } catch (err) {
      console.error('连接设备失败:', err);
      setError(`连接设备失败: ${err}`);
    }
  };

  const disconnectDevice = async (deviceId: string) => {
    try {
      await invoke('disconnect_serial', { deviceId });
      console.log('设备断开连接');
      if (selectedDevice === deviceId) {
        setSelectedDevice(null);
      }
      await refreshDeviceStatus(deviceId);
    } catch (err) {
      console.error('断开设备失败:', err);
      setError(`断开设备失败: ${err}`);
    }
  };

  const installDriver = async (deviceId: string) => {
    try {
      setError(null);
      const result = await invoke<string>('install_device_driver', { deviceId });
      console.log('驱动安装结果:', result);
      // 重新获取设备状态
      await refreshDeviceStatus(deviceId);
    } catch (err) {
      console.error('安装驱动失败:', err);
      setError(`安装驱动失败: ${err}`);
    }
  };

  const refreshDeviceStatus = async (deviceId: string) => {
    try {
      const status = await invoke<DeviceStatus>('get_device_status', { deviceId });
      if (status) {
        setDeviceStatuses(prev => new Map(prev.set(deviceId, status)));
      }
    } catch (err) {
      console.warn(`刷新设备状态失败:`, err);
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
              {devices.map((device) => {
                const status = deviceStatuses.get(device.id);
                const isConnected = selectedDevice === device.id;
                const isReady = status?.ready || false;
                const driverInstalled = status?.driver_status?.installed || false;
                
                return (
                  <div key={device.id} style={{
                    border: `2px solid ${isReady ? '#52c41a' : driverInstalled ? '#faad14' : '#ff4d4f'}`,
                    borderRadius: 12,
                    padding: 20,
                    background: isConnected ? '#f6ffed' : 'white'
                  }}>
                    {/* 设备基本信息 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{ fontSize: 32 }}>
                          {getDeviceTypeIcon(device.device_type)}
                        </span>
                        <div>
                          <h3 style={{ 
                            margin: 0, 
                            color: getDeviceTypeColor(device.device_type),
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}>
                            {device.name}
                            {isReady && <span style={{ color: '#52c41a', fontSize: 16 }}>✅</span>}
                            {!isReady && driverInstalled && <span style={{ color: '#faad14', fontSize: 16 }}>⚠️</span>}
                            {!driverInstalled && <span style={{ color: '#ff4d4f', fontSize: 16 }}>❌</span>}
                          </h3>
                          <p style={{ margin: '4px 0', color: '#8c8c8c', fontSize: 14 }}>
                            端口: {device.port}
                            {device.manufacturer && ` • 制造商: ${device.manufacturer}`}
                          </p>
                          {device.vendor_id && device.product_id && (
                            <p style={{ margin: 0, color: '#8c8c8c', fontSize: 12 }}>
                              VID: 0x{device.vendor_id.toString(16).toUpperCase().padStart(4, '0')} • 
                              PID: 0x{device.product_id.toString(16).toUpperCase().padStart(4, '0')}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* 状态指示器 */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          background: isReady ? '#52c41a' : driverInstalled ? '#faad14' : '#ff4d4f',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                          marginBottom: 4
                        }}>
                          {isReady ? '✅ 就绪' : driverInstalled ? '⚠️ 需要配置' : '❌ 需要驱动'}
                        </div>
                        {isConnected && (
                          <div style={{ 
                            background: '#1890ff',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 10
                          }}>
                            🔗 已连接
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 驱动状态信息 */}
                    {status?.driver_status && (
                      <div style={{ 
                        background: '#f5f5f5', 
                        padding: 12, 
                        borderRadius: 6, 
                        marginBottom: 12,
                        fontSize: 12
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span>🔧 驱动状态:</span>
                          <span style={{ 
                            color: status.driver_status.installed ? '#52c41a' : '#ff4d4f',
                            fontWeight: 'bold'
                          }}>
                            {status.driver_status.installed ? '已安装' : '未安装'}
                          </span>
                        </div>
                        {status.driver_status.driver_info && (
                          <div style={{ color: '#666', marginLeft: 20 }}>
                            驱动: {status.driver_status.driver_info.name}
                            {status.driver_status.driver_info.version && 
                              ` (${status.driver_status.driver_info.version})`
                            }
                          </div>
                        )}
                      </div>
                    )}

                    {/* 编程语言支持 */}
                    {status && (
                      <div style={{ 
                        background: '#f0f9ff', 
                        padding: 12, 
                        borderRadius: 6, 
                        marginBottom: 12,
                        fontSize: 12
                      }}>
                        <div style={{ marginBottom: 4 }}>
                          <span>💻 推荐语言: </span>
                          <span style={{ 
                            background: '#1890ff', 
                            color: 'white', 
                            padding: '2px 6px', 
                            borderRadius: 3,
                            fontSize: 10
                          }}>
                            {status.recommended_language || 'Arduino'}
                          </span>
                        </div>
                        <div>
                          <span>🔧 支持语言: </span>
                                                     {status.supported_languages.map((lang) => (
                            <span key={lang} style={{ 
                              background: '#e6f7ff', 
                              color: '#1890ff', 
                              padding: '1px 4px', 
                              borderRadius: 2,
                              fontSize: 10,
                              marginRight: 4
                            }}>
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {!driverInstalled && (
                        <button
                          onClick={() => installDriver(device.id)}
                          style={{
                            background: '#ff4d4f',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          🔧 安装驱动
                        </button>
                      )}
                      
                      {driverInstalled && !isConnected && (
                        <button
                          onClick={() => connectDevice(device.id)}
                          style={{
                            background: '#1890ff',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          🔗 连接设备
                        </button>
                      )}
                      
                      {isConnected && (
                        <button
                          onClick={() => disconnectDevice(device.id)}
                          style={{
                            background: '#52c41a',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          🔌 断开连接
                        </button>
                      )}
                      
                      <button
                        onClick={() => refreshDeviceStatus(device.id)}
                        style={{
                          background: '#8c8c8c',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 12
                        }}
                      >
                        🔄 刷新状态
                      </button>
                    </div>
                  </div>
                );
              })}
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