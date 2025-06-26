import React, { useState, useEffect, lazy, Suspense } from "react";
import { Layout, Menu, Button, Spin, Drawer, Tooltip } from "antd";
import {
  HomeOutlined,
  CodeOutlined,
  ToolOutlined,
  SettingOutlined,
  BugOutlined,
  FileTextOutlined,
  MessageOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import AIIcon from "./components/AIIcon";
import DeviceBoardIcon from "./components/DeviceBoardIcon";
import ThemeToggle from "./components/ThemeToggle";
import LanguageToggle from "./components/LanguageToggle";
import DarkModeStyles from "./components/DarkModeStyles";
import { useTheme } from "./contexts/ThemeContext";
import { useTranslation, useLocale } from "./contexts/LocaleContext";
import { DeviceProvider } from "./contexts/DeviceContext";
import { DeviceStatusIndicator } from "./components/DeviceStatusIndicator";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import enUS from "antd/locale/en_US";
import "./styles.css";
import "./styles/dark-override.css";
import "./styles/ai-panel.css";

// 懒加载页面组件以提升性能
const HomePage = lazy(() => import("./pages/HomePage"));
const EditorPage = lazy(() => import("./pages/EditorPage"));
const DebugPage = lazy(() => import("./pages/DebugPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const DevicesPage = lazy(() => import("./pages/DevicesPage"));
const AISidePanel = lazy(() => import("./components/AISidePanel"));

const { Content, Sider, Header } = Layout;

// 加载组件
const PageLoader = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh' 
  }}>
    <Spin size="large" tip="加载中..." />
  </div>
);

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState("home");
  const [aiPanelVisible, setAiPanelVisible] = useState(false);
  const { isDarkMode } = useTheme();
  const { t } = useTranslation();
  const { locale } = useLocale();

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K 打开AI助手
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setAiPanelVisible(prev => !prev);
      }
      // Escape 关闭AI助手
      if (e.key === 'Escape' && aiPanelVisible) {
        setAiPanelVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [aiPanelVisible]);

  const menuItems = [
    { 
      key: "home", 
      icon: <HomeOutlined style={{ fontSize: 16 }} />, 
      label: t('menu.home')
    },
    { 
      key: "editor", 
      icon: <CodeOutlined style={{ fontSize: 16 }} />, 
      label: t('menu.editor')
    },
    { 
      key: "debug", 
      icon: <BugOutlined style={{ fontSize: 16 }} />, 
      label: t('menu.debug')
    },
    { 
      key: "devices", 
      icon: <DeviceBoardIcon style={{ fontSize: 16 }} />, 
      label: t('menu.devices')
    },
    { 
      key: "tools", 
      icon: <ToolOutlined style={{ fontSize: 16 }} />, 
      label: t('menu.tools')
    },
    { 
      key: "docs", 
      icon: <FileTextOutlined style={{ fontSize: 16 }} />, 
      label: t('menu.docs')
    },
    { 
      key: "settings", 
      icon: <SettingOutlined style={{ fontSize: 16 }} />, 
      label: t('menu.settings')
    },
  ];

  const renderContent = () => {
    return (
      <Suspense fallback={<PageLoader />}>
        {(() => {
          switch (currentPage) {
            case "home":
              return <HomePage />;
            case "editor":
              return <EditorPage />;
            case "debug":
              return <DebugPage />;
            case "devices":
              return <DevicesPage />;
            case "settings":
              return <SettingsPage />;
            default:
              return <HomePage />;
          }
        })()}
      </Suspense>
    );
  };

  return (
    <ConfigProvider locale={locale === 'zh-CN' ? zhCN : enUS}>
      <DeviceProvider>
        <Layout style={{ minHeight: "100vh" }}>
          <DarkModeStyles />
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        style={{
          overflow: "auto",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          background: isDarkMode ? '#1f1f1f' : '#fff',
          borderRight: `1px solid ${isDarkMode ? '#434343' : '#f0f0f0'}`,
        }}
      >
        <div
          style={{
            height: 32,
            margin: 16,
            background: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "#1890ff",
            border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid #1890ff",
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 16,
            fontWeight: 'bold',
          }}
        >
          {collapsed ? 'R' : 'RustBlock'}
        </div>
        <Menu
          defaultSelectedKeys={["home"]}
          selectedKeys={[currentPage]}
          mode="inline"
          items={menuItems}
          onClick={({ key }) => setCurrentPage(key)}
        />
      </Sider>
      <Layout 
        style={{ 
          marginLeft: collapsed ? 80 : 200,
          marginRight: aiPanelVisible ? 400 : 0,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Header
          style={{
            padding: '0 24px',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 64,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <DeviceStatusIndicator 
              onClick={() => setCurrentPage('devices')}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip 
              title={`${t('menu.ai')} (${navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'} + K)`}
            >
              <Button
                type={aiPanelVisible ? 'primary' : 'default'}
                icon={<AIIcon />}
                onClick={() => setAiPanelVisible(!aiPanelVisible)}
                className="ai-assistant-toggle-btn"
                style={{
                  marginRight: 16,
                  background: !aiPanelVisible && isDarkMode ? '#262626' : undefined,
                  borderColor: !aiPanelVisible && isDarkMode ? '#434343' : undefined,
                  color: !aiPanelVisible && isDarkMode ? 'rgba(255, 255, 255, 0.85)' : undefined,
                }}
              >
                {t('menu.ai')}
              </Button>
            </Tooltip>
            <LanguageToggle />
            <div style={{ width: 16 }} />
            <ThemeToggle />
          </div>
        </Header>
        <Content style={{ margin: "0", overflow: "initial" }}>
          {renderContent()}
        </Content>
      </Layout>
      {/* AI助手侧边栏 */}
      <Sider
        width={400}
        theme={isDarkMode ? "dark" : "light"}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          background: isDarkMode ? '#141414' : '#fff',
          borderLeft: `1px solid ${isDarkMode ? '#434343' : '#f0f0f0'}`,
          transform: aiPanelVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: aiPanelVisible ? isDarkMode ? '-4px 0 12px rgba(0,0,0,0.3)' : '-4px 0 16px rgba(0,0,0,0.08)' : 'none',
          zIndex: 10,
        }}
      >
        <div style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            padding: '16px 24px',
            borderBottom: `1px solid ${isDarkMode ? '#434343' : '#f0f0f0'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isDarkMode ? '#1f1f1f' : '#f0f0f0',
          }}>
            <h3 style={{ margin: 0, fontSize: 18, color: isDarkMode ? '#fff' : 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center' }}>
              <AIIcon style={{ marginRight: 8, fontSize: 20, color: isDarkMode ? '#fff' : '#1890ff' }} />
              {t('menu.ai')}
            </h3>
            <Tooltip title={`${t('common.close')} (Esc)`}>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={() => setAiPanelVisible(false)}
                size="small"
                style={{ color: isDarkMode ? '#fff' : 'rgba(0, 0, 0, 0.65)' }}
              />
            </Tooltip>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Suspense fallback={<div style={{ padding: 20, textAlign: 'center' }}><Spin /></div>}>
              <AISidePanel />
            </Suspense>
          </div>
        </div>
      </Sider>
    </Layout>
    </DeviceProvider>
    </ConfigProvider>
  );
};

export default App;