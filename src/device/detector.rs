use super::{DeviceInfo, DeviceType};
use anyhow::{Result, anyhow};
use serialport::{SerialPortInfo, SerialPortType};
use std::collections::HashMap;
use log::{debug, info, warn};

pub struct DeviceDetector {
    devices: HashMap<String, DeviceInfo>,
}

impl DeviceDetector {
    pub fn new() -> Self {
        Self {
            devices: HashMap::new(),
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
} 