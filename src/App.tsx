import React, { useState, lazy, Suspense } from "react";
import { Layout, Menu, Button, Spin } from "antd";
import {
  HomeOutlined,
  CodeOutlined,
  ToolOutlined,
  SettingOutlined,
  RobotOutlined,
  BugOutlined,
  TeamOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import ThemeToggle from "./components/ThemeToggle";
import LanguageToggle from "./components/LanguageToggle";
import DarkModeStyles from "./components/DarkModeStyles";
import { useTheme } from "./contexts/ThemeContext";
import { useTranslation, useLocale } from "./contexts/LocaleContext";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import enUS from "antd/locale/en_US";
import "./styles.css";
import "./styles/dark-override.css";

// 懒加载页面组件以提升性能
const HomePage = lazy(() => import("./pages/HomePage"));
const EditorPage = lazy(() => import("./pages/EditorPage"));
const DebugPage = lazy(() => import("./pages/DebugPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const DevicesPage = lazy(() => import("./pages/DevicesPage"));
const AIPage = lazy(() => import("./pages/AIPage"));

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
  const { isDarkMode } = useTheme();
  const { t } = useTranslation();
  const { locale } = useLocale();

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
      icon: <TeamOutlined style={{ fontSize: 16 }} />, 
      label: t('menu.devices')
    },
    { 
      key: "ai", 
      icon: <RobotOutlined style={{ fontSize: 16 }} />, 
      label: t('menu.ai')
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
            case "ai":
              return <AIPage />;
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
      <Layout style={{ marginLeft: collapsed ? 80 : 200 }}>
        <Header
          style={{
            padding: '0 24px',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            height: 64,
          }}
        >
          <LanguageToggle />
          <div style={{ width: 16 }} />
          <ThemeToggle />
        </Header>
        <Content style={{ margin: "0", overflow: "initial" }}>
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
    </ConfigProvider>
  );
};

export default App;