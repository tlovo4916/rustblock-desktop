import React from 'react';

const AIPage: React.FC = () => {
  return (
    <div style={{ padding: 24 }}>
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
            <div style={{ 
              flex: 1, 
              border: '1px solid #d9d9d9', 
              borderRadius: 8, 
              padding: 16,
              background: '#fafafa',
              marginBottom: 16,
              overflow: 'auto'
            }}>
              <div style={{ 
                background: '#e6f7ff', 
                padding: 12, 
                borderRadius: 8, 
                marginBottom: 16,
                maxWidth: '80%'
              }}>
                <strong>🤖 AI助手:</strong> 你好！我是RustBlock的AI助手，我可以帮助你学习编程。你有什么问题吗？
              </div>
              <div style={{ textAlign: 'center', color: '#8c8c8c', padding: 32 }}>
                开始与AI助手对话吧！我会用简单易懂的语言帮你解答编程问题 😊
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{
                  flex: 1,
                  padding: 8,
                  border: '1px solid #d9d9d9',
                  borderRadius: 4
                }}
                placeholder="输入你的问题..."
                disabled
              />
              <button style={{
                background: '#1890ff',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 4,
                cursor: 'not-allowed',
                opacity: 0.6
              }}>
                发送
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#8c8c8c', marginTop: 8 }}>
              💡 提示：AI功能需要在设置中配置API密钥
            </p>
          </div>
          
          {/* 代码分析面板 */}
          <div style={{ 
            width: 300, 
            background: '#f5f5f5', 
            padding: 16, 
            borderRadius: 8 
          }}>
            <h3>🔍 代码分析</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8 }}>粘贴你的代码:</label>
              <textarea
                style={{
                  width: '100%',
                  height: 150,
                  padding: 8,
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  fontFamily: 'monospace',
                  fontSize: 12
                }}
                placeholder="把你的Arduino或micro:bit代码粘贴到这里..."
                disabled
              />
            </div>
            <button style={{
              width: '100%',
              background: '#52c41a',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 4,
              cursor: 'not-allowed',
              opacity: 0.6,
              marginBottom: 16
            }}>
              🤖 AI分析代码
            </button>
            
            <div style={{ 
              background: 'white', 
              padding: 12, 
              borderRadius: 4,
              border: '1px solid #e8e8e8'
            }}>
              <h4>🎯 AI功能介绍</h4>
              <ul style={{ fontSize: 12, margin: 0, paddingLeft: 16 }}>
                <li>智能问答：解答编程问题</li>
                <li>代码分析：找出代码错误</li>
                <li>优化建议：让代码更好</li>
                <li>学习指导：循序渐进教学</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIPage; 