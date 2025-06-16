pub mod detector;
pub mod serial;
pub mod uploader;
pub mod driver;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, Eq, Hash, PartialEq)]
pub enum DeviceType {
    Arduino,
    MicroBit,
    ESP32,
    RaspberryPiPico,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub id: String,
    pub name: String,
    pub device_type: DeviceType,
    pub port: String,
    pub vendor_id: Option<u16>,
    pub product_id: Option<u16>,
    pub manufacturer: Option<String>,
    pub description: Option<String>,
    pub connected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadOptions {
    pub device_id: String,
    pub code: String,
    pub language: String, // "arduino" 或 "micropython"
    pub board_type: String,
}

impl DeviceInfo {
    pub fn new(port: String, vendor_id: Option<u16>, product_id: Option<u16>) -> Self {
        let device_type = Self::detect_device_type(vendor_id, product_id);
        let name = Self::generate_device_name(&device_type, &port);
        
        Self {
            id: format!("{}_{}", port, chrono::Utc::now().timestamp()),
            name,
            device_type,
            port,
            vendor_id,
            product_id,
            manufacturer: None,
            description: None,
            connected: false,
        }
    }
    
    fn detect_device_type(vendor_id: Option<u16>, product_id: Option<u16>) -> DeviceType {
        match (vendor_id, product_id) {
            // Arduino Uno (官方)
            (Some(0x2341), Some(0x0043)) => DeviceType::Arduino,
            (Some(0x2341), Some(0x0001)) => DeviceType::Arduino,
            // Arduino Nano (CH340芯片)
            (Some(0x1a86), Some(0x7523)) => DeviceType::Arduino,
            // micro:bit
            (Some(0x0d28), Some(0x0204)) => DeviceType::MicroBit,
            // ESP32 (CP210x芯片)
            (Some(0x10c4), Some(0xea60)) => DeviceType::ESP32,
            // ESP32 (其他芯片)
            (Some(0x303a), Some(0x1001)) => DeviceType::ESP32,
            // Raspberry Pi Pico
            (Some(0x2e8a), Some(0x0005)) => DeviceType::RaspberryPiPico,
            (Some(0x2e8a), Some(0x000a)) => DeviceType::RaspberryPiPico,
            _ => DeviceType::Unknown,
        }
    }
    
    fn generate_device_name(device_type: &DeviceType, port: &str) -> String {
        match device_type {
            DeviceType::Arduino => format!("Arduino on {}", port),
            DeviceType::MicroBit => format!("micro:bit on {}", port),
            DeviceType::ESP32 => format!("ESP32 on {}", port),
            DeviceType::RaspberryPiPico => format!("Raspberry Pi Pico on {}", port),
            DeviceType::Unknown => format!("Unknown Device on {}", port),
        }
    }
} 