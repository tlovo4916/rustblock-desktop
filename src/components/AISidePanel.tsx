import React, { useState, useEffect, useRef } from 'react';
import { message, Input, Button, Divider, Empty, Spin } from 'antd';
import { SendOutlined, BulbOutlined } from '@ant-design/icons';
import { safeInvoke } from '../utils/tauri';
import { logger } from '../utils/logger';
import { useTranslation } from '../contexts/LocaleContext';
import { useTheme } from '../contexts/ThemeContext';
import AIIcon from './AIIcon';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatMessage {
  role: string;
  content: string;
}

const AISidePanel: React.FC = () => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: t('ai.welcomeMessage'),
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('https://api.deepseek.com');
  const [typingContent, setTypingContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 加载API配置
  useEffect(() => {
    const loadConfig = () => {
      const savedApiKey = localStorage.getItem('deepseek_api_key') || '';
      const savedApiUrl = localStorage.getItem('deepseek_api_url') || 'https://api.deepseek.com';
      setApiKey(savedApiKey);
      setApiUrl(savedApiUrl);
    };

    loadConfig();

    // 监听配置更新事件
    const handleConfigUpdate = (event: any) => {
      const { apiKey, apiUrl } = event.detail;
      setApiKey(apiKey);
      setApiUrl(apiUrl);
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
    let index = 0;

    const typeNext = () => {
      if (index < text.length) {
        setTypingContent(prev => prev + text[index]);
        index++;
        typingTimeoutRef.current = setTimeout(typeNext, 15);
      } else {
        setIsTyping(false);
        onComplete();
      }
    };

    typeNext();
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

    setMessages(prev => [...prev, userMessage]);
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

      const response = await safeInvoke<string>('chat_with_deepseek', {
        apiKey,
        apiUrl,
        messages: chatMessages,
      });

      setLoading(false);

      typeWriterEffect(response, () => {
        const assistantMessage: Message = {
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
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
              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
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
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {typingContent}
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
        <Input.Group compact style={{ display: 'flex' }}>
          <Input
            placeholder={apiKey ? t('ai.askQuestion') : t('ai.configureApiKeyFirst')}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onPressEnter={sendMessage}
            disabled={!apiKey || loading}
            style={{ 
              flex: 1,
            }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={sendMessage}
            disabled={!apiKey || loading}
            loading={loading}
          />
        </Input.Group>
      </div>
    </div>
  );
};

export default AISidePanel;