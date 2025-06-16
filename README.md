# RustBlock Desktop

> 面向10岁以下小朋友的可视化编程环境，支持Arduino、micro:bit等硬件设备编程

## 📖 项目介绍

RustBlock Desktop 是一个基于 Tauri 框架开发的跨平台桌面应用程序，提供类似 Scratch 的可视化编程环境，专门用于10岁以下小朋友学习 Arduino、micro:bit等硬件设备的编程。

## ✨ 核心功能

### 🎯 设备管理模块
- **硬件设备检测和识别** - ✅ 自动识别连接的Arduino、micro:bit、ESP32、Raspberry Pi Pico等设备
- **串口通信管理** - ✅ 稳定的串口通信，支持实时数据交换和双向通信
- **设备驱动程序管理** - ✅ 跨平台驱动检测、安装和管理（Windows/macOS/Linux）
- **固件烧录功能** - ✅ 支持Arduino CLI、PlatformIO、mpremote、ampy等多种工具

### 🧩 编程环境模块
- **Scratch式可视化编程界面** - 拖拽式积木编程，降低学习门槛
- **代码生成** - 自动生成Arduino C++和MicroPython代码
- **项目文件管理** - 完善的项目保存和加载功能
- **扩展支持** - 支持自定义积木块和库扩展

### 🤖 AI功能模块
- **AI对话助手** - 使用DeepSeek V3，面向10岁以下小朋友的友好对话
- **智能代码分析** - 使用DeepSeek R1分析代码错误并提供优化建议
- **一键代码修复** - AI自动分析问题并提供修复方案

## 🏗️ 技术架构

### 后端技术栈 (Rust)
- **Tauri** - 跨平台桌面应用框架
- **Tokio** - 异步运行时
- **SerialPort** - 串口通信
- **Reqwest** - HTTP客户端(AI API调用)

### 前端技术栈 (Web)
- **React 18** - 用户界面框架
- **TypeScript** - 类型安全的JavaScript
- **Ant Design** - UI组件库
- **Blockly** - 可视化编程积木
- **Vite** - 现代前端构建工具

## 🚀 安装和运行

### 前置要求
- Node.js 18+
- Rust 1.70+
- Tauri CLI

### 安装依赖
```bash
# 安装前端依赖
npm install

# 安装Tauri CLI (如果还没安装)
cargo install tauri-cli
```

### 开发模式运行
```bash
# 启动开发服务器
npm run tauri dev
```

### 构建生产版本
```bash
# 构建应用
npm run tauri build
```

## 📁 项目结构

```
rustblock-desktop/
├── src-tauri/                # Rust后端代码
│   ├── src/
│   │   ├── main.rs          # 主程序入口
│   │   ├── commands/        # Tauri命令处理器
│   │   ├── device/          # 设备管理模块
│   │   ├── ai/              # AI功能模块
│   │   └── utils/           # 工具函数
│   ├── Cargo.toml           # Rust项目配置
│   └── tauri.conf.json      # Tauri配置
├── src/                     # React前端代码
│   ├── components/          # React组件
│   ├── pages/               # 页面组件
│   ├── hooks/               # 自定义Hooks
│   ├── store/               # 状态管理
│   ├── types/               # TypeScript类型定义
│   └── utils/               # 前端工具函数
├── public/                  # 静态资源
├── package.json             # Node.js项目配置
└── README.md                # 项目说明文档
```

## 🎮 使用指南

### 1. 设备连接与管理
#### 设备扫描和识别
1. 将Arduino、micro:bit、ESP32、Raspberry Pi Pico等设备通过USB连接到电脑
2. 打开应用程序，转到"设备管理"页面
3. 点击"扫描设备"按钮，系统会自动识别连接的设备
4. 系统会显示设备详细信息：设备类型、端口、驱动状态等

#### 驱动程序管理
1. 查看"驱动状态"检查设备驱动是否已安装
2. 对于未安装驱动的设备，点击"安装驱动"自动安装
3. 支持的驱动类型：
   - CH340/CH341 (Arduino Nano克隆版)
   - CP210x (ESP32常用)
   - Arduino官方USB驱动
   - micro:bit USB接口驱动

#### 上传工具检查
1. 进入"工具管理"检查所需工具安装状态
2. 支持的工具：
   - **Arduino**: Arduino CLI (主要) / PlatformIO (备选)
   - **MicroPython**: mpremote (主要) / ampy / rshell (备选)
3. 点击"安装缺失工具"自动安装所需工具

### 2. 可视化编程
1. 进入"编程环境"页面
2. 从左侧工具栏拖拽积木块到工作区
3. 组合积木块创建程序逻辑
4. 实时预览生成的代码

### 3. 代码上传与通信
#### 代码上传
1. 完成编程后，点击"上传代码"按钮
2. 选择目标设备和编程语言（系统会自动推荐）
3. 系统自动选择合适的工具进行编译和上传：
   - **Arduino代码**: 优先使用Arduino CLI，备选PlatformIO
   - **MicroPython代码**: 优先使用mpremote，备选ampy/rshell
4. 实时查看上传进度和详细日志信息

#### 串口通信
1. 上传代码后，可以打开"串口监视器"
2. 支持实时双向通信：
   - 查看设备输出的调试信息
   - 向设备发送控制命令
   - 自动识别合适的波特率
3. 多串口同时监控，支持多设备调试

### 4. AI助手
1. 在任何页面点击AI助手图标
2. 向AI提问编程相关问题
3. 如果代码有错误，AI会自动分析并提供修复建议
4. 可以一键应用AI的代码优化建议

## 🔧 配置说明

### AI功能配置
在设置页面配置DeepSeek API：
- API Key: 你的DeepSeek API密钥
- API URL: DeepSeek API服务地址
- 模型选择: 选择使用的AI模型

### 设备配置
- 支持的设备类型：Arduino系列、micro:bit、ESP32、Raspberry Pi Pico
- 自动识别设备VID/PID
- 支持的编程语言：Arduino C++、MicroPython

## 🤝 贡献指南

欢迎贡献代码！请按照以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系我们

- 项目主页: [GitHub Repository](https://github.com/supiedt/rustblock-desktop)
- 问题反馈: [GitHub Issues](https://github.com/supiedt/rustblock-desktop/issues)
- 开发团队: supiedt Team

## 🙏 鸣谢

- [Tauri](https://tauri.app/) - 现代化的桌面应用框架
- [Blockly](https://developers.google.com/blockly) - 可视化编程积木库
- [Ant Design](https://ant.design/) - 优秀的React UI组件库
- [DeepSeek](https://www.deepseek.com/) - 强大的AI语言模型 