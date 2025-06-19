import React, { useState, useEffect } from 'react';
import { message, Select, Card, Button, Space, Modal } from 'antd';
import { RefreshCw, Play, Settings } from 'lucide-react';
import BlocklyWorkspace from '../components/BlocklyWorkspace';
// import UploadProgress from '../components/UploadProgress';
import { safeInvoke } from '../components/MockBackend';

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
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [preUploadCheck, setPreUploadCheck] = useState(false);
  const [currentCode, setCurrentCode] = useState<string>('');
  const [currentLanguage, setCurrentLanguage] = useState<string>('arduino');

  // 扫描设备
  const scanDevices = async () => {
    setIsLoading(true);
    try {
      const result = await safeInvoke('scan_devices');
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

  // 预上传检查
  const performPreUploadCheck = async (code: string, language: string) => {
    if (!selectedDevice) {
      message.error('请先选择设备');
      return false;
    }

    if (!code.trim()) {
      message.error('代码不能为空');
      return false;
    }

    try {
      // 检查设备连接状态
      const deviceStatus = await safeInvoke('get_device_status', { 
        device_id: selectedDevice.id 
      });
      
      if (!deviceStatus?.ready) {
        message.error('设备未准备就绪，请检查设备连接和驱动');
        return false;
      }

      // 检查语言兼容性
      if (!deviceStatus.supported_languages.includes(language)) {
        message.error(`设备不支持 ${language} 语言`);
        return false;
      }

      // 检查上传工具
      const tools = await safeInvoke('check_upload_tools');
      const requiredTool = language === 'arduino' ? 'arduino-cli' : 'mpremote';
      
      if (!tools[requiredTool]) {
        const install = await Modal.confirm({
          title: '缺少上传工具',
          content: `需要安装 ${requiredTool} 才能上传代码，是否自动安装？`,
        });
        
        if (install) {
          try {
            await safeInvoke('install_missing_tools');
            message.success('工具安装成功');
          } catch (err) {
            message.error('工具安装失败，请手动安装');
            return false;
          }
        } else {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('预上传检查失败:', error);
      message.error('设备状态检查失败');
      return false;
    }
  };

  // 上传代码到设备
  const handleUploadCode = async (code: string, language: string) => {
    // 先进行预上传检查
    const canUpload = await performPreUploadCheck(code, language);
    if (!canUpload) {
      return;
    }

    // 保存当前代码和语言
    setCurrentCode(code);
    setCurrentLanguage(language);

    // 显示上传进度
    setShowUploadProgress(true);
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
              icon={<RefreshCw size={16} />}
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

      {/* 上传进度对话框 */}
      {showUploadProgress && selectedDevice && (
        <Modal
          title={`上传代码到 ${selectedDevice.name}`}
          open={showUploadProgress}
          onCancel={() => {
            setShowUploadProgress(false);
            setCurrentCode('');
          }}
          footer={null}
        >
          <div>上传功能暂时关闭</div>
        </Modal>
      )}
    </div>
  );
};

export default EditorPage; 