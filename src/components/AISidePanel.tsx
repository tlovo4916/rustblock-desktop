import React, { useState, useEffect, useRef } from 'react';
import { message, Input, Button, Divider, Empty, Spin, Dropdown, Menu, Modal, List, Typography, Tooltip, Select } from 'antd';
import { SendOutlined, BulbOutlined, HistoryOutlined, PlusOutlined, DeleteOutlined, MoreOutlined, MessageOutlined, RobotOutlined } from '@ant-design/icons';
import { safeInvoke } from '../utils/tauri';
import { logger } from '../utils/logger';
import { useTranslation } from '../contexts/LocaleContext';
import { useTheme } from '../contexts/ThemeContext';
import AIIcon from './AIIcon';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const { TextArea } = Input;
const { Text } = Typography;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

const AISidePanel: React.FC = () => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('https://api.deepseek.com');
  const [selectedModel, setSelectedModel] = useState('deepseek-chat');
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>({});
  const [typingContent, setTypingContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 支持的模型列表
  const supportedModels = [
    { value: 'deepseek-chat', name: 'DeepSeek Chat (V3)', baseUrl: 'https://api.deepseek.com' },
    { value: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)', baseUrl: 'https://api.deepseek.com' },
    { value: 'gpt-4o', name: 'GPT-4o', baseUrl: 'https://api.openai.com' },
    { value: 'gpt-4o-mini', name: 'GPT-4o Mini', baseUrl: 'https://api.openai.com' },
  ];

  // 创建新会话
  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: t('ai.newChat'),
      messages: [
        {
          role: 'assistant',
          content: t('ai.welcomeMessage'),
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setSessions(prev => {
      const updatedSessions = [newSession, ...prev];
      saveSessionsToStorage(updatedSessions);
      return updatedSessions;
    });
    
    setCurrentSessionId(newSession.id);
    setMessages(newSession.messages);
    setShowHistory(false);
    
    return newSession;
  };

  // 保存会话到localStorage
  const saveSessionsToStorage = (sessionsToSave: ChatSession[]) => {
    try {
      localStorage.setItem('ai_chat_sessions', JSON.stringify(sessionsToSave));
    } catch (error) {
      logger.error('保存会话失败', error);
    }
  };

  // 加载API配置和历史会话
  useEffect(() => {
    const loadConfig = () => {
      const savedModel = localStorage.getItem('ai_model') || 'deepseek-chat';
      const savedApiUrl = localStorage.getItem('ai_api_url') || 'https://api.deepseek.com';
      
      // 加载所有提供商的API密钥
      const keys: Record<string, string> = {
        deepseek: localStorage.getItem('deepseek_api_key') || '',
        openai: localStorage.getItem('openai_api_key') || '',
      };
      setProviderKeys(keys);
      
      // 根据当前模型设置对应的API密钥
      const provider = savedApiUrl.includes('deepseek') ? 'deepseek' : 'openai';
      setApiKey(keys[provider] || '');
      setApiUrl(savedApiUrl);
      setSelectedModel(savedModel);
    };

    const loadSessions = () => {
      try {
        const savedSessions = localStorage.getItem('ai_chat_sessions');
        if (savedSessions) {
          const parsedSessions = JSON.parse(savedSessions);
          // 转换日期字符串为Date对象
          const sessionsWithDates = parsedSessions.map((session: any) => ({
            ...session,
            messages: session.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })),
            createdAt: new Date(session.createdAt),
            updatedAt: new Date(session.updatedAt),
          }));
          setSessions(sessionsWithDates);
          
          // 加载最新的会话
          if (sessionsWithDates.length > 0) {
            const latestSession = sessionsWithDates[0];
            setCurrentSessionId(latestSession.id);
            setMessages(latestSession.messages);
          } else {
            // 没有历史会话，直接使用createNewSession
            setTimeout(() => createNewSession(), 0);
          }
        } else {
          // localStorage中没有保存的会话
          setTimeout(() => createNewSession(), 0);
        }
      } catch (error) {
        logger.error('加载会话失败', error);
        // 出错时创建新会话
        setTimeout(() => createNewSession(), 0);
      }
    };

    loadConfig();
    loadSessions();

    // 监听配置更新事件
    const handleConfigUpdate = (event: any) => {
      if (event.detail) {
        const { apiKey, apiUrl, model, providerKeys } = event.detail;
        setApiKey(apiKey || '');
        setApiUrl(apiUrl || '');
        setSelectedModel(model || 'deepseek-chat');
        if (providerKeys) {
          setProviderKeys(providerKeys);
        }
      }
    };

    window.addEventListener('ai-config-updated', handleConfigUpdate);
    return () => {
      window.removeEventListener('ai-config-updated', handleConfigUpdate);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingContent]);

  // 打字机效果函数
  const typeWriterEffect = (text: string, onComplete: () => void) => {
    setIsTyping(true);
    setTypingContent('');
    
    // 将字符串转换为字符数组，正确处理emoji和Unicode字符
    const chars = Array.from(text);
    let index = 0;

    const typeNext = () => {
      if (index < chars.length) {
        setTypingContent(prev => prev + chars[index]);
        index++;
        typingTimeoutRef.current = setTimeout(typeNext, 15);
      } else {
        setIsTyping(false);
        onComplete();
      }
    };

    typeNext();
  };

  // 切换会话
  const switchSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      setShowHistory(false);
    }
  };

  // 删除会话
  const deleteSession = (sessionId: string) => {
    Modal.confirm({
      title: t('ai.confirmDelete'),
      content: t('ai.deleteSessionTip'),
      onOk: () => {
        setSessions(prev => {
          const updatedSessions = prev.filter(s => s.id !== sessionId);
          
          // 如果删除后没有会话了，创建一个新的
          if (updatedSessions.length === 0) {
            const newSession: ChatSession = {
              id: Date.now().toString(),
              title: t('ai.newChat'),
              messages: [
                {
                  role: 'assistant',
                  content: t('ai.welcomeMessage'),
                  timestamp: new Date(),
                },
              ],
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            
            const finalSessions = [newSession];
            saveSessionsToStorage(finalSessions);
            
            // 设置新会话为当前会话
            setCurrentSessionId(newSession.id);
            setMessages(newSession.messages);
            setShowHistory(false);
            
            return finalSessions;
          } else {
            // 还有其他会话
            saveSessionsToStorage(updatedSessions);
            
            // 如果删除的是当前会话，切换到第一个
            if (currentSessionId === sessionId) {
              setCurrentSessionId(updatedSessions[0].id);
              setMessages(updatedSessions[0].messages);
            }
            
            return updatedSessions;
          }
        });
      },
    });
  };

  // 更新当前会话
  const updateCurrentSession = (newMessages: Message[]) => {
    const updatedSessions = sessions.map(session => {
      if (session.id === currentSessionId) {
        const firstUserMessage = newMessages.find(msg => msg.role === 'user');
        return {
          ...session,
          messages: newMessages,
          title: firstUserMessage ? firstUserMessage.content.slice(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '') : session.title,
          updatedAt: new Date(),
        };
      }
      return session;
    });
    
    setSessions(updatedSessions);
    saveSessionsToStorage(updatedSessions);
  };

  // 发送消息
  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    if (!apiKey) {
      message.error(t('ai.noApiKey'));
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    updateCurrentSession(newMessages);
    setInputValue('');
    setLoading(true);

    try {
      const chatMessages: ChatMessage[] = [
        {
          role: 'system',
          content: t('ai.systemPrompt'),
        },
        ...messages.slice(-5).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: inputValue },
      ];

      const response = await safeInvoke<string>('chat_with_ai_generic', {
        apiKey,
        apiUrl,
        model: selectedModel,
        messages: chatMessages,
      });

      setLoading(false);

      typeWriterEffect(response, () => {
        const assistantMessage: Message = {
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        };
        const updatedMessages = [...messages, userMessage, assistantMessage];
        setMessages(updatedMessages);
        updateCurrentSession(updatedMessages);
        setTypingContent('');
      });
    } catch (error) {
      logger.error(t('ai.sendFailed'), error);
      message.error(`${t('ai.sendFailed')}: ${error}`);
      setLoading(false);
    }
  };

  // 快速提问
  const quickQuestions = [
    t('ai.question1'),
    t('ai.question2'),
    t('ai.question3'),
  ];

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
    }}>
      {/* 顶部工具栏 */}
      <div style={{
        padding: '8px 16px',
        borderBottom: `1px solid ${isDarkMode ? '#434343' : '#f0f0f0'}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: isDarkMode ? '#1f1f1f' : '#fafafa',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Tooltip title={t('ai.newChat')}>
            <Button
              icon={<PlusOutlined />}
              onClick={createNewSession}
              size="small"
            />
          </Tooltip>
          <Tooltip title={t('ai.chatHistory')}>
            <Button
              icon={<HistoryOutlined />}
              onClick={() => setShowHistory(!showHistory)}
              type={showHistory ? 'primary' : 'default'}
              size="small"
            />
          </Tooltip>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* 模型选择器移到这里 */}
          <Select
            value={selectedModel}
            onChange={(value) => {
              setSelectedModel(value);
              localStorage.setItem('ai_model', value);
              
              // 根据模型更新API URL和密钥
              const model = supportedModels.find(m => m.value === value);
              if (model) {
                const provider = model.baseUrl.includes('deepseek') ? 'deepseek' : 'openai';
                setApiUrl(model.baseUrl);
                setApiKey(providerKeys[provider] || '');
                localStorage.setItem('ai_api_url', model.baseUrl);
              }
            }}
            style={{ 
              width: 180,
              background: isDarkMode ? '#262626' : '#f0f0f0',
              borderRadius: 4,
            }}
            size="small"
            dropdownStyle={{
              background: isDarkMode ? '#262626' : '#fff',
            }}
          >
            {supportedModels.map(model => (
              <Select.Option key={model.value} value={model.value}>
                <span style={{ fontSize: 12 }}>{model.name}</span>
              </Select.Option>
            ))}
          </Select>
          <Text 
            style={{ 
              fontSize: 12, 
              color: isDarkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.45)',
              maxWidth: 120,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {sessions.find(s => s.id === currentSessionId)?.title || t('ai.newChat')}
          </Text>
        </div>
      </div>

      {/* 历史对话列表 */}
      {showHistory && (
        <div style={{
          position: 'absolute',
          top: 48,
          left: 0,
          right: 0,
          bottom: 0,
          background: isDarkMode ? '#141414' : '#fff',
          zIndex: 10,
          overflow: 'auto',
          borderTop: `1px solid ${isDarkMode ? '#434343' : '#f0f0f0'}`,
        }}>
          <List
            dataSource={sessions}
            renderItem={(session) => (
              <List.Item
                style={{
                  cursor: 'pointer',
                  background: session.id === currentSessionId ? (isDarkMode ? '#262626' : '#f0f0f0') : 'transparent',
                  padding: '12px 16px',
                }}
                onClick={() => switchSession(session.id)}
                actions={[
                  <Dropdown
                    key="more"
                    overlay={
                      <Menu>
                        <Menu.Item
                          key="delete"
                          icon={<DeleteOutlined />}
                          danger
                          onClick={(e) => {
                            e.domEvent.stopPropagation();
                            deleteSession(session.id);
                          }}
                        >
                          {t('ai.delete')}
                        </Menu.Item>
                      </Menu>
                    }
                    trigger={['click']}
                  >
                    <Button
                      type="text"
                      icon={<MoreOutlined />}
                      size="small"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Dropdown>
                ]}
              >
                <List.Item.Meta
                  avatar={<MessageOutlined style={{ fontSize: 16, color: isDarkMode ? '#177ddc' : '#1890ff' }} />}
                  title={
                    <Text strong style={{ fontSize: 14 }}>
                      {session.title}
                    </Text>
                  }
                  description={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(session.updatedAt).toLocaleString()}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      )}

      {/* 消息区域 */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        padding: '16px',
      }}>
        {messages.length === 1 && !apiKey && (
          <Empty
            description={t('ai.configureApiKey')}
            style={{ marginTop: 48 }}
          />
        )}
        
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              marginBottom: 16,
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                background: msg.role === 'user' 
                  ? '#1890ff' 
                  : isDarkMode ? '#303030' : '#f0f0f0',
                color: msg.role === 'user' ? 'white' : isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
                padding: '8px 12px',
                borderRadius: 8,
                maxWidth: '85%',
                wordBreak: 'break-word',
              }}
            >
              <div className="markdown-content">
                {msg.role === 'assistant' ? (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code: ({ node, inline, className, children, ...props }) => {
                        return inline ? (
                          <code 
                            style={{
                              background: isDarkMode ? '#262626' : '#f0f0f0',
                              padding: '2px 4px',
                              borderRadius: 3,
                              fontSize: '0.9em',
                              fontFamily: 'Consolas, Monaco, monospace',
                            }}
                            {...props}
                          >
                            {children}
                          </code>
                        ) : (
                          <pre
                            style={{
                              background: isDarkMode ? '#262626' : '#f5f5f5',
                              padding: '12px',
                              borderRadius: 6,
                              overflowX: 'auto',
                              margin: '8px 0',
                            }}
                          >
                            <code
                              style={{
                                fontFamily: 'Consolas, Monaco, monospace',
                                fontSize: '0.9em',
                              }}
                              className={className}
                              {...props}
                            >
                              {children}
                            </code>
                          </pre>
                        );
                      },
                      a: ({ node, ...props }) => (
                        <a 
                          style={{ color: '#1890ff', textDecoration: 'underline' }}
                          target="_blank"
                          rel="noopener noreferrer"
                          {...props}
                        />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul style={{ paddingLeft: 20, margin: '8px 0' }} {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol style={{ paddingLeft: 20, margin: '8px 0' }} {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p style={{ margin: '8px 0' }} {...props} />
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                )}
              </div>
              <div
                style={{
                  fontSize: 10,
                  opacity: 0.7,
                  marginTop: 4,
                }}
              >
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div
            style={{
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'flex-start',
            }}
          >
            <div
              style={{
                background: isDarkMode ? '#303030' : '#f0f0f0',
                color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
                padding: '8px 12px',
                borderRadius: 8,
                maxWidth: '85%',
                wordBreak: 'break-word',
              }}
            >
              <div className="markdown-content">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code: ({ node, inline, className, children, ...props }) => {
                      return inline ? (
                        <code 
                          style={{
                            background: isDarkMode ? '#262626' : '#f0f0f0',
                            padding: '2px 4px',
                            borderRadius: 3,
                            fontSize: '0.9em',
                            fontFamily: 'Consolas, Monaco, monospace',
                          }}
                          {...props}
                        >
                          {children}
                        </code>
                      ) : (
                        <pre
                          style={{
                            background: isDarkMode ? '#262626' : '#f5f5f5',
                            padding: '12px',
                            borderRadius: 6,
                            overflowX: 'auto',
                            margin: '8px 0',
                          }}
                        >
                          <code
                            style={{
                              fontFamily: 'Consolas, Monaco, monospace',
                              fontSize: '0.9em',
                            }}
                            className={className}
                            {...props}
                          >
                            {children}
                          </code>
                        </pre>
                      );
                    },
                  }}
                >
                  {typingContent}
                </ReactMarkdown>
                <span style={{ opacity: 0.5 }}>|</span>
              </div>
            </div>
          </div>
        )}
        
        {loading && !isTyping && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Spin size="small" />
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 快速提问 */}
      {apiKey && (
        <div style={{ 
          padding: '12px 16px',
          borderTop: `1px solid ${isDarkMode ? '#434343' : '#f0f0f0'}`,
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            marginBottom: 8,
            color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
          }}>
            <BulbOutlined style={{ marginRight: 8, color: isDarkMode ? '#faad14' : '#faad14' }} />
            <span style={{ fontSize: 12 }}>{t('ai.quickQuestions')}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {quickQuestions.map((question, index) => (
              <Button
                key={index}
                size="small"
                onClick={() => setInputValue(question)}
                disabled={loading}
                style={{ fontSize: 12 }}
              >
                {question}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <div style={{ 
        padding: 16,
        borderTop: `1px solid ${isDarkMode ? '#434343' : '#f0f0f0'}`,
        background: isDarkMode ? '#1f1f1f' : '#f5f5f5',
      }}>
        {/* 模型特点提示 */}
        {(selectedModel === 'deepseek-reasoner' || selectedModel === 'gpt-4o') && (
          <div style={{ 
            fontSize: 11, 
            color: isDarkMode ? '#faad14' : '#fa8c16',
            marginBottom: 8,
          }}>
            💡 适合复杂任务，支持长上下文和深度思考
          </div>
        )}
        {(selectedModel === 'deepseek-chat' || selectedModel === 'gpt-4o-mini') && (
          <div style={{ 
            fontSize: 11, 
            color: isDarkMode ? '#52c41a' : '#389e0d',
            marginBottom: 8,
          }}>
            ⚡ 适合简单任务，响应速度快
          </div>
        )}
        
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <TextArea
            placeholder={apiKey ? t('ai.askQuestion') : t('ai.configureApiKeyFirst')}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={!apiKey || loading}
            autoSize={{ minRows: 1, maxRows: 6 }}
            style={{ 
              flex: 1,
              resize: 'none',
            }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={sendMessage}
            disabled={!apiKey || loading}
            loading={loading}
            style={{ marginBottom: 0 }}
          />
        </div>
      </div>
    </div>
  );
};

export default AISidePanel;