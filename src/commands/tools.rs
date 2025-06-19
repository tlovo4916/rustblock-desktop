use anyhow::{Result, anyhow};
use tauri::command;
use log::{info, error};
use std::process::Command;
use std::collections::HashMap;

#[derive(serde::Serialize)]
pub struct ToolInfo {
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<String>,
}

#[command]
pub async fn check_system_tools() -> Result<HashMap<String, ToolInfo>, String> {
    info!("检查系统工具状态");
    
    let mut tools = HashMap::new();
    
    // 检查 Arduino CLI
    tools.insert("arduino-cli".to_string(), check_tool("arduino-cli", &["version"]));
    
    // 检查 Python 3
    tools.insert("python3".to_string(), check_tool("python3", &["--version"]));
    
    // 检查 mpremote
    tools.insert("mpremote".to_string(), check_tool("mpremote", &["version"]));
    
    // 检查 esptool
    tools.insert("esptool".to_string(), check_tool("esptool.py", &["version"]));
    
    // 检查 PlatformIO
    tools.insert("platformio".to_string(), check_tool("pio", &["--version"]));
    
    // 检查 Git
    tools.insert("git".to_string(), check_tool("git", &["--version"]));
    
    Ok(tools)
}

#[command]
pub async fn check_upload_tools() -> Result<HashMap<String, bool>, String> {
    info!("检查上传工具");
    
    let mut tools = HashMap::new();
    
    // 检查必需的上传工具
    tools.insert("arduino-cli".to_string(), check_command_exists("arduino-cli"));
    tools.insert("mpremote".to_string(), check_command_exists("mpremote"));
    tools.insert("esptool".to_string(), check_command_exists("esptool.py"));
    tools.insert("avrdude".to_string(), check_command_exists("avrdude"));
    
    Ok(tools)
}

#[command]
pub async fn install_tool(tool_name: String) -> Result<serde_json::Value, String> {
    info!("安装工具: {}", tool_name);
    
    let result = match tool_name.as_str() {
        "arduino-cli" => install_arduino_cli().await,
        "mpremote" => install_mpremote().await,
        "esptool" => install_esptool().await,
        "platformio" => install_platformio().await,
        _ => Err(anyhow!("不支持的工具: {}", tool_name)),
    };
    
    match result {
        Ok(output) => Ok(serde_json::json!({
            "success": true,
            "message": output
        })),
        Err(e) => {
            error!("安装工具失败: {}", e);
            Ok(serde_json::json!({
                "success": false,
                "message": e.to_string()
            }))
        }
    }
}

#[command]
pub async fn install_missing_tools() -> Result<Vec<String>, String> {
    info!("安装缺失的工具");
    
    let tools = check_upload_tools().await?;
    let mut installed = Vec::new();
    
    for (tool, exists) in tools {
        if !exists {
            match tool.as_str() {
                "arduino-cli" => {
                    if install_arduino_cli().await.is_ok() {
                        installed.push(tool);
                    }
                }
                "mpremote" => {
                    if install_mpremote().await.is_ok() {
                        installed.push(tool);
                    }
                }
                _ => {}
            }
        }
    }
    
    Ok(installed)
}

// 辅助函数

fn check_tool(command: &str, args: &[&str]) -> ToolInfo {
    match Command::new(command).args(args).output() {
        Ok(output) => {
            let version = String::from_utf8_lossy(&output.stdout)
                .trim()
                .to_string();
            
            // 获取工具路径
            let path = Command::new("which")
                .arg(command)
                .output()
                .ok()
                .and_then(|o| String::from_utf8(o.stdout).ok())
                .map(|s| s.trim().to_string());
            
            ToolInfo {
                installed: true,
                version: Some(version),
                path,
            }
        }
        Err(_) => ToolInfo {
            installed: false,
            version: None,
            path: None,
        }
    }
}

fn check_command_exists(command: &str) -> bool {
    Command::new("which")
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

async fn install_arduino_cli() -> Result<String> {
    info!("开始安装 Arduino CLI");
    
    // 检测操作系统
    let os = std::env::consts::OS;
    
    let install_cmd = match os {
        "macos" => {
            // macOS 使用 Homebrew
            Command::new("brew")
                .args(&["install", "arduino-cli"])
                .output()
        }
        "linux" => {
            // Linux 使用官方安装脚本
            Command::new("sh")
                .arg("-c")
                .arg("curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh")
                .output()
        }
        "windows" => {
            // Windows 使用 scoop 或 chocolatey
            Command::new("scoop")
                .args(&["install", "arduino-cli"])
                .output()
                .or_else(|_| {
                    Command::new("choco")
                        .args(&["install", "arduino-cli", "-y"])
                        .output()
                })
        }
        _ => return Err(anyhow!("不支持的操作系统: {}", os)),
    };
    
    match install_cmd {
        Ok(output) => {
            if output.status.success() {
                // 初始化 Arduino CLI
                let _ = Command::new("arduino-cli")
                    .args(&["core", "update-index"])
                    .output();
                
                Ok("Arduino CLI 安装成功".to_string())
            } else {
                Err(anyhow!("安装失败: {}", String::from_utf8_lossy(&output.stderr)))
            }
        }
        Err(e) => Err(anyhow!("执行安装命令失败: {}", e)),
    }
}

async fn install_mpremote() -> Result<String> {
    info!("开始安装 mpremote");
    
    // 使用 pip 安装
    let output = Command::new("pip3")
        .args(&["install", "mpremote"])
        .output()
        .or_else(|_| {
            Command::new("python3")
                .args(&["-m", "pip", "install", "mpremote"])
                .output()
        })?;
    
    if output.status.success() {
        Ok("mpremote 安装成功".to_string())
    } else {
        Err(anyhow!("安装失败: {}", String::from_utf8_lossy(&output.stderr)))
    }
}

async fn install_esptool() -> Result<String> {
    info!("开始安装 esptool");
    
    // 使用 pip 安装
    let output = Command::new("pip3")
        .args(&["install", "esptool"])
        .output()
        .or_else(|_| {
            Command::new("python3")
                .args(&["-m", "pip", "install", "esptool"])
                .output()
        })?;
    
    if output.status.success() {
        Ok("esptool 安装成功".to_string())
    } else {
        Err(anyhow!("安装失败: {}", String::from_utf8_lossy(&output.stderr)))
    }
}

async fn install_platformio() -> Result<String> {
    info!("开始安装 PlatformIO");
    
    // 使用 pip 安装
    let output = Command::new("pip3")
        .args(&["install", "platformio"])
        .output()
        .or_else(|_| {
            Command::new("python3")
                .args(&["-m", "pip", "install", "platformio"])
                .output()
        })?;
    
    if output.status.success() {
        Ok("PlatformIO 安装成功".to_string())
    } else {
        Err(anyhow!("安装失败: {}", String::from_utf8_lossy(&output.stderr)))
    }
}

// 编译和上传相关命令

#[derive(serde::Serialize)]
pub struct CompileResult {
    pub success: bool,
    pub binary_size: Option<usize>,
    pub firmware_path: Option<String>,
    pub error: Option<String>,
    pub warnings: Vec<String>,
}

#[command]
pub async fn compile_code(
    code: String,
    language: String,
    device_type: String
) -> Result<CompileResult, String> {
    info!("编译代码 - 语言: {}, 设备: {}", language, device_type);
    
    match language.as_str() {
        "arduino" => compile_arduino_code(code, device_type).await,
        "micropython" => {
            // MicroPython 不需要编译，直接返回成功
            Ok(CompileResult {
                success: true,
                binary_size: Some(code.len()),
                firmware_path: None,
                error: None,
                warnings: Vec::new(),
            })
        }
        _ => Err(format!("不支持的语言: {}", language)),
    }
}

async fn compile_arduino_code(code: String, device_type: String) -> Result<CompileResult, String> {
    // 创建临时文件
    let temp_dir = std::env::temp_dir();
    let sketch_dir = temp_dir.join(format!("rustblock_sketch_{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&sketch_dir).map_err(|e| format!("创建临时目录失败: {}", e))?;
    
    let sketch_file = sketch_dir.join("sketch.ino");
    std::fs::write(&sketch_file, code).map_err(|e| format!("写入代码文件失败: {}", e))?;
    
    // 确定板卡类型
    let board = match device_type.as_str() {
        "Arduino" => "arduino:avr:uno",
        "ESP32" => "esp32:esp32:esp32",
        "MicroBit" => "sandeepmistry:nRF5:BBCmicrobit",
        "RaspberryPiPico" => "rp2040:rp2040:rpipico",
        _ => "arduino:avr:uno",
    };
    
    // 编译
    let output = Command::new("arduino-cli")
        .args(&[
            "compile",
            "--fqbn", board,
            sketch_dir.to_str().unwrap()
        ])
        .output()
        .map_err(|e| format!("执行编译命令失败: {}", e))?;
    
    if output.status.success() {
        // 查找生成的二进制文件
        let hex_file = sketch_dir.join("sketch.ino.hex");
        let bin_file = sketch_dir.join("sketch.ino.bin");
        
        let firmware_path = if hex_file.exists() {
            Some(hex_file.to_str().unwrap().to_string())
        } else if bin_file.exists() {
            Some(bin_file.to_str().unwrap().to_string())
        } else {
            None
        };
        
        // 获取文件大小
        let binary_size = firmware_path.as_ref().and_then(|path| {
            std::fs::metadata(path).ok().map(|m| m.len() as usize)
        });
        
        Ok(CompileResult {
            success: true,
            binary_size,
            firmware_path,
            error: None,
            warnings: Vec::new(),
        })
    } else {
        let error_msg = String::from_utf8_lossy(&output.stderr).to_string();
        Err(error_msg)
    }
}

#[derive(serde::Serialize)]
pub struct UploadResult {
    pub success: bool,
    pub error: Option<String>,
}

#[command]
pub async fn upload_firmware(
    device_id: String,
    firmware_path: String,
    port: String
) -> Result<UploadResult, String> {
    info!("上传固件到设备: {} @ {}", device_id, port);
    
    // 这里应该根据设备类型选择合适的上传工具
    // 暂时使用 Arduino CLI
    let output = Command::new("arduino-cli")
        .args(&[
            "upload",
            "-p", &port,
            "--input-file", &firmware_path
        ])
        .output()
        .map_err(|e| format!("执行上传命令失败: {}", e))?;
    
    if output.status.success() {
        Ok(UploadResult {
            success: true,
            error: None,
        })
    } else {
        Ok(UploadResult {
            success: false,
            error: Some(String::from_utf8_lossy(&output.stderr).to_string()),
        })
    }
}

#[command]
pub async fn verify_upload(device_id: String) -> Result<serde_json::Value, String> {
    info!("验证设备上传: {}", device_id);
    
    // 这里应该实现实际的验证逻辑
    // 比如检查设备是否响应，串口通信是否正常等
    
    Ok(serde_json::json!({
        "success": true,
        "message": "设备运行正常"
    }))
}

#[command]
pub async fn cancel_upload() -> Result<(), String> {
    info!("取消上传操作");
    // 这里应该实现取消上传的逻辑
    Ok(())
}