import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { 
  Card, 
  Tabs, 
  Button, 
  Input, 
  Select, 
  Space, 
  message, 
  Form, 
  Slider, 
  Checkbox, 
  List, 
  Tag,
  Modal,
  Tooltip,
  Alert
} from 'antd';
import { 
  Brain, 
  BookOpen, 
  Code, 
  Star, 
  Target, 
  Lightbulb,
  Rocket,
  Heart,
  Trophy
} from 'lucide-react';
import styled from 'styled-components';

const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

const PageContainer = styled.div`
  padding: 24px;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const ContentCard = styled(Card)`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
`;

const FeatureCard = styled(Card)`
  height: 100%;
  border-radius: 12px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
  }
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  margin-bottom: 16px;
`;

interface ProjectTemplate {
  id: string;
  title: string;
  description: string;
  age_range: [number, number];
  difficulty: string;
  device_types: string[];
  programming_language: string;
  estimated_time: string;
  learning_objectives: string[];
}

interface LearningPath {
  title: string;
  description: string;
  estimated_time: string;
  difficulty: string;
  steps: Array<{
    step_number: number;
    title: string;
    description: string;
    objectives: string[];
    estimated_time: string;
  }>;
  required_materials: string[];
}

const EnhancedAIPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('optimizer');
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 代码优化状态
  const [codeToOptimize, setCodeToOptimize] = useState('');
  const [optimizedCode, setOptimizedCode] = useState('');
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<string[]>([]);
  
  // 学习路径状态
  const [studentAge, setStudentAge] = useState(8);
  const [skillLevel, setSkillLevel] = useState('Beginner');
  const [interests, setInterests] = useState<string[]>([]);
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  
  // 项目模板状态
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  
  // AI配置状态
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadAgeAppropriateTemplates();
  }, [studentAge]);

  const configureAI = async (values: any) => {
    setLoading(true);
    try {
      await invoke('configure_enhanced_ai_service', {
        apiKey: values.apiKey,
        baseUrl: values.baseUrl
      });
      setIsConfigured(true);
      setConfigModalVisible(false);
      message.success('AI服务配置成功！');
    } catch (error) {
      message.error(`配置失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const optimizeCode = async () => {
    if (!codeToOptimize.trim()) {
      message.warning('请输入要优化的代码');
      return;
    }

    setLoading(true);
    try {
      const request = {
        code: codeToOptimize,
        language: 'arduino',
        device_type: 'Arduino',
        optimization_goals: ['Readability', 'BestPractices', 'ChildFriendly']
      };

      const response = await invoke('optimize_code', { request });
      setOptimizedCode(response.optimized_code);
      setOptimizationSuggestions(response.improvements.map((imp: any) => imp.description));
      message.success('代码优化完成！');
    } catch (error) {
      message.error(`优化失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const generateLearningPath = async () => {
    setLoading(true);
    try {
      const request = {
        student_age: studentAge,
        current_skill_level: skillLevel,
        interests,
        preferred_devices: ['Arduino', 'micro:bit'],
        learning_goals: ['掌握基础编程', '完成创意项目', '培养逻辑思维']
      };

      const response = await invoke('generate_learning_path', { request });
      setLearningPath(response);
      message.success('学习路径生成成功！');
    } catch (error) {
      message.error(`生成失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const loadAgeAppropriateTemplates = async () => {
    try {
      const templates = await invoke('get_age_appropriate_templates', { age: studentAge });
      setTemplates(templates);
    } catch (error) {
      console.error('加载模板失败:', error);
    }
  };

  const generateCustomTemplate = async () => {
    Modal.confirm({
      title: '创建自定义项目',
      content: (
        <Form layout="vertical">
          <Form.Item label="项目标题" name="title" rules={[{ required: true }]}>
            <Input placeholder="输入项目名称" />
          </Form.Item>
          <Form.Item label="项目描述" name="description" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="描述项目内容和目标" />
          </Form.Item>
          <Form.Item label="学习目标" name="objectives">
            <Select mode="tags" placeholder="添加学习目标">
              <Option value="LED控制">LED控制</Option>
              <Option value="传感器使用">传感器使用</Option>
              <Option value="循环结构">循环结构</Option>
              <Option value="条件判断">条件判断</Option>
            </Select>
          </Form.Item>
        </Form>
      ),
      onOk: async () => {
        // 这里应该获取表单数据并调用生成接口
        message.success('自定义项目创建成功！');
      }
    });
  };

  const skillLevelColors = {
    'Beginner': '#52c41a',
    'Novice': '#1890ff',
    'Intermediate': '#faad14',
    'Advanced': '#f5222d'
  };

  const interestOptions = [
    '游戏制作', '机器人', '音乐', '艺术', '科学实验', 
    '运动', '动画', '智能家居', '环保', '太空探索'
  ];

  return (
    <PageContainer>
      <ContentCard
        title={
          <Space>
            <Brain size={24} />
            智能编程助手
            {!isConfigured && (
              <Tag color="orange">需要配置AI服务</Tag>
            )}
          </Space>
        }
        extra={
          <Button type="primary" onClick={() => setConfigModalVisible(true)}>
            配置AI服务
          </Button>
        }
      >
        {!isConfigured && (
          <Alert
            message="AI功能未配置"
            description="请先配置AI服务以使用智能功能"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            action={
              <Button size="small" onClick={() => setConfigModalVisible(true)}>
                立即配置
              </Button>
            }
          />
        )}

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <Space>
                <Code size={16} />
                代码优化师
              </Space>
            }
            key="optimizer"
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, height: 500 }}>
              <Card title="输入代码" size="small">
                <TextArea
                  value={codeToOptimize}
                  onChange={(e) => setCodeToOptimize(e.target.value)}
                  placeholder="粘贴你的Arduino或MicroPython代码..."
                  style={{ height: 300, marginBottom: 16 }}
                />
                <Button 
                  type="primary" 
                  icon={<Brain size={16} />}
                  onClick={optimizeCode}
                  loading={loading}
                  disabled={!isConfigured}
                  block
                >
                  智能优化代码
                </Button>
              </Card>

              <Card title="优化结果" size="small">
                {optimizedCode ? (
                  <>
                    <pre style={{ 
                      background: '#f5f5f5', 
                      padding: 12, 
                      borderRadius: 4,
                      height: 200,
                      overflow: 'auto',
                      fontSize: 12
                    }}>
                      {optimizedCode}
                    </pre>
                    <div style={{ marginTop: 16 }}>
                      <h4>优化建议：</h4>
                      <List
                        size="small"
                        dataSource={optimizationSuggestions}
                        renderItem={(item, index) => (
                          <List.Item>
                            <Space>
                              <Lightbulb size={14} />
                              <span>{item}</span>
                            </Space>
                          </List.Item>
                        )}
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ 
                    height: 300, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#999'
                  }}>
                    优化后的代码将显示在这里
                  </div>
                )}
              </Card>
            </div>
          </TabPane>

          <TabPane
            tab={
              <Space>
                <BookOpen size={16} />
                学习规划师
              </Space>
            }
            key="planner"
          >
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
              <Card title="学生信息" size="small">
                <Form layout="vertical">
                  <Form.Item label="年龄">
                    <Slider
                      min={5}
                      max={12}
                      value={studentAge}
                      onChange={setStudentAge}
                      marks={{ 5: '5岁', 8: '8岁', 12: '12岁' }}
                    />
                  </Form.Item>

                  <Form.Item label="技能水平">
                    <Select value={skillLevel} onChange={setSkillLevel}>
                      <Option value="Beginner">初学者</Option>
                      <Option value="Novice">新手</Option>
                      <Option value="Intermediate">中级</Option>
                      <Option value="Advanced">高级</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item label="兴趣爱好">
                    <Checkbox.Group
                      options={interestOptions}
                      value={interests}
                      onChange={setInterests}
                    />
                  </Form.Item>

                  <Button 
                    type="primary" 
                    icon={<Target size={16} />}
                    onClick={generateLearningPath}
                    loading={loading}
                    disabled={!isConfigured}
                    block
                  >
                    生成学习路径
                  </Button>
                </Form>
              </Card>

              <Card title="个性化学习路径" size="small">
                {learningPath ? (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <h3>{learningPath.title}</h3>
                      <p>{learningPath.description}</p>
                      <Space>
                        <Tag color={skillLevelColors[learningPath.difficulty]}>
                          {learningPath.difficulty}
                        </Tag>
                        <Tag icon={<BookOpen size={12} />}>
                          {learningPath.estimated_time}
                        </Tag>
                      </Space>
                    </div>

                    <h4>学习步骤：</h4>
                    <List
                      dataSource={learningPath.steps}
                      renderItem={(step, index) => (
                        <List.Item>
                          <List.Item.Meta
                            avatar={
                              <div style={{ 
                                width: 32, 
                                height: 32, 
                                borderRadius: '50%', 
                                background: '#1890ff',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 14,
                                fontWeight: 'bold'
                              }}>
                                {step.step_number}
                              </div>
                            }
                            title={step.title}
                            description={
                              <div>
                                <p>{step.description}</p>
                                <Space wrap>
                                  {step.objectives.map((obj, i) => (
                                    <Tag key={i} color="blue" size="small">{obj}</Tag>
                                  ))}
                                </Space>
                              </div>
                            }
                          />
                        </List.Item>
                      )}
                    />

                    <div style={{ marginTop: 16 }}>
                      <h4>所需材料：</h4>
                      <Space wrap>
                        {learningPath.required_materials.map((material, index) => (
                          <Tag key={index} color="green">{material}</Tag>
                        ))}
                      </Space>
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    height: 400, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#999'
                  }}>
                    个性化学习路径将显示在这里
                  </div>
                )}
              </Card>
            </div>
          </TabPane>

          <TabPane
            tab={
              <Space>
                <Star size={16} />
                项目模板
              </Space>
            }
            key="templates"
          >
            <div style={{ marginBottom: 16 }}>
              <Space>
                <span>适合 {studentAge} 岁的项目模板：</span>
                <Button 
                  type="dashed" 
                  icon={<Rocket size={16} />}
                  onClick={generateCustomTemplate}
                  disabled={!isConfigured}
                >
                  创建自定义项目
                </Button>
              </Space>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
              gap: 16 
            }}>
              {templates.map((template) => (
                <FeatureCard
                  key={template.id}
                  title={
                    <Space>
                      <Trophy size={16} />
                      {template.title}
                    </Space>
                  }
                  extra={
                    <Tag color={skillLevelColors[template.difficulty]}>
                      {template.difficulty}
                    </Tag>
                  }
                  actions={[
                    <Tooltip title="查看详情">
                      <Button 
                        type="link" 
                        onClick={() => setSelectedTemplate(template)}
                      >
                        详情
                      </Button>
                    </Tooltip>,
                    <Tooltip title="使用模板">
                      <Button type="link">
                        使用
                      </Button>
                    </Tooltip>
                  ]}
                >
                  <p>{template.description}</p>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div>
                      <strong>适合年龄：</strong>
                      {template.age_range[0]}-{template.age_range[1]}岁
                    </div>
                    <div>
                      <strong>预估时间：</strong>
                      {template.estimated_time}
                    </div>
                    <div>
                      <strong>支持设备：</strong>
                      <Space wrap>
                        {template.device_types.map((device, index) => (
                          <Tag key={index} size="small">{device}</Tag>
                        ))}
                      </Space>
                    </div>
                    <div>
                      <strong>学习目标：</strong>
                      <div style={{ marginTop: 4 }}>
                        {template.learning_objectives.slice(0, 2).map((obj, index) => (
                          <Tag key={index} color="blue" size="small">{obj}</Tag>
                        ))}
                        {template.learning_objectives.length > 2 && (
                          <Tag size="small">+{template.learning_objectives.length - 2}个</Tag>
                        )}
                      </div>
                    </div>
                  </Space>
                </FeatureCard>
              ))}
            </div>
          </TabPane>
        </Tabs>
      </ContentCard>

      {/* AI配置模态框 */}
      <Modal
        title="配置AI服务"
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={configureAI}
        >
          <Form.Item
            name="apiKey"
            label="API密钥"
            rules={[{ required: true, message: '请输入API密钥' }]}
          >
            <Input.Password placeholder="输入DeepSeek API密钥" />
          </Form.Item>

          <Form.Item
            name="baseUrl"
            label="API地址（可选）"
          >
            <Input placeholder="https://api.deepseek.com" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              保存配置
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 项目详情模态框 */}
      <Modal
        title={selectedTemplate?.title}
        open={!!selectedTemplate}
        onCancel={() => setSelectedTemplate(null)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setSelectedTemplate(null)}>
            关闭
          </Button>,
          <Button key="use" type="primary">
            使用此模板
          </Button>
        ]}
      >
        {selectedTemplate && (
          <div>
            <p>{selectedTemplate.description}</p>
            <div style={{ marginBottom: 16 }}>
              <h4>学习目标：</h4>
              <Space wrap>
                {selectedTemplate.learning_objectives.map((obj, index) => (
                  <Tag key={index} color="blue">{obj}</Tag>
                ))}
              </Space>
            </div>
            <div>
              <h4>项目信息：</h4>
              <ul>
                <li>适合年龄：{selectedTemplate.age_range[0]}-{selectedTemplate.age_range[1]}岁</li>
                <li>难度等级：{selectedTemplate.difficulty}</li>
                <li>预估时间：{selectedTemplate.estimated_time}</li>
                <li>编程语言：{selectedTemplate.programming_language}</li>
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
};

export default EnhancedAIPage;