import React, { useState, useEffect } from 'react';
import { Modal, Progress, Steps, message } from 'antd';
import { invoke } from '@tauri-apps/api/core';

interface UploadProgressProps {
  visible: boolean;
  deviceName: string;
  language: string;
  code?: string;
  deviceId?: string;
  onClose: () => void;
  onCancel?: () => void;
}

interface UploadStep {
  title: string;
  status: 'wait' | 'process' | 'finish' | 'error';
  description?: string;
  progress?: number;
}

const UploadProgress: React.FC<UploadProgressProps> = ({
  visible,
  deviceName,
  language,
  code,
  deviceId,
  onClose,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadSteps, setUploadSteps] = useState<UploadStep[]>([
    { title: '准备上传', status: 'wait' },
    { title: '编译代码', status: 'wait' },
    { title: '上传固件', status: 'wait' },
    { title: '验证上传', status: 'wait' },
  ]);
  const [logs, setLogs] = useState<string[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // 添加日志
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // 更新步骤状态
  const updateStep = (index: number, updates: Partial<UploadStep>) => {
    setUploadSteps(prev => {
      const newSteps = [...prev];
      newSteps[index] = { ...newSteps[index], ...updates };
      return newSteps;
    });
  };

  // 模拟上传过程
  const startUpload = async () => {
    if (!code || !deviceId) {
      message.error('缺少必要的上传参数');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // 步骤1: 准备上传
      setCurrentStep(0);
      updateStep(0, { status: 'process' });
      addLog('正在准备上传环境...');

      // 检查设备连接
      const deviceStatus = await invoke<any>('get_device_status', { deviceId });
      if (!deviceStatus.ready) {
        throw new Error('设备未就绪');
      }
      addLog('设备连接正常');

      updateStep(0, { status: 'finish', description: '准备完成' });
      setOverallProgress(25);

      // 步骤2: 编译代码
      setCurrentStep(1);
      updateStep(1, { status: 'process' });
      addLog(`正在编译 ${language} 代码...`);

      const compileResult = await invoke<any>('compile_code', {
        code,
        language,
        deviceType: deviceStatus.device_info.device_type,
      });

      if (compileResult.success) {
        addLog('编译成功');
        addLog(`二进制文件大小: ${compileResult.binary_size} bytes`);
        updateStep(1, { status: 'finish', description: '编译成功' });
        setOverallProgress(50);
      } else {
        throw new Error(compileResult.error || '编译失败');
      }

      // 步骤3: 上传固件
      setCurrentStep(2);
      updateStep(2, { status: 'process' });
      addLog('正在上传固件到设备...');

      // 模拟进度更新
      let uploadProgress = 0;
      const progressInterval = setInterval(() => {
        uploadProgress += 10;
        if (uploadProgress <= 100) {
          updateStep(2, { progress: uploadProgress });
          setOverallProgress(50 + uploadProgress * 0.4);
          addLog(`上传进度: ${uploadProgress}%`);
        }
      }, 500);

      // 实际上传
      const uploadResult = await invoke<any>('upload_firmware', {
        deviceId,
        firmwarePath: compileResult.firmware_path,
        port: deviceStatus.device_info.port,
      });

      clearInterval(progressInterval);

      if (uploadResult.success) {
        updateStep(2, { status: 'finish', description: '上传完成', progress: 100 });
        setOverallProgress(90);
        addLog('固件上传成功');
      } else {
        throw new Error(uploadResult.error || '上传失败');
      }

      // 步骤4: 验证上传
      setCurrentStep(3);
      updateStep(3, { status: 'process' });
      addLog('正在验证上传结果...');

      // 等待设备重启
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 检查设备是否正常运行
      const verifyResult = await invoke<any>('verify_upload', { deviceId });

      if (verifyResult.success) {
        updateStep(3, { status: 'finish', description: '验证成功' });
        setOverallProgress(100);
        addLog('上传验证成功！设备正在运行新程序');

        // 显示成功消息
        message.success('代码上传成功！');

        // 延迟关闭
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        throw new Error(verifyResult.error || '验证失败');
      }
    } catch (error: any) {
      console.error('上传失败:', error);
      setUploadError(error.message || '未知错误');

      // 标记当前步骤为错误
      updateStep(currentStep, { status: 'error', description: error.message });

      // 添加错误日志
      addLog(`错误: ${error.message}`);

      // 显示错误消息
      message.error(`上传失败: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // 处理取消
  const handleCancel = () => {
    if (isUploading) {
      Modal.confirm({
        title: '确认取消',
        content: '正在上传中，确定要取消吗？',
        onOk: () => {
          // 这里应该调用后端API来取消上传
          invoke('cancel_upload').catch(console.error);
          onCancel?.();
        },
      });
    } else {
      onCancel?.();
    }
  };

  useEffect(() => {
    if (visible && code && deviceId) {
      startUpload();
    }
  }, [visible]);

  return (
    <Modal
      title={`上传代码到 ${deviceName}`}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={700}
      maskClosable={false}
    >
      <div style={{ padding: '20px 0' }}>
        {/* 总体进度 */}
        <div style={{ marginBottom: 24 }}>
          <Progress
            percent={overallProgress}
            status={uploadError ? 'exception' : overallProgress === 100 ? 'success' : 'active'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
        </div>

        {/* 步骤指示器 */}
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          {uploadSteps.map((step, index) => (
            <Steps.Step
              key={index}
              title={step.title}
              description={step.description}
              status={step.status}
            />
          ))}
        </Steps>

        {/* 详细进度（如果当前步骤有进度） */}
        {uploadSteps[currentStep]?.progress !== undefined && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 8 }}>{uploadSteps[currentStep].title} 进度:</div>
            <Progress percent={uploadSteps[currentStep].progress} size="small" status="active" />
          </div>
        )}

        {/* 日志输出 */}
        <div
          style={{
            background: '#f5f5f5',
            border: '1px solid #d9d9d9',
            borderRadius: 4,
            padding: 12,
            height: 200,
            overflowY: 'auto',
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: 12,
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: '#999' }}>等待开始...</div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                style={{
                  marginBottom: 4,
                  color: log.includes('错误') ? '#ff4d4f' : '#333',
                }}
              >
                {log}
              </div>
            ))
          )}
        </div>

        {/* 错误提示 */}
        {uploadError && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: '#fff2f0',
              border: '1px solid #ffccc7',
              borderRadius: 4,
              color: '#ff4d4f',
            }}
          >
            <strong>上传失败:</strong> {uploadError}
          </div>
        )}

        {/* 操作按钮 */}
        <div style={{ marginTop: 24, textAlign: 'right' }}>
          {isUploading ? (
            <button
              onClick={handleCancel}
              style={{
                padding: '8px 16px',
                background: '#ff4d4f',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              取消上传
            </button>
          ) : (
            <>
              {uploadError && (
                <button
                  onClick={startUpload}
                  style={{
                    padding: '8px 16px',
                    background: '#1890ff',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    marginRight: 8,
                  }}
                >
                  重试
                </button>
              )}
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  background: overallProgress === 100 ? '#52c41a' : '#d9d9d9',
                  color: overallProgress === 100 ? 'white' : '#666',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                {overallProgress === 100 ? '完成' : '关闭'}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default UploadProgress;
