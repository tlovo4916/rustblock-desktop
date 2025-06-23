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
import "./styles.css";

// 懒加载页面组件以提升性能
const HomePage = lazy(() => import("./pages/HomePage"));
const EditorPage = lazy(() => import("./pages/EditorPage"));
const DebugPage = lazy(() => import("./pages/DebugPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const DevicesPage = lazy(() => import("./pages/DevicesPage"));
const AIPage = lazy(() => import("./pages/AIPage"));

const { Content, Sider } = Layout;

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

  const menuItems = [
    { key: "home", icon: <HomeOutlined />, label: "首页" },
    { key: "editor", icon: <CodeOutlined />, label: "代码编辑器" },
    { key: "debug", icon: <BugOutlined />, label: "调试工具" },
    { key: "devices", icon: <TeamOutlined />, label: "设备管理" },
    { key: "ai", icon: <RobotOutlined />, label: "AI 助手" },
    { key: "tools", icon: <ToolOutlined />, label: "工具箱" },
    { key: "docs", icon: <FileTextOutlined />, label: "文档" },
    { key: "settings", icon: <SettingOutlined />, label: "设置" },
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
    <Layout style={{ minHeight: "100vh" }}>
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
        }}
      >
        <div
          style={{
            height: 32,
            margin: 16,
            background: "rgba(0, 0, 0, 0.2)",
            borderRadius: 8,
          }}
        />
        <Menu
          theme="light"
          defaultSelectedKeys={["home"]}
          selectedKeys={[currentPage]}
          mode="inline"
          items={menuItems}
          onClick={({ key }) => setCurrentPage(key)}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 200 }}>
        <Content style={{ margin: "0", overflow: "initial" }}>
          <div
            style={{
              padding: 24,
              background: "#fff",
              minHeight: "100vh",
            }}
          >
            {renderContent()}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;