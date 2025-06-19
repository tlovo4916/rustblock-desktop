import React, { useEffect, useState, useCallback } from 'react';
import { Button, Card, Select, message, Tooltip, Alert, List, Modal, Tag } from 'antd';
import { Play, Download, Save, Upload, Eye, CheckCircle, AlertTriangle } from 'lucide-react';
import styled from 'styled-components';
import { validateCode, ValidationResult, getValidationSummary } from '../utils/codeValidator';

const { Option } = Select;

const WorkspaceContainer = styled.div`
  display: flex;
  height: calc(100vh - 120px);
  gap: 16px;
`;

const BlocklyContainer = styled.div`
  flex: 1;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9f9f9;
`;

const CodePreviewContainer = styled.div`
  width: 400px;
  display: flex;
  flex-direction: column;
`;

const CodePreview = styled.pre`
  flex: 1;
  margin: 0;
  padding: 12px;
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  overflow: auto;
  white-space: pre-wrap;
`;

const ToolbarContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #d9d9d9;
`;

const ToolbarSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

interface BlocklyWorkspaceProps {
  selectedDevice?: any;
  onCodeGenerated?: (code: string, language: string) => void;
  onUploadCode?: (code: string, language: string) => void;
}

const BlocklyWorkspace: React.FC<BlocklyWorkspaceProps> = ({
  selectedDevice,
  onCodeGenerated,
  onUploadCode,
}) => {
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('arduino');
  const [showCodePreview, setShowCodePreview] = useState<boolean>(true);
  const [blocklyLoaded, setBlocklyLoaded] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidationDetails, setShowValidationDetails] = useState<boolean>(false);

  // 模拟代码生成
  const generateCode = useCallback(() => {
    const sampleCode =
      selectedLanguage === 'arduino'
        ? `// Arduino代码示例
void setup() {
  Serial.begin(9600);
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}`
        : `# MicroPython代码示例
from machine import Pin
import time

led = Pin(13, Pin.OUT)

while True:
    led.on()
    time.sleep(1)
    led.off()
    time.sleep(1)`;

    setGeneratedCode(sampleCode);
    onCodeGenerated?.(sampleCode, selectedLanguage);

    // 自动验证代码
    validateGeneratedCode(sampleCode);
  }, [selectedLanguage, onCodeGenerated]);

  // 验证代码
  const validateGeneratedCode = useCallback(
    (code: string) => {
      if (!code.trim()) {
        setValidationResult(null);
        return;
      }

      const result = validateCode(code, selectedLanguage);
      setValidationResult(result);

      if (!result.valid) {
        console.warn('代码验证失败:', result.errors);
      }
    },
    [selectedLanguage]
  );

  // 初始化时生成示例代码
  useEffect(() => {
    generateCode();
  }, [generateCode]);

  // 保存项目
  const saveProject = useCallback(() => {
    const projectData = {
      language: selectedLanguage,
      code: generatedCode,
      device: selectedDevice?.id || null,
      timestamp: Date.now(),
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rustblock_project_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    message.success('项目已保存');
  }, [selectedLanguage, generatedCode, selectedDevice]);

  // 加载项目
  const loadProject = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event: any) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = e => {
        try {
          const projectData = JSON.parse(e.target?.result as string);

          if (projectData.language) {
            setSelectedLanguage(projectData.language);
          }

          if (projectData.code) {
            setGeneratedCode(projectData.code);
          }

          message.success('项目已加载');
        } catch (error) {
          console.error('加载项目失败:', error);
          message.error('项目文件格式错误');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  // 运行代码
  const runCode = useCallback(() => {
    if (!generatedCode) {
      message.warning('请先生成代码');
      return;
    }

    if (!selectedDevice) {
      message.warning('请先选择设备');
      return;
    }

    // 验证代码
    const result = validateCode(generatedCode, selectedLanguage);

    if (!result.valid) {
      Modal.confirm({
        title: '代码存在错误',
        content: (
          <div>
            <p>{getValidationSummary(result)}</p>
            <p>是否仍要继续上传？</p>
          </div>
        ),
        onOk: () => onUploadCode?.(generatedCode, selectedLanguage),
        okText: '继续上传',
        cancelText: '取消',
      });
      return;
    }

    if (result.warnings.length > 0) {
      Modal.confirm({
        title: '代码有警告',
        content: (
          <div>
            <p>发现 {result.warnings.length} 个警告，建议检查后再上传。</p>
            <p>是否继续上传？</p>
          </div>
        ),
        onOk: () => onUploadCode?.(generatedCode, selectedLanguage),
        okText: '继续上传',
        cancelText: '取消',
      });
      return;
    }

    onUploadCode?.(generatedCode, selectedLanguage);
  }, [generatedCode, selectedLanguage, selectedDevice, onUploadCode]);

  // 下载代码
  const downloadCode = useCallback(() => {
    if (!generatedCode) {
      message.warning('请先生成代码');
      return;
    }

    const extension = selectedLanguage === 'arduino' ? '.ino' : '.py';
    const filename = `rustblock_code_${Date.now()}${extension}`;

    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    message.success('代码已下载');
  }, [generatedCode, selectedLanguage]);

  // 初始化 Blockly（异步加载）
  useEffect(() => {
    const initializeBlockly = async () => {
      try {
        // 动态导入 Blockly 以避免初始加载问题
        await import('blockly');
        setBlocklyLoaded(true);
        console.log('Blockly已加载');
      } catch (error) {
        console.warn('Blockly加载失败，将使用代码编辑模式:', error);
        setBlocklyLoaded(false);
      }
    };

    initializeBlockly();
  }, []);

  return (
    <div>
      {/* 工具栏 */}
      <ToolbarContainer>
        <ToolbarSection>
          <Select
            value={selectedLanguage}
            onChange={value => {
              setSelectedLanguage(value);
              generateCode();
            }}
            style={{ width: 120 }}
            size="small"
          >
            <Option value="arduino">Arduino</Option>
            <Option value="micropython">MicroPython</Option>
          </Select>

          <Button
            icon={<Eye size={16} />}
            size="small"
            type={showCodePreview ? 'primary' : 'default'}
            onClick={() => setShowCodePreview(!showCodePreview)}
          >
            代码预览
          </Button>

          {validationResult && (
            <Button
              icon={
                validationResult.valid ? <CheckCircle size={16} /> : <AlertTriangle size={16} />
              }
              size="small"
              type={validationResult.valid ? 'default' : 'primary'}
              danger={!validationResult.valid}
              onClick={() => setShowValidationDetails(true)}
            >
              {validationResult.valid ? '验证通过' : '有问题'}
            </Button>
          )}
        </ToolbarSection>

        <ToolbarSection>
          <Tooltip title="保存项目">
            <Button icon={<Save size={16} />} size="small" onClick={saveProject} />
          </Tooltip>

          <Tooltip title="加载项目">
            <Button icon={<Upload size={16} />} size="small" onClick={loadProject} />
          </Tooltip>

          <Tooltip title="下载代码">
            <Button icon={<Download size={16} />} size="small" onClick={downloadCode} />
          </Tooltip>

          <Button
            icon={<Play size={16} />}
            type="primary"
            size="small"
            onClick={runCode}
            disabled={!selectedDevice}
          >
            运行
          </Button>
        </ToolbarSection>
      </ToolbarContainer>

      {/* 主工作区 */}
      <WorkspaceContainer>
        <BlocklyContainer>
          {blocklyLoaded ? (
            <div style={{ textAlign: 'center', color: '#666' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🧩</div>
              <h3>可视化编程工作区</h3>
              <p>Blockly积木编程界面正在开发中...</p>
              <p style={{ fontSize: 12, color: '#999' }}>将在这里显示拖拽式积木编程界面</p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#666' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
              <h3>快速代码模式</h3>
              <p>正在准备可视化编程环境...</p>
              <Button type="primary" onClick={generateCode} style={{ marginTop: 16 }}>
                生成示例代码
              </Button>
            </div>
          )}
        </BlocklyContainer>

        {showCodePreview && (
          <CodePreviewContainer>
            <Card
              title={`生成的${selectedLanguage === 'arduino' ? 'Arduino' : 'MicroPython'}代码`}
              size="small"
              style={{ height: '100%' }}
              bodyStyle={{ height: 'calc(100% - 48px)', padding: 0 }}
              extra={
                <Button size="small" onClick={generateCode}>
                  重新生成
                </Button>
              }
            >
              {/* 验证结果提示 */}
              {validationResult && (
                <div style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>
                  {validationResult.valid ? (
                    <Alert message="代码验证通过" type="success" showIcon />
                  ) : (
                    <Alert
                      message={getValidationSummary(validationResult)}
                      type="error"
                      showIcon
                      action={
                        <Button size="small" onClick={() => setShowValidationDetails(true)}>
                          查看详情
                        </Button>
                      }
                    />
                  )}

                  {validationResult.warnings.length > 0 && validationResult.valid && (
                    <Alert
                      message={`${validationResult.warnings.length} 个警告`}
                      type="warning"
                      showIcon
                      style={{ marginTop: 4 }}
                      action={
                        <Button size="small" onClick={() => setShowValidationDetails(true)}>
                          查看详情
                        </Button>
                      }
                    />
                  )}
                </div>
              )}

              <CodePreview>{generatedCode || '// 请点击"重新生成"按钮生成示例代码'}</CodePreview>
            </Card>
          </CodePreviewContainer>
        )}
      </WorkspaceContainer>

      {/* 验证详情模态框 */}
      <Modal
        title="代码验证详情"
        open={showValidationDetails}
        onCancel={() => setShowValidationDetails(false)}
        footer={[
          <Button key="close" onClick={() => setShowValidationDetails(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {validationResult && (
          <div>
            {/* 错误列表 */}
            {validationResult.errors.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ color: '#ff4d4f', marginBottom: 8 }}>
                  ❌ 错误 ({validationResult.errors.length})
                </h4>
                <List
                  size="small"
                  dataSource={validationResult.errors}
                  renderItem={error => (
                    <List.Item
                      style={{
                        border: '1px solid #ffccc7',
                        borderRadius: 4,
                        marginBottom: 4,
                        padding: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#ff4d4f' }}>
                          第 {error.line} 行，第 {error.column} 列
                        </div>
                        <div>{error.message}</div>
                        {error.code && (
                          <Tag color="red" style={{ marginTop: 4 }}>
                            {error.code}
                          </Tag>
                        )}
                      </div>
                    </List.Item>
                  )}
                />
              </div>
            )}

            {/* 警告列表 */}
            {validationResult.warnings.length > 0 && (
              <div>
                <h4 style={{ color: '#faad14', marginBottom: 8 }}>
                  ⚠️ 警告 ({validationResult.warnings.length})
                </h4>
                <List
                  size="small"
                  dataSource={validationResult.warnings}
                  renderItem={warning => (
                    <List.Item
                      style={{
                        border: '1px solid #ffe7ba',
                        borderRadius: 4,
                        marginBottom: 4,
                        padding: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#faad14' }}>
                          第 {warning.line} 行，第 {warning.column} 列
                        </div>
                        <div>{warning.message}</div>
                        {warning.code && (
                          <Tag color="orange" style={{ marginTop: 4 }}>
                            {warning.code}
                          </Tag>
                        )}
                      </div>
                    </List.Item>
                  )}
                />
              </div>
            )}

            {/* 无问题时的提示 */}
            {validationResult.errors.length === 0 && validationResult.warnings.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#52c41a' }}>
                <CheckCircle size={48} style={{ marginBottom: 16 }} />
                <h3>代码验证通过</h3>
                <p>未发现任何问题，可以安全上传到设备。</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BlocklyWorkspace;
