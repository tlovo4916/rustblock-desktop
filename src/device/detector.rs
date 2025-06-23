use super::{DeviceInfo, DeviceType, driver::DriverManager, connection_manager::ConnectionManager};
use anyhow::{Result, anyhow};
use serialport::SerialPortType;
use std::collections::{HashMap, HashSet};
use log::{debug, info, warn};
use std::sync::Arc;

pub struct DeviceDetector {
    devices: HashMap<String, DeviceInfo>,
    driver_manager: DriverManager,
    connection_manager: Arc<ConnectionManager>,
}

impl DeviceDetector {
    pub fn new() -> Self {
        Self {
            devices: HashMap::new(),
            driver_manager: DriverManager::new(),
            connection_manager: Arc::new(ConnectionManager::new()),
        }
    }

    /// 获取连接管理器的引用
    pub fn connection_manager(&self) -> Arc<ConnectionManager> {
        Arc::clone(&self.connection_manager)
    }

    /// 扫描所有可用的串口设备
    pub fn scan_devices(&mut self) -> Result<Vec<DeviceInfo>> {
        info!("开始扫描设备...");
        let ports = serialport::available_ports()
            .map_err(|e| anyhow!("扫描串口设备失败: {}", e))?;
        
        self.devices.clear();
        let mut detected_devices = Vec::new();
        let mut seen_hardware = HashSet::new();
        let mut filtered_ports = Vec::new();

        // 首先过滤掉不需要的端口
        for port in ports {
            debug!("发现串口: {}", port.port_name);
            
            let port_name_lower = port.port_name.to_lowercase();
            
            // 过滤掉调试端口和蓝牙端口
            if port_name_lower.contains("debug-console") ||
               port_name_lower.contains("bluetooth-incoming-port") ||
               port_name_lower.contains("ams") ||
               port_name_lower.contains("airpods") {
                info!("跳过系统端口: {}", port.port_name);
                continue;
            }
            
            // 对于macOS的成对端口（/dev/cu.* 和 /dev/tty.*），优先选择cu端口
            if port.port_name.starts_with("/dev/tty.") {
                let cu_port = port.port_name.replace("/dev/tty.", "/dev/cu.");
                // 检查是否存在对应的cu端口
                let has_cu_port = serialport::available_ports()
                    .unwrap_or_default()
                    .iter()
                    .any(|p| p.port_name == cu_port);
                
                if has_cu_port {
                    info!("跳过tty端口，优先使用cu端口: {} -> {}", port.port_name, cu_port);
                    continue;
                }
            }
            
            filtered_ports.push(port);
        }

        for port in filtered_ports {
            let (vendor_id, product_id) = match &port.port_type {
                SerialPortType::UsbPort(usb_info) => {
                    (Some(usb_info.vid), Some(usb_info.pid))
                },
                _ => (None, None),
            };

            // 创建硬件标识符用于去重检查
            let hardware_id = match (vendor_id, product_id) {
                (Some(vid), Some(pid)) => format!("{:04x}:{:04x}", vid, pid),
                _ => {
                    // 对于没有VID/PID的设备，使用端口基本名称（去掉cu/tty前缀）
                    let base_name = if port.port_name.starts_with("/dev/cu.") {
                        port.port_name.strip_prefix("/dev/cu.").unwrap_or(&port.port_name)
                    } else if port.port_name.starts_with("/dev/tty.") {
                        port.port_name.strip_prefix("/dev/tty.").unwrap_or(&port.port_name)
                    } else {
                        &port.port_name
                    };
                    base_name.to_string()
                }
            };

            // 检查是否已经检测到相同的硬件设备
            if seen_hardware.contains(&hardware_id) {
                info!("跳过重复设备: {} (硬件ID: {})", port.port_name, hardware_id);
                continue;
            }
            
            seen_hardware.insert(hardware_id.clone());

            let mut device_info = DeviceInfo::new(
                port.port_name.clone(),
                vendor_id,
                product_id,
            );

            // 获取额外的设备信息
            if let SerialPortType::UsbPort(usb_info) = &port.port_type {
                device_info.manufacturer = usb_info.manufacturer.clone();
                device_info.description = usb_info.product.clone();
            }

            // 记录设备详细信息用于调试
            if let (Some(vid), Some(pid)) = (device_info.vendor_id, device_info.product_id) {
                info!("检测到设备: {} (类型: {:?}) - VID:0x{:04x}, PID:0x{:04x}", 
                      device_info.name, device_info.device_type, vid, pid);
            } else {
                info!("检测到设备: {} (类型: {:?}) - 无VID/PID信息", 
                      device_info.name, device_info.device_type);
            }
            
            // 检查设备ID是否已存在（额外的安全检查）
            if !self.devices.contains_key(&device_info.id) {
                self.devices.insert(device_info.id.clone(), device_info.clone());
                detected_devices.push(device_info);
            } else {
                warn!("设备ID冲突，跳过: {}", device_info.id);
            }
        }

        info!("扫描完成，共发现 {} 个唯一设备", detected_devices.len());
        Ok(detected_devices)
    }

    /// 获取指定设备的详细信息
    pub fn get_device(&self, device_id: &str) -> Option<&DeviceInfo> {
        self.devices.get(device_id)
    }

    /// 检查设备是否支持指定的编程语言
    pub fn supports_language(&self, device_id: &str, language: &str) -> bool {
        if let Some(device) = self.get_device(device_id) {
            match (&device.device_type, language) {
                (DeviceType::Arduino, "arduino") => true,
                (DeviceType::ESP32, "arduino") => true,
                (DeviceType::ESP32, "micropython") => true,
                (DeviceType::MicroBit, "micropython") => true,
                (DeviceType::RaspberryPiPico, "micropython") => true,
                (DeviceType::RaspberryPiPico, "arduino") => true,
                _ => false,
            }
        } else {
            false
        }
    }

    /// 根据设备类型获取推荐的编程语言
    pub fn get_recommended_language(&self, device_id: &str) -> Option<&'static str> {
        self.get_device(device_id).map(|device| {
            match device.device_type {
                DeviceType::Arduino => "arduino",
                DeviceType::ESP32 => "arduino", // ESP32默认推荐Arduino，但也支持MicroPython
                DeviceType::MicroBit => "micropython",
                DeviceType::RaspberryPiPico => "micropython",
                DeviceType::Unknown => "arduino", // 默认
            }
        })
    }

    /// 获取设备的波特率配置
    pub fn get_baud_rate(&self, device_id: &str) -> u32 {
        if let Some(device) = self.get_device(device_id) {
            match device.device_type {
                DeviceType::Arduino => 9600,
                DeviceType::ESP32 => 115200,
                DeviceType::MicroBit => 115200,
                DeviceType::RaspberryPiPico => 115200,
                DeviceType::Unknown => 9600,
            }
        } else {
            9600
        }
    }

    /// 检查设备驱动状态
    pub async fn check_device_drivers(&mut self) -> Result<()> {
        info!("检查设备驱动状态...");
        
        // 重新扫描已安装的驱动程序
        let installed_drivers = self.driver_manager.scan_installed_drivers().await?;
        info!("扫描到 {} 个已安装的驱动程序", installed_drivers.len());
        
        // 重新扫描设备
        let devices = self.scan_devices()?;
        info!("重新扫描设备，发现 {} 个设备", devices.len());
        
        // 更新设备列表 - 将Vec转换为HashMap
        self.devices.clear();
        for device in devices {
            self.devices.insert(device.id.clone(), device);
        }
        
        Ok(())
    }

    /// 获取设备的驱动信息
    pub fn get_device_driver_info(&self, device_id: &str) -> Option<(bool, Option<super::driver::DriverInfo>)> {
        if let Some(device) = self.get_device(device_id) {
            if let (Some(vid), Some(pid)) = (device.vendor_id, device.product_id) {
                let (installed, driver_info) = self.driver_manager.check_device_driver(vid, pid);
                return Some((installed, driver_info.cloned()));
            }
        }
        None
    }

    /// 安装设备驱动
    pub async fn install_device_driver(&mut self, device_id: &str) -> Result<String> {
        if let Some(device) = self.get_device(device_id) {
            // 首先检查设备是否已经有驱动
            if let (Some(vid), Some(pid)) = (device.vendor_id, device.product_id) {
                let (driver_installed, _) = self.driver_manager.check_device_driver(vid, pid);
                if driver_installed {
                    return Ok("设备驱动已安装！".to_string());
                }
                
                // 尝试根据VID/PID获取驱动
                if let Some(driver) = self.driver_manager.get_required_driver(vid, pid) {
                    let driver_name = driver.name.clone();
                    // 获取驱动键名（简化版，实际应该有更好的映射）
                    let driver_key = match vid {
                        0x1a86 => "ch340",
                        0x2341 => "arduino_usb",
                        0x10c4 => "cp210x",
                        0x0d28 => "microbit_usb",
                        0x2e8a => "pico_usb",
                        _ => return Err(anyhow!("不支持的设备类型：VID:0x{:04x}, PID:0x{:04x}", vid, pid)),
                    };
                    return self.driver_manager.install_driver(driver_key).await;
                }
            }
            
            // 如果没有VID/PID或者找不到匹配的驱动，根据设备类型推断
            match device.device_type {
                DeviceType::Arduino => {
                    // Arduino 设备，尝试安装CH340驱动（最常见）
                    warn!("设备 {} 没有VID/PID信息，根据设备类型推断安装CH340驱动", device_id);
                    self.driver_manager.install_driver("ch340").await
                },
                DeviceType::ESP32 => {
                    warn!("设备 {} 没有VID/PID信息，根据设备类型推断安装CP210x驱动", device_id);
                    self.driver_manager.install_driver("cp210x").await
                },
                DeviceType::MicroBit => {
                    warn!("设备 {} 没有VID/PID信息，根据设备类型推断安装micro:bit驱动", device_id);
                    self.driver_manager.install_driver("microbit_usb").await
                },
                DeviceType::RaspberryPiPico => {
                    warn!("设备 {} 没有VID/PID信息，根据设备类型推断安装Pico驱动", device_id);
                    self.driver_manager.install_driver("pico_usb").await
                },
                DeviceType::Unknown => {
                    warn!("设备 {} 类型未知，尝试安装通用串口驱动", device_id);
                    // 对于未知设备，提供通用的驱动安装建议
                    Ok(format!(
                        "设备类型未知，请手动安装驱动：\n\
                        1. 如果是Arduino设备，请尝试CH340驱动\n\
                        2. 如果是ESP32设备，请尝试CP210x驱动\n\
                        3. 或者让Windows自动搜索驱动程序\n\
                        设备信息：端口={}, 制造商={:?}",
                        device.port, device.manufacturer
                    ))
                }
            }
        } else {
            Err(anyhow!("未找到设备: {}", device_id))
        }
    }

    /// 获取所有可用驱动列表
    pub fn get_available_drivers(&self) -> Vec<super::driver::DriverInfo> {
        self.driver_manager.get_all_drivers()
    }

    /// 获取已安装驱动列表
    pub fn get_installed_drivers(&self) -> Vec<super::driver::DriverInfo> {
        self.driver_manager.get_installed_drivers()
    }

    /// 检测设备是否准备就绪（已连接且驱动已安装）
    pub fn is_device_ready(&self, device_id: &str) -> bool {
        if let Some(device) = self.get_device(device_id) {
            if let (Some(vid), Some(pid)) = (device.vendor_id, device.product_id) {
                let (driver_installed, _) = self.driver_manager.check_device_driver(vid, pid);
                return driver_installed;
            }
        }
        false
    }

    /// 获取设备详细状态信息
    pub fn get_device_status(&self, device_id: &str) -> Option<DeviceStatus> {
        if let Some(device) = self.get_device(device_id) {
            let driver_status = if let (Some(vid), Some(pid)) = (device.vendor_id, device.product_id) {
                let (installed, driver_info) = self.driver_manager.check_device_driver(vid, pid);
                Some(DriverStatus {
                    installed,
                    driver_info: driver_info.cloned(),
                })
            } else {
                None
            };

            return Some(DeviceStatus {
                device_info: device.clone(),
                driver_status,
                ready: self.is_device_ready(device_id),
                recommended_language: self.get_recommended_language(device_id).map(|s| s.to_string()),
                supported_languages: self.get_supported_languages(device_id),
            });
        }
        None
    }

    /// 获取设备支持的编程语言列表
    pub fn get_supported_languages(&self, device_id: &str) -> Vec<String> {
        if let Some(device) = self.get_device(device_id) {
            match device.device_type {
                DeviceType::Arduino => vec!["arduino".to_string()],
                DeviceType::ESP32 => vec!["arduino".to_string(), "micropython".to_string()],
                DeviceType::MicroBit => vec!["micropython".to_string()],
                DeviceType::RaspberryPiPico => vec!["micropython".to_string(), "arduino".to_string()],
                DeviceType::Unknown => vec!["arduino".to_string()],
            }
        } else {
            vec![]
        }
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DeviceStatus {
    pub device_info: DeviceInfo,
    pub driver_status: Option<DriverStatus>,
    pub ready: bool,
    pub recommended_language: Option<String>,
    pub supported_languages: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DriverStatus {
    pub installed: bool,
    pub driver_info: Option<super::driver::DriverInfo>,
} 