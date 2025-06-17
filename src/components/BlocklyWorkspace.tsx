import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Blockly from 'blockly';
import { zhHans } from 'blockly/msg/zh-hans';
import { Button, Card, Tabs, Select, message, Space, Tooltip } from 'antd';
import { Play, Download, Save, Upload, Settings, Code, Eye } from 'lucide-react';
import styled from 'styled-components';

import { registerCustomBlocks, toolboxCategories } from '../blockly/blocks/custom_blocks';
import { generateArduinoCode } from '../blockly/generators/arduino_generator';
import { generateMicroPythonCode } from '../blockly/generators/micropython_generator';

const { TabPane } = Tabs;
const { Option } = Select;

// 设置Blockly为中文
Blockly.setLocale(zhHans);

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
  onUploadCode
}) => {
  const blocklyDivRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('arduino');
  const [showCodePreview, setShowCodePreview] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // 创建工具箱配置
  const createToolbox = useCallback(() => {
    const toolbox = {
      kind: 'categoryToolbox',
      contents: toolboxCategories.map(category => {
        if (category.custom) {
          return {
            kind: 'category',
            name: category.name,
            colour: category.colour,
            custom: category.custom
          };
        } else {
          return {
            kind: 'category',
            name: category.name,
            colour: category.colour,
            contents: category.blocks.map(block => {
              if (typeof block === 'string') {
                return { kind: 'block', type: block };
              } else {
                return { kind: 'block', type: block.type };
              }
            })
          };
        }
      })
    };
    return toolbox;
  }, []);

  // 初始化Blockly工作区
  const initializeWorkspace = useCallback(() => {
    if (!blocklyDivRef.current) return;

    // 注册自定义块
    registerCustomBlocks();

    // 工作区配置
    const workspaceConfig = {
      toolbox: createToolbox(),
      collapse: true,
      comments: true,
      disable: true,
      maxBlocks: Infinity,
      trashcan: true,
      horizontalLayout: false,
      toolboxPosition: 'start',
      css: true,
      media: 'https://blockly-demo.appspot.com/static/media/',
      rtl: false,
      scrollbars: true,
      sounds: true,
      oneBasedIndex: true,
      grid: {
        spacing: 20,
        length: 3,
        colour: '#ccc',
        snap: true
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 1.0,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2
      }
    };

    // 创建工作区
    const workspace = Blockly.inject(blocklyDivRef.current, workspaceConfig);
    workspaceRef.current = workspace;

    // 监听工作区变化
    workspace.addChangeListener((event: any) => {
      if (event.type === Blockly.Events.FINISHED_LOADING ||
          event.type === Blockly.Events.BLOCK_CREATE ||
          event.type === Blockly.Events.BLOCK_DELETE ||
          event.type === Blockly.Events.BLOCK_CHANGE ||
          event.type === Blockly.Events.BLOCK_MOVE) {
        // 自动生成代码预览
        generateCodePreview();
      }
    });

    // 初始化示例程序
    loadExampleProgram();
  }, [createToolbox]);

  // 生成代码预览
  const generateCodePreview = useCallback(() => {
    if (!workspaceRef.current || isGenerating) return;
    
    setIsGenerating(true);
    
    try {
      let code = '';
      
      if (selectedLanguage === 'arduino') {
        code = generateArduinoCode(workspaceRef.current);
      } else if (selectedLanguage === 'micropython') {
        const deviceType = selectedDevice?.device_type?.toLowerCase() || 'microbit';
        code = generateMicroPythonCode(workspaceRef.current, deviceType);
      }
      
      setGeneratedCode(code);
      onCodeGenerated?.(code, selectedLanguage);
    } catch (error) {
      console.error('代码生成失败:', error);
      message.error('代码生成失败');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedLanguage, selectedDevice, onCodeGenerated, isGenerating]);

  // 加载示例程序
  const loadExampleProgram = useCallback(() => {
    if (!workspaceRef.current) return;

    const exampleXml = `
    <xml xmlns="https://developers.google.com/blockly/xml">
      <block type="event_when_started" id="start_block" x="50" y="50">
        <statement name="DO">
          <block type="display_show_text" id="show_hello">
            <field name="TEXT">Hello!</field>
            <next>
              <block type="led_blink" id="blink_led">
                <field name="PIN">13</field>
                <field name="TIMES">3</field>
              </block>
            </next>
          </block>
        </statement>
      </block>
    </xml>`;

    try {
      const xml = Blockly.utils.xml.textToDom(exampleXml);
      Blockly.Xml.domToWorkspace(xml, workspaceRef.current);
    } catch (error) {
      console.error('加载示例程序失败:', error);
    }
  }, []);

  // 保存项目
  const saveProject = useCallback(() => {
    if (!workspaceRef.current) return;

    try {
      const xml = Blockly.Xml.workspaceToDom(workspaceRef.current);
      const xmlText = Blockly.Xml.domToText(xml);
      
      const projectData = {
        xml: xmlText,
        language: selectedLanguage,
        device: selectedDevice?.id || null,
        timestamp: Date.now()
      };

      // 下载项目文件
      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rustblock_project_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      message.success('项目已保存');
    } catch (error) {
      console.error('保存项目失败:', error);
      message.error('保存项目失败');
    }
  }, [selectedLanguage, selectedDevice]);

  // 加载项目
  const loadProject = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event: any) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const projectData = JSON.parse(e.target?.result as string);
          
          if (workspaceRef.current && projectData.xml) {
            workspaceRef.current.clear();
            const xml = Blockly.utils.xml.textToDom(projectData.xml);
            Blockly.Xml.domToWorkspace(xml, workspaceRef.current);
            
            if (projectData.language) {
              setSelectedLanguage(projectData.language);
            }
            
            message.success('项目已加载');
          }
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

  // 组件初始化
  useEffect(() => {
    initializeWorkspace();

    return () => {
      if (workspaceRef.current) {
        workspaceRef.current.dispose();
      }
    };
  }, [initializeWorkspace]);

  // 语言变化时重新生成代码
  useEffect(() => {
    generateCodePreview();
  }, [selectedLanguage, generateCodePreview]);

  return (
    <div>
      {/* 工具栏 */}
      <ToolbarContainer>
        <ToolbarSection>
          <Select
            value={selectedLanguage}
            onChange={setSelectedLanguage}
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
          <div ref={blocklyDivRef} style={{ height: '100%', width: '100%' }} />
        </BlocklyContainer>

        {showCodePreview && (
          <CodePreviewContainer>
            <Card
              title={`生成的${selectedLanguage === 'arduino' ? 'Arduino' : 'MicroPython'}代码`}
              size="small"
              style={{ height: '100%' }}
              bodyStyle={{ height: 'calc(100% - 48px)', padding: 0 }}
            >
              <CodePreview>{generatedCode || '// 请在左侧拖拽积木块来创建程序'}</CodePreview>
            </Card>
          </CodePreviewContainer>
        )}
      </WorkspaceContainer>
    </div>
  );
};

export default BlocklyWorkspace;