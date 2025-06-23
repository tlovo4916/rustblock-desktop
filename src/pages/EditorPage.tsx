import React, { useState, useEffect } from 'react';
import { message, Select, Card, Button, Space, Modal } from 'antd';
import { RefreshCw, Play, Settings } from 'lucide-react';
import BlocklyWorkspace from '../components/BlocklyWorkspace';
// import UploadProgress from '../components/UploadProgress';
import { safeInvoke } from '../components/MockBackend';
import { logger } from '../utils/logger';
import PageContainer from '../components/PageContainer';
import { useTranslation } from '../contexts/LocaleContext';

const { Option } = Select;

interface Device {
  id: string;
  name: string;
  device_type: string;
  port: string;
  connected: boolean;
}

const EditorPage: React.FC = () => {
  const { t } = useTranslation();
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
      logger.error('扫描设备失败:', error);
      message.error(t('common.error') + ': ' + t('devices.refresh'));
    } finally {
      setIsLoading(false);
    }
  };

  // 预上传检查
  const performPreUploadCheck = async (code: string, language: string) => {
    if (!selectedDevice) {
      message.error(t('editor.selectDevice'));
      return false;
    }

    if (!code.trim()) {
      message.error(t('editor.emptyCode'));
      return false;
    }

    try {
      // 检查设备连接状态
      const deviceStatus = await safeInvoke('get_device_status', {
        device_id: selectedDevice.id,
      });

      if (!deviceStatus?.ready) {
        message.error(t('editor.deviceNotReady'));
        return false;
      }

      // 检查语言兼容性
      if (!deviceStatus.supported_languages.includes(language)) {
        message.error(t('editor.languageNotSupported').replace('{language}', language));
        return false;
      }

      // 检查上传工具
      const tools = await safeInvoke('check_upload_tools');
      const requiredTool = language === 'arduino' ? 'arduino-cli' : 'mpremote';

      if (!tools[requiredTool]) {
        const install = await Modal.confirm({
          title: t('editor.missingTool'),
          content: t('editor.missingToolContent').replace('{tool}', requiredTool),
        });

        if (install) {
          try {
            await safeInvoke('install_missing_tools');
            message.success(t('editor.toolInstalled'));
          } catch (err) {
            message.error(t('editor.toolInstallFailed'));
            return false;
          }
        } else {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('预上传检查失败:', error);
      message.error(t('editor.deviceCheckFailed'));
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
    logger.debug(`生成了${language}代码:`, code);
  };

  useEffect(() => {
    scanDevices();
  }, []);

  return (
    <PageContainer>
      <Card
        title={t('editor.title')}
        extra={
          <Space>
            <Select
              value={selectedDevice?.id}
              onChange={deviceId => {
                const device = devices.find(d => d.id === deviceId);
                setSelectedDevice(device || null);
              }}
              placeholder={t('editor.selectDevice')}
              style={{ width: 200 }}
              loading={isLoading}
            >
              {devices.map(device => (
                <Option key={device.id} value={device.id}>
                  {device.name} ({device.port})
                </Option>
              ))}
            </Select>

            <Button icon={<RefreshCw size={16} />} onClick={scanDevices} loading={isLoading}>
              {t('devices.refresh')}
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        {selectedDevice ? (
          <div style={{ color: '#52c41a' }}>
            ✓ {t('editor.deviceSelected')}: {selectedDevice.name} ({selectedDevice.device_type})
          </div>
        ) : (
          <div style={{ color: '#faad14' }}>⚠️ {t('editor.connectAndSelect')}</div>
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
          title={t('editor.uploadingTo').replace('{device}', selectedDevice.name)}
          open={showUploadProgress}
          onCancel={() => {
            setShowUploadProgress(false);
            setCurrentCode('');
          }}
          footer={null}
        >
          <div>{t('editor.uploadDisabled')}</div>
        </Modal>
      )}
    </PageContainer>
  );
};

export default EditorPage;
