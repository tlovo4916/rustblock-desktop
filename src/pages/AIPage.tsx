import React, { useState, useEffect, useRef } from 'react';
import { message } from 'antd';
import { safeInvoke } from '../utils/tauri';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatMessage {
  role: string;
  content: string;
}


const AIPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '哈喽哇,我是小派! 是你学习编程路上的AI小帮手,有什么问题需要我帮忙吗？',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
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
      // 清理打字效果定时器
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
        typingTimeoutRef.current = setTimeout(typeNext, 15); // 加快打字速度
      } else {
        setIsTyping(false);
        onComplete();
      }
    };
    
    typeNext();
  };

  // 发送消息到DeepSeek API
  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    if (!apiKey) {
      message.error('请先在设置页面配置DeepSeek API密钥');
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);
    setLoadingStatus('正在连接AI...');

    try {
      // 准备消息历史
      const chatMessages: ChatMessage[] = [
        {
          role: 'system',
          content: '你是编程助手，简洁回答，多用emoji。'
        },
        // 只保留最近5条消息历史
        ...messages.slice(-5).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: inputValue }
      ];

      // 通过Tauri后端调用API
      setLoadingStatus('AI正在思考...');
      const response = await safeInvoke<string>('chat_with_deepseek', {
        apiKey,
        apiUrl,
        messages: chatMessages
      });

      setLoading(false);
      setLoadingStatus('');
      
      // 使用打字机效果显示响应
      typeWriterEffect(response, () => {
        const assistantMessage: Message = {
          role: 'assistant',
          content: response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        setTypingContent('');
      });
    } catch (error) {
      console.error('发送消息失败:', error);
      message.error(`发送失败: ${error}`);
      setLoading(false);
      setLoadingStatus('');
    }
  };

  // 处理回车键发送
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <h1>AI 编程助手</h1>
      <div style={{ 
        background: 'white', 
        padding: 24, 
        borderRadius: 8, 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
      }}>
        <div style={{ display: 'flex', gap: 24, height: 500 }}>
          {/* 聊天界面 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3>💬 与AI助手对话</h3>
            
            {!apiKey && (
              <div style={{
                background: '#fff2e8',
                border: '1px solid #ffbb96',
                borderRadius: 4,
                padding: 12,
                marginBottom: 12,
                color: '#d46b08'
              }}>
                ⚠️ 请先在设置页面配置DeepSeek API密钥才能使用AI对话功能
              </div>
            )}

            <div style={{ 
              flex: 1, 
              border: '1px solid #d9d9d9', 
              borderRadius: 8, 
              padding: 16,
              background: '#fafafa',
              marginBottom: 16,
              overflow: 'auto'
            }}>
              {messages.map((msg, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: 16,
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{
                    background: msg.role === 'user' ? '#1890ff' : '#f0f0f0',
                    color: msg.role === 'user' ? 'white' : 'black',
                    padding: 12,
                    borderRadius: 8,
                    maxWidth: '80%',
                    wordBreak: 'break-word'
                  }}>
                    <strong>{msg.role === 'user' ? ' ' : ' 🐱 小派:'}</strong>
                    <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                    </div>
                    <div style={{ 
                      fontSize: 10, 
                      opacity: 0.7, 
                      marginTop: 4 
                    }}>
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
                    justifyContent: 'flex-start'
                  }}
                >
                  <div style={{
                    background: '#f0f0f0',
                    color: 'black',
                    padding: 12,
                    borderRadius: 8,
                    maxWidth: '80%',
                    wordBreak: 'break-word'
                  }}>
                    <strong>🤖 AI助手:</strong>
                    <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>
                      {typingContent}
                      <span style={{ opacity: 0.5 }}>|</span>
                    </div>
                  </div>
                </div>
              )}
              {loading && !isTyping && (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#8c8c8c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}>
                  <div style={{
                    width: 16,
                    height: 16,
                    border: '2px solid #f3f3f3',
                    borderTop: '2px solid #1890ff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  {loadingStatus || 'AI正在思考中...'}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{
                  flex: 1,
                  padding: 8,
                  border: '1px solid #d9d9d9',
                  borderRadius: 4
                }}
                placeholder={apiKey ? "给小派提问题吧~" : "请先配置API密钥"}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={!apiKey || loading}
              />
              <button 
                style={{
                  background: (!apiKey || loading) ? '#d9d9d9' : '#1890ff',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 4,
                  cursor: (!apiKey || loading) ? 'not-allowed' : 'pointer'
                }}
                onClick={sendMessage}
                disabled={!apiKey || loading}
              >
                {loading ? '发送中...' : '发送'}
              </button>
            </div>
          </div>

          {/* 快速提问 */}
          <div style={{ width: 300 }}>
            <h3>⚡ 快速提问</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {[
                '什么是变量？',
                '如何让LED灯闪烁？',
                '什么是循环？',
                '如何读取按钮状态？',
                '什么是函数？',
                '如何使用蜂鸣器？'
              ].map(question => (
                <button
                  key={question}
                  style={{
                    background: '#f0f0f0',
                    border: '1px solid #d9d9d9',
                    padding: '8px 12px',
                    borderRadius: 4,
                    cursor: apiKey ? 'pointer' : 'not-allowed',
                    textAlign: 'left'
                  }}
                  onClick={() => {
                    if (apiKey) {
                      setInputValue(question);
                    }
                  }}
                  disabled={!apiKey || loading}
                >
                  {question}
                </button>
              ))}
            </div>
            
            <div style={{ 
              marginTop: 24, 
              padding: 16, 
              background: '#e6f7ff', 
              borderRadius: 8,
              fontSize: 12 
            }}>
              <strong>💡 提示：</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                <li>可以问我任何编程问题</li>
                <li>我会用简单的语言解释</li>
                <li>遇到错误可以问我怎么解决</li>
                <li>想做什么项目也可以问我哦！</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIPage;