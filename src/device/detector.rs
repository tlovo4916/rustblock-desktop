use super::{DeviceInfo, DeviceType, driver::DriverManager};
use anyhow::{Result, anyhow};
use serialport::{SerialPortInfo, SerialPortType};
use std::collections::HashMap;
use log::{debug, info, warn};

pub struct DeviceDetector {
    devices: HashMap<String, DeviceInfo>,
    driver_manager: DriverManager,
}

impl DeviceDetector {
    pub fn new() -> Self {
        Self {
            devices: HashMap::new(),
            driver_manager: DriverManager::new(),
        }
    }

    /// 扫描所有可用的串口设备
    pub fn scan_devices(&mut self) -> Result<Vec<DeviceInfo>> {
        info!("开始扫描设备...");
        let ports = serialport::available_ports()
            .map_err(|e| anyhow!("扫描串口设备失败: {}", e))?;
        
        self.devices.clear();
        let mut detected_devices = Vec::new();

        for port in ports {
            debug!("发现串口: {}", port.port_name);
            
            let (vendor_id, product_id) = match &port.port_type {
                SerialPortType::UsbPort(usb_info) => {
                    (Some(usb_info.vid), Some(usb_info.pid))
                },
                _ => (None, None),
            };

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

            info!("检测到设备: {} (类型: {:?})", device_info.name, device_info.device_type);
            
            self.devices.insert(device_info.id.clone(), device_info.clone());
            detected_devices.push(device_info);
        }

        info!("共发现 {} 个设备", detected_devices.len());
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
        let _ = self.driver_manager.scan_installed_drivers().await?;
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
            if let (Some(vid), Some(pid)) = (device.vendor_id, device.product_id) {
                if let Some(driver) = self.driver_manager.get_required_driver(vid, pid) {
                    let driver_name = driver.name.clone();
                    // 获取驱动键名（简化版，实际应该有更好的映射）
                    let driver_key = match vid {
                        0x1a86 => "ch340",
                        0x2341 => "arduino_usb",
                        0x10c4 => "cp210x",
                        0x0d28 => "microbit_usb",
                        0x2e8a => "pico_usb",
                        _ => return Err(anyhow!("不支持的设备类型")),
                    };
                    return self.driver_manager.install_driver(driver_key).await;
                }
            }
        }
        Err(anyhow!("未找到设备或驱动信息"))
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