import { useState, useEffect } from "react";
import HomePage from "./pages/HomePage";
import EditorPage from "./pages/EditorPage";
import DevicesPage from "./pages/DevicesPage";
import AIPage from "./pages/AIPage";
import EnhancedAIPage from "./pages/EnhancedAIPage";
import SettingsPage from "./pages/SettingsPage";

// 简化的侧边栏组件
const SidebarWithNavigation: React.FC<{ onNavigate: (page: string) => void; currentPage: string }> = ({ onNavigate, currentPage }) => {
  const menuItems = [
    { key: 'home', label: '🏠 首页' },
    { key: 'editor', label: '🔧 编程环境' },
    { key: 'devices', label: '📱 设备管理' },
    { key: 'ai', label: '🤖 AI助手' },
    { key: 'enhanced-ai', label: '🧠 智能助手' },
    { key: 'settings', label: '⚙️ 设置' },
  ];

  return (
    <div style={{
      width: 200,
      background: '#001529',
      color: 'white',
      padding: 16,
      minHeight: '100vh'
    }}>
      <h3 style={{ color: 'white', marginBottom: 24 }}>RustBlock</h3>
      <div>
        {menuItems.map(item => (
          <div
            key={item.key}
            style={{
              padding: 8,
              cursor: 'pointer',
              borderRadius: 4,
              marginBottom: 4,
              background: currentPage === item.key ? '#1890ff' : 'transparent'
            }}
            onClick={() => onNavigate(item.key)}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
};

interface AppProps {}

const App: React.FC<AppProps> = () => {
  const [currentPage, setCurrentPage] = useState("home");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 简化的初始化
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <h2>正在启动 RustBlock Desktop...</h2>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case "editor":
        return <EditorPage />;
      case "devices":
        return <DevicesPage />;
      case "ai":
        return <AIPage />;
      case "enhanced-ai":
        return <EnhancedAIPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SidebarWithNavigation onNavigate={setCurrentPage} currentPage={currentPage} />
      <div style={{ flex: 1, background: "#f0f2f5" }}>
        {renderPage()}
      </div>
    </div>
  );
};

export default App;