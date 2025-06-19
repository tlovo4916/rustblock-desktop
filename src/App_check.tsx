import React from "react";

const App: React.FC = () => {
  return (
    <div style={{ padding: 20 }}>
      <h1>RustBlock Desktop - 测试版本</h1>
      <p>如果你能看到这个页面，说明前端基本加载成功了。</p>
      <div style={{ 
        background: '#f5f5f5', 
        padding: 16, 
        borderRadius: 8, 
        marginTop: 16 
      }}>
        <h3>当前状态：</h3>
        <ul>
          <li>✅ React 应用已启动</li>
          <li>✅ 基本 UI 渲染正常</li>
          <li>⏳ 等待完整功能恢复</li>
        </ul>
      </div>
    </div>
  );
};

export default App;