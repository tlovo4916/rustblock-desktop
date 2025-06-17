use anyhow::{Result, anyhow};
use std::process::Command;
use log::{info, error, debug, warn};
use std::collections::HashMap;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriverInfo {
    pub name: String,
    pub version: Option<String>,
    pub vendor_id: u16,
    pub product_id: u16,
    pub description: String,
    pub installed: bool,
    pub required_for_devices: Vec<super::DeviceType>,
}

pub struct DriverManager {
    drivers: HashMap<String, DriverInfo>,
}

impl DriverManager {
    pub fn new() -> Self {
        let mut manager = Self {
            drivers: HashMap::new(),
        };
        manager.initialize_driver_database();
        manager
    }

    /// 初始化驱动程序数据库
    fn initialize_driver_database(&mut self) {
        // Arduino Uno/Nano CH340 驱动
        self.drivers.insert("ch340".to_string(), DriverInfo {
            name: "CH340/CH341 USB Serial Driver".to_string(),
            version: None,
            vendor_id: 0x1a86,
            product_id: 0x7523,
            description: "CH340/CH341 USB to Serial converter driver".to_string(),
            installed: false,
            required_for_devices: vec![super::DeviceType::Arduino, super::DeviceType::ESP32],
        });

        // Arduino 官方驱动
        self.drivers.insert("arduino_usb".to_string(), DriverInfo {
            name: "Arduino USB Driver".to_string(),
            version: None,
            vendor_id: 0x2341,
            product_id: 0x0043,
            description: "Official Arduino USB driver".to_string(),
            installed: false,
            required_for_devices: vec![super::DeviceType::Arduino],
        });

        // CP210x 驱动 (ESP32 常用)
        self.drivers.insert("cp210x".to_string(), DriverInfo {
            name: "Silicon Labs CP210x USB to UART Bridge".to_string(),
            version: None,
            vendor_id: 0x10c4,
            product_id: 0xea60,
            description: "CP210x USB to Serial converter driver".to_string(),
            installed: false,
            required_for_devices: vec![super::DeviceType::ESP32],
        });

        // micro:bit 驱动
        self.drivers.insert("microbit_usb".to_string(), DriverInfo {
            name: "micro:bit USB Driver".to_string(),
            version: None,
            vendor_id: 0x0d28,
            product_id: 0x0204,
            description: "BBC micro:bit USB interface driver".to_string(),
            installed: false,
            required_for_devices: vec![super::DeviceType::MicroBit],
        });

        // 树莓派 Pico 驱动
        self.drivers.insert("pico_usb".to_string(), DriverInfo {
            name: "Raspberry Pi Pico USB Driver".to_string(),
            version: None,
            vendor_id: 0x2e8a,
            product_id: 0x0005,
            description: "Raspberry Pi Pico USB interface driver".to_string(),
            installed: false,
            required_for_devices: vec![super::DeviceType::RaspberryPiPico],
        });
    }

    /// 检查系统中已安装的驱动程序
    pub async fn scan_installed_drivers(&mut self) -> Result<Vec<DriverInfo>> {
        info!("扫描已安装的驱动程序...");
        
        #[cfg(target_os = "windows")]
        {
            self.scan_windows_drivers().await
        }
        
        #[cfg(target_os = "macos")]
        {
            self.scan_macos_drivers().await
        }
        
        #[cfg(target_os = "linux")]
        {
            self.scan_linux_drivers().await
        }
    }

    #[cfg(target_os = "windows")]
    async fn scan_windows_drivers(&mut self) -> Result<Vec<DriverInfo>> {
        debug!("扫描Windows驱动程序...");
        
        // 使用PowerShell命令检查USB设备和驱动程序
        let output = tokio::process::Command::new("powershell")
            .args(&[
                "-Command", 
                "Get-WmiObject Win32_PnPEntity | Where-Object {$_.DeviceID -like '*USB*'} | Select-Object Name, DeviceID, Status"
            ])
            .output()
            .await;

        match output {
            Ok(output) => {
                let output_str = String::from_utf8_lossy(&output.stdout);
                self.parse_windows_driver_output(&output_str);
            },
            Err(e) => {
                warn!("无法获取Windows驱动信息: {}", e);
            }
        }

        // 也尝试使用driverquery命令
        let driver_output = tokio::process::Command::new("driverquery")
            .args(&["/v", "/fo", "csv"])
            .output()
            .await;

        if let Ok(output) = driver_output {
            let output_str = String::from_utf8_lossy(&output.stdout);
            self.parse_driverquery_output(&output_str);
        }

        Ok(self.get_installed_drivers())
    }

    #[cfg(target_os = "macos")]
    async fn scan_macos_drivers(&mut self) -> Result<Vec<DriverInfo>> {
        debug!("扫描macOS驱动程序...");
        
        // 使用system_profiler检查USB设备
        let output = tokio::process::Command::new("system_profiler")
            .args(&["SPUSBDataType", "-json"])
            .output()
            .await;

        match output {
            Ok(output) => {
                let output_str = String::from_utf8_lossy(&output.stdout);
                self.parse_macos_usb_output(&output_str);
            },
            Err(e) => {
                warn!("无法获取macOS USB信息: {}", e);
            }
        }

        // 检查内核扩展
        let kext_output = tokio::process::Command::new("kextstat")
            .output()
            .await;

        if let Ok(output) = kext_output {
            let output_str = String::from_utf8_lossy(&output.stdout);
            self.parse_kext_output(&output_str);
        }

        Ok(self.get_installed_drivers())
    }

    #[cfg(target_os = "linux")]
    async fn scan_linux_drivers(&mut self) -> Result<Vec<DriverInfo>> {
        debug!("扫描Linux驱动程序...");
        
        // 使用lsusb检查USB设备
        let output = tokio::process::Command::new("lsusb")
            .args(&["-v"])
            .output()
            .await;

        match output {
            Ok(output) => {
                let output_str = String::from_utf8_lossy(&output.stdout);
                self.parse_lsusb_output(&output_str);
            },
            Err(e) => {
                warn!("无法获取Linux USB信息: {}", e);
            }
        }

        // 检查已加载的内核模块
        let lsmod_output = tokio::process::Command::new("lsmod")
            .output()
            .await;

        if let Ok(output) = lsmod_output {
            let output_str = String::from_utf8_lossy(&output.stdout);
            self.parse_lsmod_output(&output_str);
        }

        Ok(self.get_installed_drivers())
    }

    /// 根据设备VID/PID获取所需驱动
    pub fn get_required_driver(&self, vendor_id: u16, product_id: u16) -> Option<&DriverInfo> {
        debug!("查找驱动: VID:0x{:04x}, PID:0x{:04x}", vendor_id, product_id);
        
        let result = self.drivers.values().find(|driver| {
            driver.vendor_id == vendor_id && driver.product_id == product_id
        });
        
        match result {
            Some(driver) => {
                debug!("找到匹配的驱动: {}", driver.name);
                Some(driver)
            },
            None => {
                debug!("未找到匹配的驱动，支持的VID/PID组合：");
                for (key, driver) in &self.drivers {
                    debug!("  {} - VID:0x{:04x}, PID:0x{:04x}", 
                           key, driver.vendor_id, driver.product_id);
                }
                None
            }
        }
    }

    /// 检查特定设备是否有可用驱动
    pub fn check_device_driver(&self, vendor_id: u16, product_id: u16) -> (bool, Option<&DriverInfo>) {
        if let Some(driver) = self.get_required_driver(vendor_id, product_id) {
            (driver.installed, Some(driver))
        } else {
            (false, None)
        }
    }

    /// 安装驱动程序
    pub async fn install_driver(&mut self, driver_name: &str) -> Result<String> {
        info!("尝试安装驱动程序: {}", driver_name);
        
        if let Some(driver) = self.drivers.get(driver_name) {
            if driver.installed {
                return Ok(format!("驱动程序 {} 已经安装", driver.name));
            }

            #[cfg(target_os = "windows")]
            {
                self.install_windows_driver(driver_name).await
            }
            
            #[cfg(target_os = "macos")]
            {
                self.install_macos_driver(driver_name).await
            }
            
            #[cfg(target_os = "linux")]
            {
                self.install_linux_driver(driver_name).await
            }
        } else {
            Err(anyhow!("未找到驱动程序: {}", driver_name))
        }
    }

    /// 获取已安装的驱动程序列表
    pub fn get_installed_drivers(&self) -> Vec<DriverInfo> {
        self.drivers.values()
            .filter(|driver| driver.installed)
            .cloned()
            .collect()
    }

    /// 获取所有可用的驱动程序列表
    pub fn get_all_drivers(&self) -> Vec<DriverInfo> {
        self.drivers.values().cloned().collect()
    }

    // 平台特定的解析方法
    #[cfg(target_os = "windows")]
    fn parse_windows_driver_output(&mut self, output: &str) {
        // 解析Windows设备管理器输出
        for line in output.lines() {
            if line.contains("CH340") || line.contains("CH341") {
                if let Some(driver) = self.drivers.get_mut("ch340") {
                    driver.installed = true;
                }
            } else if line.contains("Arduino") {
                if let Some(driver) = self.drivers.get_mut("arduino_usb") {
                    driver.installed = true;
                }
            } else if line.contains("CP210") || line.contains("Silicon Labs") {
                if let Some(driver) = self.drivers.get_mut("cp210x") {
                    driver.installed = true;
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    fn parse_driverquery_output(&mut self, output: &str) {
        // 解析driverquery输出
        for line in output.lines() {
            let line_lower = line.to_lowercase();
            if line_lower.contains("ch34") {
                if let Some(driver) = self.drivers.get_mut("ch340") {
                    driver.installed = true;
                }
            } else if line_lower.contains("usbser") {
                // USB Serial driver可能用于多种设备
                debug!("检测到USB串口驱动");
            }
        }
    }

    #[cfg(target_os = "macos")]
    fn parse_macos_usb_output(&mut self, output: &str) {
        // 解析macOS USB输出 (JSON格式)
        // 这里可以使用serde_json解析JSON，但为了简化，使用字符串匹配
        if output.contains("1a86") {
            if let Some(driver) = self.drivers.get_mut("ch340") {
                driver.installed = true;
            }
        }
        if output.contains("2341") {
            if let Some(driver) = self.drivers.get_mut("arduino_usb") {
                driver.installed = true;
            }
        }
    }

    #[cfg(target_os = "macos")]
    fn parse_kext_output(&mut self, output: &str) {
        // 解析内核扩展输出
        for line in output.lines() {
            if line.contains("ch34") {
                if let Some(driver) = self.drivers.get_mut("ch340") {
                    driver.installed = true;
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    fn parse_lsusb_output(&mut self, output: &str) {
        // 解析lsusb输出
        if output.contains("1a86:7523") {
            if let Some(driver) = self.drivers.get_mut("ch340") {
                driver.installed = true;
            }
        }
        if output.contains("2341:0043") {
            if let Some(driver) = self.drivers.get_mut("arduino_usb") {
                driver.installed = true;
            }
        }
    }

    #[cfg(target_os = "linux")]
    fn parse_lsmod_output(&mut self, output: &str) {
        // 解析内核模块输出
        for line in output.lines() {
            if line.contains("ch341") || line.contains("ch340") {
                if let Some(driver) = self.drivers.get_mut("ch340") {
                    driver.installed = true;
                }
            } else if line.contains("cp210x") {
                if let Some(driver) = self.drivers.get_mut("cp210x") {
                    driver.installed = true;
                }
            } else if line.contains("cdc_acm") {
                // CDC ACM驱动用于多种USB串口设备
                debug!("检测到CDC ACM驱动");
            }
        }
    }

    // 平台特定的安装方法
    #[cfg(target_os = "windows")]
    async fn install_windows_driver(&mut self, driver_name: &str) -> Result<String> {
        match driver_name {
            "ch340" => {
                info!("开始安装CH340驱动...");
                
                // 尝试使用Windows Update安装驱动
                let pnputil_result = tokio::process::Command::new("pnputil")
                    .args(&["/scan-devices"])
                    .output()
                    .await;
                    
                if pnputil_result.is_ok() {
                    info!("触发Windows自动驱动扫描");
                    
                    // 等待一下，然后重新扫描驱动状态
                    tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
                    let _ = self.scan_windows_drivers().await;
                    
                    if let Some(driver) = self.drivers.get("ch340") {
                        if driver.installed {
                            return Ok("CH340驱动安装成功！".to_string());
                        }
                    }
                }
                
                // 如果自动安装失败，尝试下载并安装
                self.download_and_install_ch340_driver().await
            },
            "arduino_usb" => {
                info!("开始安装Arduino驱动...");
                
                // 检查是否已安装Arduino IDE
                let arduino_path_result = tokio::process::Command::new("where")
                    .args(&["arduino"])
                    .output()
                    .await;
                    
                if arduino_path_result.is_ok() {
                    Ok("Arduino驱动已随Arduino IDE安装。".to_string())
                } else {
                    Ok("建议安装Arduino IDE以获得完整的驱动支持：https://www.arduino.cc/en/software".to_string())
                }
            },
            "cp210x" => {
                info!("开始安装CP210x驱动...");
                
                // 触发Windows设备扫描
                let pnputil_result = tokio::process::Command::new("pnputil")
                    .args(&["/scan-devices"])
                    .output()
                    .await;
                    
                if pnputil_result.is_ok() {
                    tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
                    let _ = self.scan_windows_drivers().await;
                    
                    if let Some(driver) = self.drivers.get("cp210x") {
                        if driver.installed {
                            return Ok("CP210x驱动安装成功！".to_string());
                        }
                    }
                }
                
                Ok("Windows会自动安装CP210x驱动。如果仍有问题，请从Silicon Labs官网下载：https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers".to_string())
            },
            _ => {
                Ok("请手动从设备制造商网站下载并安装相应驱动程序。".to_string())
            }
        }
    }

    #[cfg(target_os = "windows")]
    async fn download_and_install_ch340_driver(&mut self) -> Result<String> {
        use std::path::Path;
        
        info!("尝试下载并安装CH340驱动...");
        
        // 创建临时目录
        let temp_dir = std::env::temp_dir().join("rustblock_drivers");
        if !temp_dir.exists() {
            std::fs::create_dir_all(&temp_dir)?;
        }
        
        // CH340驱动下载URL（这是一个示例，实际应该使用官方下载链接）
        let driver_url = "http://www.wch.cn/downloads/CH341SER_EXE.html";
        
        // 这里应该实现实际的下载和安装逻辑
        // 由于自动下载驱动涉及安全考虑，我们提供详细的手动安装指南
        
        let install_guide = format!(
                         "CH340驱动安装指南：\n\
              1. 打开浏览器访问：{}\n\
              2. 下载CH341SER.EXE驱动程序\n\
              3. 以管理员身份运行下载的驱动程序\n\
              4. 重新连接设备并刷新状态\n\
              \n\
              或者，您可以让Windows自动安装：\n\
              1. 连接设备到电脑\n\
              2. 打开设备管理器\n\
              3. 找到未知设备，右键选择\"更新驱动程序\"\n\
              4. 选择\"自动搜索驱动程序\"",
            driver_url
        );
        
        Ok(install_guide)
    }

    #[cfg(target_os = "macos")]
    async fn install_macos_driver(&mut self, driver_name: &str) -> Result<String> {
        match driver_name {
            "ch340" => {
                Ok("请从WCH官网下载CH340 macOS驱动程序。".to_string())
            },
            _ => {
                Ok("macOS通常会自动识别大多数USB设备。如有问题，请安装相应的驱动程序。".to_string())
            }
        }
    }

    #[cfg(target_os = "linux")]
    async fn install_linux_driver(&mut self, driver_name: &str) -> Result<String> {
        match driver_name {
            "ch340" => {
                // 检查内核版本和发行版
                let result = tokio::process::Command::new("sudo")
                    .args(&["modprobe", "ch341"])
                    .output()
                    .await;
                
                match result {
                    Ok(_) => {
                        if let Some(driver) = self.drivers.get_mut(driver_name) {
                            driver.installed = true;
                        }
                        Ok("CH340驱动已加载。".to_string())
                    },
                    Err(_) => {
                        Ok("请确保内核支持CH340驱动或手动编译安装。".to_string())
                    }
                }
            },
            _ => {
                Ok("Linux通常内置了大多数USB串口驱动。如有问题，请检查内核模块。".to_string())
            }
        }
    }
} 