import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Modal, Tabs } from 'antd';
// import SerialMonitor from '../components/SerialMonitor';
// import DeviceConfiguration from '../components/DeviceConfiguration';

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
  const [connectedPorts, setConnectedPorts] = useState<string[]>([]);
  const [driverInstallInfo, setDriverInstallInfo] = useState<string | null>(null);
  const [showDriverDialog, setShowDriverDialog] = useState(false);
  const [showSerialMonitor, setShowSerialMonitor] = useState<{
    port: string;
    baudRate: number;
  } | null>(null);
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [selectedDeviceForConfig, setSelectedDeviceForConfig] = useState<string | null>(null);

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

      // 更新已连接端口列表
      await updateConnectedPorts();

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
      setError(null);
      console.log('开始连接设备:', deviceId);

      // 获取设备信息
      const device = devices.find(d => d.id === deviceId);
      if (!device) {
        throw new Error('设备未找到');
      }

      // 获取设备状态以确定波特率
      const status = deviceStatuses.get(deviceId);
      if (!status?.ready) {
        throw new Error('设备未就绪，请先安装驱动');
      }

      // 根据设备类型确定波特率
      const baudRate = getBaudRateForDevice(device.device_type);

      // 检查端口是否被占用
      const isPortBusy = await checkPortStatus(device.port);
      if (isPortBusy) {
        throw new Error(`端口 ${device.port} 正在被其他程序使用，请关闭相关程序后重试`);
      }

      // 连接串口
      await invoke('connect_serial', {
        port: device.port,
        baudRate: baudRate,
      });

      console.log('设备连接成功');

      // 更新已连接端口列表
      await updateConnectedPorts();

      // 重新获取设备状态
      await refreshDeviceStatus(deviceId);

      // 记录连接历史
      await recordConnectionHistory(deviceId, true);
    } catch (err) {
      console.error('连接设备失败:', err);
      const errorMsg = getDetailedErrorMessage(err);
      setError(errorMsg);

      // 记录连接失败历史
      await recordConnectionHistory(deviceId, false, errorMsg);
    }
  };

  const disconnectDevice = async (deviceId: string) => {
    try {
      setError(null);
      console.log('开始断开设备:', deviceId);

      // 获取设备信息
      const device = devices.find(d => d.id === deviceId);
      if (!device) {
        throw new Error('设备未找到');
      }

      // 断开串口连接
      await invoke('disconnect_serial', { port: device.port });
      console.log('设备断开连接');

      // 更新已连接端口列表
      await updateConnectedPorts();

      await refreshDeviceStatus(deviceId);
    } catch (err) {
      console.error('断开设备失败:', err);
      setError(`断开设备失败: ${err}`);
    }
  };

  const getBaudRateForDevice = (deviceType: string): number => {
    switch (deviceType) {
      case 'Arduino':
        return 9600;
      case 'ESP32':
        return 115200;
      case 'MicroBit':
        return 115200;
      case 'RaspberryPiPico':
        return 115200;
      default:
        return 9600;
    }
  };

  const updateConnectedPorts = async () => {
    try {
      const ports = await invoke<string[]>('get_connected_ports');
      setConnectedPorts(ports);
    } catch (err) {
      console.warn('获取已连接端口列表失败:', err);
    }
  };

  const isDeviceConnected = (device: DeviceInfo): boolean => {
    return connectedPorts.includes(device.port);
  };

  const installDriver = async (deviceId: string) => {
    try {
      setError(null);
      console.log('开始安装驱动:', deviceId);

      // 显示安装提示
      const result = await invoke<string>('install_device_driver', { deviceId });
      console.log('驱动安装结果:', result);

      // 显示安装结果
      setDriverInstallInfo(result);
      setShowDriverDialog(true);

      if (result.includes('成功')) {
        // 安装成功，刷新状态
        setTimeout(async () => {
          await refreshDeviceStatus(deviceId);
        }, 1000);
      }
    } catch (err) {
      console.error('安装驱动失败:', err);
      setDriverInstallInfo(`安装驱动失败: ${err}`);
      setShowDriverDialog(true);
    }
  };

  const refreshDeviceStatus = async (deviceId: string) => {
    try {
      setError(null);
      console.log('刷新设备状态:', deviceId);

      // 使用新的刷新命令
      const status = await invoke<DeviceStatus>('refresh_device_status', { deviceId });
      if (status) {
        setDeviceStatuses(prev => new Map(prev.set(deviceId, status)));
        console.log('设备状态已更新:', status);
      }
    } catch (err) {
      console.error(`刷新设备状态失败:`, err);
      setError(`刷新设备状态失败: ${err}`);
    }
  };

  const refreshAllDevices = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('刷新所有设备...');
      const result = await invoke<DeviceInfo[]>('refresh_all_devices');
      console.log('刷新结果:', result);
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

      // 重要：更新已连接端口列表，保持连接状态
      await updateConnectedPorts();

      if (result.length === 0) {
        setError('未检测到设备。请确保设备已正确连接并安装了相应的驱动程序。');
      }
    } catch (err) {
      console.error('刷新设备失败:', err);
      setError(`刷新设备失败: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceTypeIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'Arduino':
        return '🔧';
      case 'MicroBit':
        return '📱';
      case 'ESP32':
        return '🚀';
      case 'RaspberryPiPico':
        return '🥧';
      default:
        return '❓';
    }
  };

  const getDeviceTypeColor = (deviceType: string) => {
    switch (deviceType) {
      case 'Arduino':
        return '#52c41a';
      case 'MicroBit':
        return '#1890ff';
      case 'ESP32':
        return '#fa8c16';
      case 'RaspberryPiPico':
        return '#eb2f96';
      default:
        return '#8c8c8c';
    }
  };

  // 检查端口状态
  const checkPortStatus = async (port: string): Promise<boolean> => {
    try {
      // 这里可以添加端口占用检查逻辑
      // 暂时返回 false，表示端口可用
      return false;
    } catch (error) {
      return false;
    }
  };

  // 获取详细的错误信息
  const getDetailedErrorMessage = (error: any): string => {
    const errorStr = error.toString();

    if (errorStr.includes('Access denied') || errorStr.includes('Permission denied')) {
      return '权限不足：请确保当前用户有访问串口的权限，或以管理员身份运行程序';
    }

    if (errorStr.includes('Device or resource busy')) {
      return '设备忙碌：端口可能被其他程序占用，请关闭Arduino IDE、PlatformIO或其他串口工具后重试';
    }

    if (errorStr.includes('No such file or directory')) {
      return '设备未找到：设备可能已断开连接，请检查USB连接';
    }

    if (errorStr.includes('Operation timed out')) {
      return '连接超时：设备无响应，请检查设备状态和连接';
    }

    return `连接失败: ${errorStr}`;
  };

  // 记录连接历史
  const recordConnectionHistory = async (deviceId: string, success: boolean, error?: string) => {
    try {
      await invoke('record_connection_history', {
        device_id: deviceId,
        success,
        error: error || null,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn('记录连接历史失败:', err);
    }
  };

  // 打开串口监视器
  const openSerialMonitor = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (device) {
      const baudRate = getBaudRateForDevice(device.device_type);
      setShowSerialMonitor({ port: device.port, baudRate });
    }
  };

  // 打开设备配置
  const openDeviceConfiguration = (deviceId: string) => {
    setSelectedDeviceForConfig(deviceId);
    setShowConfiguration(true);
  };

  useEffect(() => {
    // 页面加载时自动扫描一次
    scanDevices();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>设备管理</h1>
      <div
        style={{
          background: 'white',
          padding: 24,
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
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
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '🔄 扫描中...' : '🔍 扫描设备'}
          </button>

          <button
            onClick={refreshAllDevices}
            disabled={loading}
            style={{
              background: loading ? '#d9d9d9' : '#52c41a',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 4,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '🔄 刷新中...' : '🔄 刷新所有'}
          </button>

          {devices.length > 0 && (
            <span style={{ color: '#52c41a', fontSize: 14 }}>✅ 发现 {devices.length} 个设备</span>
          )}
        </div>

        {error && (
          <div
            style={{
              background: '#fff2f0',
              border: '1px solid #ffccc7',
              borderRadius: 4,
              padding: 12,
              marginBottom: 16,
              color: '#a8071a',
            }}
          >
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
                如果设备已连接但未显示，请检查：
                <br />
                • USB连接线是否正常
                <br />
                • 设备驱动是否已安装
                <br />• 设备是否被其他程序占用
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {devices.map(device => {
                const status = deviceStatuses.get(device.id);
                const isConnected = isDeviceConnected(device);
                const isReady = status?.ready || false;
                const driverInstalled = status?.driver_status?.installed || false;

                return (
                  <div
                    key={device.id}
                    style={{
                      border: `2px solid ${device.device_type === 'Unknown' ? '#8c8c8c' : isReady ? '#52c41a' : driverInstalled ? '#faad14' : '#ff4d4f'}`,
                      borderRadius: 12,
                      padding: 20,
                      background: isConnected ? '#f6ffed' : 'white',
                    }}
                  >
                    {/* 设备基本信息 */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 16,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{ fontSize: 32 }}>
                          {getDeviceTypeIcon(device.device_type)}
                        </span>
                        <div>
                          <h3
                            style={{
                              margin: 0,
                              color: getDeviceTypeColor(device.device_type),
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            {device.name}
                            {isReady && <span style={{ color: '#52c41a', fontSize: 16 }}>✅</span>}
                            {!isReady && driverInstalled && (
                              <span style={{ color: '#faad14', fontSize: 16 }}>⚠️</span>
                            )}
                            {!driverInstalled && (
                              <span style={{ color: '#ff4d4f', fontSize: 16 }}>❌</span>
                            )}
                          </h3>
                          <p style={{ margin: '4px 0', color: '#8c8c8c', fontSize: 14 }}>
                            端口: {device.port}
                            {device.manufacturer && ` • 制造商: ${device.manufacturer}`}
                          </p>
                          {device.vendor_id && device.product_id && (
                            <p style={{ margin: 0, color: '#8c8c8c', fontSize: 12 }}>
                              VID: 0x{device.vendor_id.toString(16).toUpperCase().padStart(4, '0')}{' '}
                              • PID: 0x
                              {device.product_id.toString(16).toUpperCase().padStart(4, '0')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 状态指示器 */}
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            background: device.device_type === 'Unknown'
                              ? '#8c8c8c'
                              : isReady
                                ? '#52c41a'
                                : driverInstalled
                                  ? '#faad14'
                                  : '#ff4d4f',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                            marginBottom: 4,
                          }}
                        >
                          {device.device_type === 'Unknown'
                            ? '❓ 未知设备'
                            : isReady
                              ? '✅ 就绪'
                              : driverInstalled
                                ? '⚠️ 需要配置'
                                : '❌ 需要驱动'}
                        </div>
                        {isConnected && (
                          <div
                            style={{
                              background: '#1890ff',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 10,
                            }}
                          >
                            🔗 已连接
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 驱动状态信息 */}
                    {status?.driver_status && (
                      <div
                        style={{
                          background: '#f5f5f5',
                          padding: 12,
                          borderRadius: 6,
                          marginBottom: 12,
                          fontSize: 12,
                        }}
                      >
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}
                        >
                          <span>🔧 驱动状态:</span>
                          <span
                            style={{
                              color: status.driver_status.installed ? '#52c41a' : '#ff4d4f',
                              fontWeight: 'bold',
                            }}
                          >
                            {status.driver_status.installed ? '已安装' : '未安装'}
                          </span>
                        </div>
                        {status.driver_status.driver_info && (
                          <div style={{ color: '#666', marginLeft: 20 }}>
                            驱动: {status.driver_status.driver_info.name}
                            {status.driver_status.driver_info.version &&
                              ` (${status.driver_status.driver_info.version})`}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 编程语言支持 - 只对已知设备类型显示 */}
                    {status && device.device_type !== 'Unknown' && (
                      <div
                        style={{
                          background: '#f0f9ff',
                          padding: 12,
                          borderRadius: 6,
                          marginBottom: 12,
                          fontSize: 12,
                        }}
                      >
                        <div style={{ marginBottom: 4 }}>
                          <span>💻 推荐语言: </span>
                          <span
                            style={{
                              background: '#1890ff',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: 3,
                              fontSize: 10,
                            }}
                          >
                            {status.recommended_language || 'Arduino'}
                          </span>
                        </div>
                        <div>
                          <span>🔧 支持语言: </span>
                          {status.supported_languages.map(lang => (
                            <span
                              key={lang}
                              style={{
                                background: '#e6f7ff',
                                color: '#1890ff',
                                padding: '1px 4px',
                                borderRadius: 2,
                                fontSize: 10,
                                marginRight: 4,
                              }}
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 未知设备类型提示 */}
                    {device.device_type === 'Unknown' && (
                      <div
                        style={{
                          background: '#fff7e6',
                          padding: 12,
                          borderRadius: 6,
                          marginBottom: 12,
                          fontSize: 12,
                          border: '1px solid #ffd591',
                        }}
                      >
                        <div style={{ color: '#d46b08', marginBottom: 4, fontWeight: 'bold' }}>
                          ⚠️ 未知设备类型
                        </div>
                        <div style={{ color: '#666', fontSize: 11 }}>
                          该设备未被识别为支持的开发板类型。
                          <br />
                          • 无法自动安装驱动程序
                          <br />
                          • 无法推荐编程语言
                          <br />
                          • 请确认设备是否为 Arduino、ESP32、micro:bit 等支持的设备
                        </div>
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {!driverInstalled && device.device_type !== 'Unknown' && (
                        <button
                          onClick={() => installDriver(device.id)}
                          style={{
                            background: '#ff4d4f',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          🔧 安装驱动
                        </button>
                      )}

                      {driverInstalled && !isConnected && device.device_type !== 'Unknown' && (
                        <button
                          onClick={() => connectDevice(device.id)}
                          style={{
                            background: '#1890ff',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          🔗 连接设备
                        </button>
                      )}

                      {isConnected && device.device_type !== 'Unknown' && (
                        <>
                          <button
                            onClick={() => disconnectDevice(device.id)}
                            style={{
                              background: '#ff7875',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12,
                            }}
                          >
                            🔌 断开连接
                          </button>

                          <button
                            onClick={() => openSerialMonitor(device.id)}
                            style={{
                              background: '#52c41a',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12,
                            }}
                          >
                            📊 串口监视器
                          </button>
                        </>
                      )}

                      {device.device_type !== 'Unknown' && (
                        <button
                          onClick={() => openDeviceConfiguration(device.id)}
                          style={{
                            background: '#faad14',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          ⚙️ 配置
                        </button>
                      )}

                      <button
                        onClick={() => refreshDeviceStatus(device.id)}
                        style={{
                          background: '#722ed1',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 12,
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
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
            }}
          >
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

      {/* 驱动安装信息对话框 */}
      {showDriverDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'white',
              padding: 24,
              borderRadius: 8,
              maxWidth: 500,
              maxHeight: 400,
              overflow: 'auto',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            <h3 style={{ marginTop: 0, color: '#1890ff' }}>🔧 驱动安装信息</h3>
            <div
              style={{
                background: '#f5f5f5',
                padding: 16,
                borderRadius: 4,
                marginBottom: 16,
                fontFamily: 'monospace',
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}
            >
              {driverInstallInfo}
            </div>
            <div style={{ textAlign: 'right' }}>
              <button
                onClick={() => {
                  setShowDriverDialog(false);
                  setDriverInstallInfo(null);
                }}
                style={{
                  background: '#1890ff',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 串口监视器模态框 */}
      {showSerialMonitor && (
        <Modal
          title={`串口监视器 - ${showSerialMonitor.port}`}
          open={true}
          onCancel={() => setShowSerialMonitor(null)}
          footer={null}
          width={800}
          height={600}
          style={{ height: '600px' }}
          bodyStyle={{ height: '500px', padding: 0 }}
        >
          <div>串口监视器功能暂时关闭</div>
        </Modal>
      )}

      {/* 设备配置模态框 */}
      <Modal
        title="设备配置管理"
        open={showConfiguration}
        onCancel={() => {
          setShowConfiguration(false);
          setSelectedDeviceForConfig(null);
        }}
        footer={null}
        width={1000}
        height={700}
        style={{ height: '700px' }}
        bodyStyle={{ height: '600px', padding: 0 }}
      >
        <div>设备配置功能暂时关闭</div>
      </Modal>
    </div>
  );
};

export default DevicesPage;
