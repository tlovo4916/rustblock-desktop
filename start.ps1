# RustBlock Desktop 启动脚本
# 适用于Windows PowerShell

Write-Host "=== RustBlock Desktop 启动脚本 ===" -ForegroundColor Green

# 检查Node.js
Write-Host "检查Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ 未找到Node.js，请先安装Node.js 18+" -ForegroundColor Red
    exit 1
}

# 检查Rust
Write-Host "检查Rust..." -ForegroundColor Yellow
try {
    $rustVersion = rustc --version
    Write-Host "✓ Rust 版本: $rustVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ 未找到Rust，请先安装Rust" -ForegroundColor Red
    exit 1
}

# 检查Tauri CLI
Write-Host "检查Tauri CLI..." -ForegroundColor Yellow
try {
    $tauriVersion = cargo tauri --version
    Write-Host "✓ Tauri CLI 版本: $tauriVersion" -ForegroundColor Green
} catch {
    Write-Host "安装Tauri CLI..." -ForegroundColor Yellow
    cargo install tauri-cli
}

# 安装前端依赖
Write-Host "安装前端依赖..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 前端依赖安装失败" -ForegroundColor Red
    exit 1
}

Write-Host "✓ 前端依赖安装完成" -ForegroundColor Green

# 启动开发服务器
Write-Host "启动RustBlock Desktop开发服务器..." -ForegroundColor Green
Write-Host "应用将在浏览器中自动打开..." -ForegroundColor Cyan

npm run tauri dev 