import React from 'react';

const DevicesPage: React.FC = () => {
  return (
    <div style={{ padding: 24 }}>
      <h1>设备管理</h1>
      <div style={{ 
        background: 'white', 
        padding: 24, 
        borderRadius: 8, 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
      }}>
        <div style={{ marginBottom: 24 }}>
          <button style={{
            background: '#1890ff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 4,
            cursor: 'pointer'
          }}>
            🔍 扫描设备
          </button>
        </div>
        
        <h3>检测到的设备</h3>
        <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 16 }}>
          <div style={{ textAlign: 'center', padding: 32, color: '#8c8c8c' }}>
            <p>📱 暂未检测到设备</p>
            <p>请连接你的 Arduino、micro:bit 或其他支持的硬件设备</p>
          </div>
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