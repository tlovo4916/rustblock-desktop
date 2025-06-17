import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { message, Select, Card, Button, Space } from 'antd';
import { Refresh } from 'lucide-react';
import BlocklyWorkspace from '../components/BlocklyWorkspace';

const { Option } = Select;

interface Device {
  id: string;
  name: string;
  device_type: string;
  port: string;
  connected: boolean;
}

const EditorPage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 扫描设备
  const scanDevices = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<Device[]>('scan_devices');
      setDevices(result);
      if (result.length > 0 && !selectedDevice) {
        setSelectedDevice(result[0]);
      }
    } catch (error) {
      console.error('扫描设备失败:', error);
      message.error('扫描设备失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 上传代码到设备
  const handleUploadCode = async (code: string, language: string) => {
    if (!selectedDevice) {
      message.error('请先选择设备');
      return;
    }

    try {
      const uploadOptions = {
        device_id: selectedDevice.id,
        code: code,
        language: language,
        board_type: selectedDevice.device_type
      };

      const result = await invoke<string>('upload_code', { options: uploadOptions });
      message.success('代码上传成功！');
      console.log('上传结果:', result);
    } catch (error) {
      console.error('代码上传失败:', error);
      message.error(`代码上传失败: ${error}`);
    }
  };

  // 代码生成回调
  const handleCodeGenerated = (code: string, language: string) => {
    console.log(`生成了${language}代码:`, code);
  };

  useEffect(() => {
    scanDevices();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <Card 
        title="可视化编程环境"
        extra={
          <Space>
            <Select
              value={selectedDevice?.id}
              onChange={(deviceId) => {
                const device = devices.find(d => d.id === deviceId);
                setSelectedDevice(device || null);
              }}
              placeholder="选择设备"
              style={{ width: 200 }}
              loading={isLoading}
            >
              {devices.map(device => (
                <Option key={device.id} value={device.id}>
                  {device.name} ({device.port})
                </Option>
              ))}
            </Select>
            
            <Button
              icon={<Refresh size={16} />}
              onClick={scanDevices}
              loading={isLoading}
            >
              刷新设备
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        {selectedDevice ? (
          <div style={{ color: '#52c41a' }}>
            ✓ 已选择设备: {selectedDevice.name} ({selectedDevice.device_type})
          </div>
        ) : (
          <div style={{ color: '#faad14' }}>
            ⚠️ 请连接设备并选择目标设备
          </div>
        )}
      </Card>

      <Card style={{ minHeight: 'calc(100vh - 250px)' }}>
        <BlocklyWorkspace
          selectedDevice={selectedDevice}
          onCodeGenerated={handleCodeGenerated}
          onUploadCode={handleUploadCode}
        />
      </Card>
    </div>
  );
};

export default EditorPage; 