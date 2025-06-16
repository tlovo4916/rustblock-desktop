use super::{DeviceType, UploadOptions};
use anyhow::{Result, anyhow};
use log::{info, error, debug, warn};
use std::process::Command;
use std::path::PathBuf;
use tokio::process::Command as AsyncCommand;
use std::path::Path;
use std::fs;
use std::io::Write;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadProgress {
    pub stage: String,
    pub progress: f32,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoardConfig {
    pub name: String,
    pub fqbn: String,  // Fully Qualified Board Name for Arduino
    pub upload_protocol: String,
    pub upload_speed: u32,
    pub extra_flags: Vec<String>,
}

pub struct DeviceUploader {
    board_configs: HashMap<DeviceType, Vec<BoardConfig>>,
}

impl DeviceUploader {
    pub fn new() -> Self {
        let mut uploader = Self {
            board_configs: HashMap::new(),
        };
        uploader.initialize_board_configs();
        uploader
    }

    /// 初始化开发板配置
    fn initialize_board_configs(&mut self) {
        // Arduino 开发板配置
        self.board_configs.insert(DeviceType::Arduino, vec![
            BoardConfig {
                name: "Arduino Uno".to_string(),
                fqbn: "arduino:avr:uno".to_string(),
                upload_protocol: "arduino".to_string(),
                upload_speed: 115200,
                extra_flags: vec![],
            },
            BoardConfig {
                name: "Arduino Nano".to_string(),
                fqbn: "arduino:avr:nano".to_string(),
                upload_protocol: "arduino".to_string(),
                upload_speed: 57600,
                extra_flags: vec![],
            },
            BoardConfig {
                name: "Arduino Leonardo".to_string(),
                fqbn: "arduino:avr:leonardo".to_string(),
                upload_protocol: "avr109".to_string(),
                upload_speed: 57600,
                extra_flags: vec![],
            },
        ]);

        // ESP32 开发板配置
        self.board_configs.insert(DeviceType::ESP32, vec![
            BoardConfig {
                name: "ESP32 Dev Module".to_string(),
                fqbn: "esp32:esp32:esp32".to_string(),
                upload_protocol: "esptool".to_string(),
                upload_speed: 921600,
                extra_flags: vec!["--before=default_reset".to_string(), "--after=hard_reset".to_string()],
            },
            BoardConfig {
                name: "ESP32-S2".to_string(),
                fqbn: "esp32:esp32:esp32s2".to_string(),
                upload_protocol: "esptool".to_string(),
                upload_speed: 460800,
                extra_flags: vec!["--before=default_reset".to_string(), "--after=hard_reset".to_string()],
            },
        ]);

        // micro:bit 配置
        self.board_configs.insert(DeviceType::MicroBit, vec![
            BoardConfig {
                name: "BBC micro:bit".to_string(),
                fqbn: "microbit".to_string(),
                upload_protocol: "copy".to_string(),
                upload_speed: 115200,
                extra_flags: vec![],
            },
        ]);

        // Raspberry Pi Pico 配置
        self.board_configs.insert(DeviceType::RaspberryPiPico, vec![
            BoardConfig {
                name: "Raspberry Pi Pico".to_string(),
                fqbn: "rp2040:rp2040:rpipico".to_string(),
                upload_protocol: "picotool".to_string(),
                upload_speed: 115200,
                extra_flags: vec![],
            },
        ]);
    }

    /// 获取设备类型支持的开发板配置
    pub fn get_board_configs(&self, device_type: &DeviceType) -> Vec<BoardConfig> {
        self.board_configs.get(device_type).cloned().unwrap_or_default()
    }

    /// 上传Arduino代码
    pub async fn upload_arduino_code(&self, options: &UploadOptions) -> Result<String> {
        info!("开始上传Arduino代码...");
        
        let device_type = self.parse_device_type(&options.board_type)?;
        let board_config = self.get_default_board_config(&device_type)?;
        
        // 创建临时项目目录
        let temp_dir = self.create_temp_project(&options.code, "ino").await?;
        let sketch_file = temp_dir.join("sketch.ino");
        
        let result = match self.check_arduino_cli().await {
            true => self.upload_with_arduino_cli(&sketch_file, &options.device_id, &board_config).await,
            false => self.upload_with_platformio(&sketch_file, &options.device_id, &board_config).await,
        };

        // 清理临时文件
        let _ = fs::remove_dir_all(&temp_dir);
        
        result
    }

    /// 上传MicroPython代码
    pub async fn upload_micropython_code(&self, options: &UploadOptions) -> Result<String> {
        info!("开始上传MicroPython代码...");
        
        // 创建临时Python文件
        let temp_dir = self.create_temp_project(&options.code, "py").await?;
        let python_file = temp_dir.join("main.py");
        
        let result = if self.check_command("mpremote").await {
            self.upload_with_mpremote(&python_file, &options.device_id).await
        } else if self.check_command("ampy").await {
            self.upload_with_ampy(&python_file, &options.device_id).await
        } else if self.check_command("rshell").await {
            self.upload_with_rshell(&python_file, &options.device_id).await
        } else {
            Err(anyhow!("未找到MicroPython上传工具 (mpremote, ampy, rshell)"))
        };

        // 清理临时文件
        let _ = fs::remove_dir_all(&temp_dir);
        
        result
    }

    /// 使用Arduino CLI上传
    async fn upload_with_arduino_cli(&self, sketch_file: &Path, port: &str, board_config: &BoardConfig) -> Result<String> {
        info!("使用Arduino CLI上传代码...");
        
        // 编译代码
        let compile_output = AsyncCommand::new("arduino-cli")
            .args(&[
                "compile",
                "--fqbn", &board_config.fqbn,
                sketch_file.parent().unwrap().to_str().unwrap(),
            ])
            .output()
            .await?;

        if !compile_output.status.success() {
            let error_msg = String::from_utf8_lossy(&compile_output.stderr);
            return Err(anyhow!("Arduino代码编译失败: {}", error_msg));
        }

        info!("Arduino代码编译成功，开始上传...");

        // 上传代码
        let upload_output = AsyncCommand::new("arduino-cli")
            .args(&[
                "upload",
                "--fqbn", &board_config.fqbn,
                "--port", port,
                sketch_file.parent().unwrap().to_str().unwrap(),
            ])
            .output()
            .await?;

        if upload_output.status.success() {
            Ok(format!("Arduino代码已成功上传到端口 {}", port))
        } else {
            let error_msg = String::from_utf8_lossy(&upload_output.stderr);
            Err(anyhow!("Arduino代码上传失败: {}", error_msg))
        }
    }

    /// 使用PlatformIO上传
    async fn upload_with_platformio(&self, sketch_file: &Path, port: &str, board_config: &BoardConfig) -> Result<String> {
        info!("使用PlatformIO上传代码...");
        
        // 创建platformio.ini文件
        let project_dir = sketch_file.parent().unwrap();
        let platformio_ini = project_dir.join("platformio.ini");
        
        let ini_content = self.generate_platformio_ini(board_config, port);
        fs::write(&platformio_ini, ini_content)?;

        // 创建src目录并移动代码文件
        let src_dir = project_dir.join("src");
        fs::create_dir_all(&src_dir)?;
        let main_cpp = src_dir.join("main.cpp");
        fs::copy(sketch_file, &main_cpp)?;

        // 使用PlatformIO编译和上传
        let output = AsyncCommand::new("pio")
            .args(&["run", "--target", "upload"])
            .current_dir(project_dir)
            .output()
            .await?;

        if output.status.success() {
            Ok(format!("代码已通过PlatformIO成功上传到端口 {}", port))
        } else {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            Err(anyhow!("PlatformIO上传失败: {}", error_msg))
        }
    }

    /// 使用mpremote上传MicroPython代码
    async fn upload_with_mpremote(&self, python_file: &Path, port: &str) -> Result<String> {
        info!("使用mpremote上传MicroPython代码...");
        
        let output = AsyncCommand::new("mpremote")
            .args(&[
                "mount", 
                python_file.parent().unwrap().to_str().unwrap(),
                "exec",
                &format!("exec(open('{}').read())", python_file.file_name().unwrap().to_str().unwrap()),
            ])
            .output()
            .await?;

        if output.status.success() {
            Ok(format!("MicroPython代码已通过mpremote成功上传到端口 {}", port))
        } else {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            Err(anyhow!("mpremote上传失败: {}", error_msg))
        }
    }

    /// 使用ampy上传MicroPython代码
    async fn upload_with_ampy(&self, python_file: &Path, port: &str) -> Result<String> {
        info!("使用ampy上传MicroPython代码...");
        
        let output = AsyncCommand::new("ampy")
            .args(&[
                "--port", port,
                "put", 
                python_file.to_str().unwrap(),
                "main.py"
            ])
            .output()
            .await?;

        if output.status.success() {
            Ok(format!("MicroPython代码已通过ampy成功上传到端口 {}", port))
        } else {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            Err(anyhow!("ampy上传失败: {}", error_msg))
        }
    }

    /// 使用rshell上传MicroPython代码
    async fn upload_with_rshell(&self, python_file: &Path, port: &str) -> Result<String> {
        info!("使用rshell上传MicroPython代码...");
        
        let rshell_script = format!(
            "connect serial {}\ncp {} /pyboard/main.py\nrepl ~\n",
            port,
            python_file.to_str().unwrap()
        );
        
        let temp_script = std::env::temp_dir().join("rshell_upload.txt");
        fs::write(&temp_script, rshell_script)?;
        
        let output = AsyncCommand::new("rshell")
            .args(&["--file", temp_script.to_str().unwrap()])
            .output()
            .await?;

        let _ = fs::remove_file(&temp_script);

        if output.status.success() {
            Ok(format!("MicroPython代码已通过rshell成功上传到端口 {}", port))
        } else {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            Err(anyhow!("rshell上传失败: {}", error_msg))
        }
    }

    /// 检查所需工具是否已安装
    pub async fn check_tools(&self) -> Result<HashMap<String, bool>> {
        let mut tools = HashMap::new();
        
        tools.insert("arduino-cli".to_string(), self.check_arduino_cli().await);
        tools.insert("platformio".to_string(), self.check_command("pio").await);
        tools.insert("mpremote".to_string(), self.check_command("mpremote").await);
        tools.insert("ampy".to_string(), self.check_command("ampy").await);
        tools.insert("rshell".to_string(), self.check_command("rshell").await);
        tools.insert("esptool".to_string(), self.check_command("esptool.py").await);
        
        Ok(tools)
    }

    /// 检查Arduino CLI是否可用
    async fn check_arduino_cli(&self) -> bool {
        self.check_command("arduino-cli").await
    }

    /// 检查命令是否可用
    async fn check_command(&self, command: &str) -> bool {
        AsyncCommand::new(command)
            .arg("--version")
            .output()
            .await
            .map(|output| output.status.success())
            .unwrap_or(false)
    }

    /// 安装缺失的工具
    pub async fn install_missing_tools(&self) -> Result<Vec<String>> {
        let mut installed = Vec::new();
        
        // 安装Arduino CLI
        if !self.check_arduino_cli().await {
            match self.install_arduino_cli().await {
                Ok(_) => installed.push("Arduino CLI".to_string()),
                Err(e) => warn!("安装Arduino CLI失败: {}", e),
            }
        }
        
        // 安装Python工具
        if !self.check_command("mpremote").await {
            match self.install_python_tool("mpremote").await {
                Ok(_) => installed.push("mpremote".to_string()),
                Err(e) => warn!("安装mpremote失败: {}", e),
            }
        }
        
        Ok(installed)
    }

    /// 安装Arduino CLI
    async fn install_arduino_cli(&self) -> Result<()> {
        info!("尝试安装Arduino CLI...");
        
        #[cfg(target_os = "windows")]
        {
            // Windows: 使用winget或下载安装包
            let output = AsyncCommand::new("winget")
                .args(&["install", "ArduinoSA.ArduinoCLI"])
                .output()
                .await;
                
            match output {
                Ok(result) if result.status.success() => Ok(()),
                _ => Err(anyhow!("请手动安装Arduino CLI: https://arduino.github.io/arduino-cli/")),
            }
        }
        
        #[cfg(target_os = "macos")]
        {
            // macOS: 使用Homebrew
            let output = AsyncCommand::new("brew")
                .args(&["install", "arduino-cli"])
                .output()
                .await;
                
            match output {
                Ok(result) if result.status.success() => Ok(()),
                _ => Err(anyhow!("请手动安装Arduino CLI: brew install arduino-cli")),
            }
        }
        
        #[cfg(target_os = "linux")]
        {
            // Linux: 下载二进制文件
            Err(anyhow!("请手动安装Arduino CLI: https://arduino.github.io/arduino-cli/"))
        }
    }

    /// 安装Python工具
    async fn install_python_tool(&self, tool: &str) -> Result<()> {
        info!("尝试安装Python工具: {}", tool);
        
        let output = AsyncCommand::new("pip")
            .args(&["install", tool])
            .output()
            .await;
            
        match output {
            Ok(result) if result.status.success() => Ok(()),
            _ => {
                // 尝试使用pip3
                let output3 = AsyncCommand::new("pip3")
                    .args(&["install", tool])
                    .output()
                    .await;
                    
                match output3 {
                    Ok(result) if result.status.success() => Ok(()),
                    _ => Err(anyhow!("安装{}失败，请手动执行: pip install {}", tool, tool)),
                }
            }
        }
    }

    /// 创建临时项目目录
    async fn create_temp_project(&self, code: &str, extension: &str) -> Result<PathBuf> {
        let temp_dir = std::env::temp_dir().join(format!("rustblock_{}", chrono::Utc::now().timestamp()));
        fs::create_dir_all(&temp_dir)?;
        
        let code_file = temp_dir.join(format!("sketch.{}", extension));
        fs::write(&code_file, code)?;
        
        Ok(temp_dir)
    }

    /// 生成platformio.ini配置
    fn generate_platformio_ini(&self, board_config: &BoardConfig, port: &str) -> String {
        format!(
            "[env:default]
platform = {}
board = {}
upload_port = {}
upload_speed = {}
monitor_speed = 9600
",
            self.get_platform_for_board(&board_config.fqbn),
            self.get_board_for_fqbn(&board_config.fqbn),
            port,
            board_config.upload_speed
        )
    }

    /// 根据FQBN获取PlatformIO平台
    fn get_platform_for_board(&self, fqbn: &str) -> &str {
        if fqbn.starts_with("arduino:avr") {
            "atmelavr"
        } else if fqbn.starts_with("esp32:") {
            "espressif32"
        } else if fqbn.starts_with("rp2040:") {
            "raspberrypi"
        } else {
            "arduino"
        }
    }

    /// 根据FQBN获取PlatformIO开发板
    fn get_board_for_fqbn(&self, fqbn: &str) -> &str {
        if fqbn.contains("uno") {
            "uno"
        } else if fqbn.contains("nano") {
            "nanoatmega328"
        } else if fqbn.contains("esp32") {
            "esp32dev"
        } else if fqbn.contains("rpipico") {
            "pico"
        } else {
            "uno"
        }
    }

    /// 解析设备类型
    fn parse_device_type(&self, board_type: &str) -> Result<DeviceType> {
        match board_type.to_lowercase().as_str() {
            s if s.contains("arduino") => Ok(DeviceType::Arduino),
            s if s.contains("esp32") => Ok(DeviceType::ESP32),
            s if s.contains("microbit") || s.contains("micro:bit") => Ok(DeviceType::MicroBit),
            s if s.contains("pico") => Ok(DeviceType::RaspberryPiPico),
            _ => Err(anyhow!("不支持的设备类型: {}", board_type)),
        }
    }

    /// 获取默认开发板配置
    fn get_default_board_config(&self, device_type: &DeviceType) -> Result<BoardConfig> {
        self.board_configs
            .get(device_type)
            .and_then(|configs| configs.first())
            .cloned()
            .ok_or_else(|| anyhow!("未找到设备类型 {:?} 的配置", device_type))
    }

    /// 获取Arduino库列表
    pub async fn list_arduino_libraries(&self) -> Result<Vec<String>> {
        if !self.check_arduino_cli().await {
            return Err(anyhow!("Arduino CLI未安装"));
        }
        
        let output = AsyncCommand::new("arduino-cli")
            .args(&["lib", "list"])
            .output()
            .await?;
        
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let libraries: Vec<String> = stdout
                .lines()
                .filter(|line| !line.trim().is_empty() && !line.starts_with("Name"))
                .map(|line| {
                    line.split_whitespace()
                        .next()
                        .unwrap_or("")
                        .to_string()
                })
                .filter(|name| !name.is_empty())
                .collect();
            Ok(libraries)
        } else {
            Err(anyhow!("获取Arduino库列表失败"))
        }
    }

    /// 安装Arduino库
    pub async fn install_arduino_library(&self, library_name: &str) -> Result<String> {
        if !self.check_arduino_cli().await {
            return Err(anyhow!("Arduino CLI未安装"));
        }
        
        info!("安装Arduino库: {}", library_name);
        
        let output = AsyncCommand::new("arduino-cli")
            .args(&["lib", "install", library_name])
            .output()
            .await?;
        
        if output.status.success() {
            Ok(format!("Arduino库 {} 安装成功", library_name))
        } else {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            Err(anyhow!("安装Arduino库失败: {}", error_msg))
        }
    }
} 