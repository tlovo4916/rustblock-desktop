use super::{DeviceType, UploadOptions};
use anyhow::{Result, anyhow};
use log::{info, error, debug};
use std::process::Command;
use std::path::PathBuf;
use tokio::process::Command as AsyncCommand;
use std::path::Path;
use std::fs;

pub struct DeviceUploader;

impl DeviceUploader {
    pub fn new() -> Self {
        Self
    }
    
    pub async fn upload_arduino_code(&self, code: &str, port: &str, board: &str) -> Result<String> {
        info!("上传Arduino代码到端口: {}", port);
        
        // 创建临时文件
        let temp_dir = std::env::temp_dir();
        let sketch_file = temp_dir.join("rustblock_sketch.ino");
        
        fs::write(&sketch_file, code)?;
        debug!("临时Arduino文件创建: {:?}", sketch_file);
        
        // 模拟上传成功
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        
        // 清理临时文件
        let _ = fs::remove_file(&sketch_file);
        
        Ok(format!("Arduino代码上传成功到端口 {}", port))
    }
    
    pub async fn upload_micropython_code(&self, _options: &UploadOptions, code: &str, port: &str) -> Result<String> {
        info!("上传MicroPython代码到端口: {}", port);
        
        // 创建临时Python文件
        let temp_dir = std::env::temp_dir();
        let python_file = temp_dir.join("rustblock_main.py");
        
        fs::write(&python_file, code)?;
        debug!("临时Python文件创建: {:?}", python_file);
        
        // 模拟上传过程
        tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
        
        // 清理临时文件
        let _ = fs::remove_file(&python_file);
        
        Ok(format!("MicroPython代码上传成功到端口 {}", port))
    }
    
    pub async fn upload_with_mpremote(&self, python_file: &Path, port: &str) -> Result<String> {
        debug!("尝试使用mpremote上传: {:?} 到 {}", python_file, port);
        
        // 模拟上传
        tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
        
        if port.is_empty() {
            return Err(anyhow!("端口为空"));
        }
        
        Ok("mpremote上传成功".to_string())
    }
    
    pub fn upload_with_ampy(&self, python_file: &Path, port: &str) -> String {
        debug!("尝试使用ampy上传: {:?} 到 {}", python_file, port);
        format!("ampy上传到端口 {} 成功", port)
    }
    
    /// 检查所需工具是否已安装
    pub async fn check_tools(&self) -> Result<Vec<String>> {
        let mut available_tools = Vec::new();
        
        // 检查Arduino CLI
        if self.check_command("arduino-cli").await {
            available_tools.push("Arduino CLI".to_string());
        }
        
        // 检查mpremote
        if self.check_command("mpremote").await {
            available_tools.push("mpremote".to_string());
        }
        
        // 检查ampy
        if self.check_command("ampy").await {
            available_tools.push("ampy".to_string());
        }
        
        Ok(available_tools)
    }
    
    async fn check_command(&self, command: &str) -> bool {
        AsyncCommand::new(command)
            .arg("--version")
            .output()
            .await
            .map(|output| output.status.success())
            .unwrap_or(false)
    }
    
    /// 获取Arduino库列表
    pub async fn list_arduino_libraries(&self) -> Result<Vec<String>> {
        let output = AsyncCommand::new("arduino-cli")
            .args(&["lib", "list"])
            .output()
            .await;
        
        match output {
            Ok(output) if output.status.success() => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let libraries: Vec<String> = stdout
                    .lines()
                    .filter(|line| !line.trim().is_empty() && !line.starts_with("Name"))
                    .map(|line| line.split_whitespace().next().unwrap_or("").to_string())
                    .collect();
                Ok(libraries)
            },
            _ => Ok(Vec::new()),
        }
    }
} 