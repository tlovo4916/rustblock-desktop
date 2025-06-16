use crate::device::{
    DeviceInfo, DeviceType, UploadOptions, 
    detector::{DeviceDetector, DeviceStatus},
    driver::DriverInfo,
    uploader::DeviceUploader,
    serial::SerialManager,
};
use anyhow::Result;
use tokio::sync::Mutex;
use tauri::{command, State};
use log::{info, error, warn};
use std::collections::HashMap;

// 全局设备检测器状态
pub type DeviceDetectorState = Mutex<DeviceDetector>;
pub type DeviceUploaderState = Mutex<DeviceUploader>;
pub type SerialManagerState = Mutex<SerialManager>;

#[command]
pub async fn scan_devices(
    detector: State<'_, DeviceDetectorState>
) -> Result<Vec<DeviceInfo>, String> {
    info!("前端请求扫描设备");
    
    let mut detector = detector.lock().await;
    
    detector.scan_devices().map_err(|e| {
        error!("扫描设备失败: {}", e);
        format!("设备扫描失败: {}", e)
    })
}

#[command]
pub async fn connect_device(
    device_id: String,
    detector: State<'_, DeviceDetectorState>
) -> Result<bool, String> {
    info!("前端请求连接设备: {}", device_id);
    
    let detector = detector.lock().await;
    
    match detector.get_device(&device_id) {
        Some(device) => {
            info!("找到设备: {}", device.name);
            // 这里可以添加实际的连接逻辑
            // 比如打开串口连接等
            Ok(true)
        },
        None => {
            error!("未找到设备: {}", device_id);
            Err(format!("未找到设备: {}", device_id))
        }
    }
}

#[command]
pub async fn disconnect_device(
    device_id: String,
    detector: State<'_, DeviceDetectorState>
) -> Result<bool, String> {
    info!("前端请求断开设备: {}", device_id);
    
    let detector = detector.lock().await;
    
    match detector.get_device(&device_id) {
        Some(device) => {
            info!("断开设备: {}", device.name);
            // 这里可以添加实际的断开连接逻辑
            Ok(true)
        },
        None => {
            error!("未找到设备: {}", device_id);
            Err(format!("未找到设备: {}", device_id))
        }
    }
}

#[command]
pub async fn upload_code(
    options: UploadOptions,
    detector: State<'_, DeviceDetectorState>,
    uploader: State<'_, DeviceUploaderState>
) -> Result<String, String> {
    info!("前端请求上传代码到设备: {}", options.device_id);
    
    let detector = detector.lock().await;
    let uploader = uploader.lock().await;
    
    match detector.get_device(&options.device_id) {
        Some(device) => {
            info!("开始上传代码到设备: {}", device.name);
            
            // 检查设备是否支持指定的编程语言
            if !detector.supports_language(&options.device_id, &options.language) {
                let recommended = detector.get_recommended_language(&options.device_id)
                    .unwrap_or("arduino");
                return Err(format!(
                    "设备 {} 不支持 {} 语言，推荐使用 {}", 
                    device.name, options.language, recommended
                ));
            }
            
            // 检查设备是否准备就绪（驱动已安装）
            if !detector.is_device_ready(&options.device_id) {
                return Err(format!("设备 {} 驱动未安装或未准备就绪", device.name));
            }
            
            // 根据设备类型和语言选择合适的上传方式
            match (&device.device_type, options.language.as_str()) {
                (DeviceType::Arduino, "arduino") => {
                    upload_arduino_code(&options, device, &uploader).await
                },
                (DeviceType::MicroBit, "micropython") => {
                    upload_micropython_code(&options, device, &uploader).await
                },
                (DeviceType::ESP32, "arduino") => {
                    upload_arduino_code(&options, device, &uploader).await
                },
                (DeviceType::ESP32, "micropython") => {
                    upload_micropython_code(&options, device, &uploader).await
                },
                (DeviceType::RaspberryPiPico, "arduino") => {
                    upload_arduino_code(&options, device, &uploader).await
                },
                (DeviceType::RaspberryPiPico, "micropython") => {
                    upload_micropython_code(&options, device, &uploader).await
                },
                _ => {
                    Err("不支持的设备类型和语言组合".to_string())
                }
            }
        },
        None => {
            error!("未找到设备: {}", options.device_id);
            Err(format!("未找到设备: {}", options.device_id))
        }
    }
}

async fn upload_arduino_code(options: &UploadOptions, device: &DeviceInfo, uploader: &DeviceUploader) -> Result<String, String> {
    info!("上传Arduino代码到设备: {}", device.name);
    
    uploader.upload_arduino_code(options).await.map_err(|e| {
        error!("Arduino代码上传失败: {}", e);
        format!("Arduino代码上传失败: {}", e)
    })
}

async fn upload_micropython_code(options: &UploadOptions, device: &DeviceInfo, uploader: &DeviceUploader) -> Result<String, String> {
    info!("上传MicroPython代码到设备: {}", device.name);
    
    uploader.upload_micropython_code(options).await.map_err(|e| {
        error!("MicroPython代码上传失败: {}", e);
        format!("MicroPython代码上传失败: {}", e)
    })
}

// 新增的设备管理命令

#[command]
pub async fn get_device_status(
    device_id: String,
    detector: State<'_, DeviceDetectorState>
) -> Result<Option<DeviceStatus>, String> {
    info!("获取设备状态: {}", device_id);
    
    let detector = detector.lock().await;
    Ok(detector.get_device_status(&device_id))
}

#[command]
pub async fn check_device_drivers(
    detector: State<'_, DeviceDetectorState>
) -> Result<(), String> {
    info!("检查设备驱动状态");
    
    let mut detector = detector.lock().await;
    detector.check_device_drivers().await.map_err(|e| {
        error!("检查设备驱动失败: {}", e);
        format!("检查设备驱动失败: {}", e)
    })
}

#[command]
pub async fn install_device_driver(
    device_id: String,
    detector: State<'_, DeviceDetectorState>
) -> Result<String, String> {
    info!("安装设备驱动: {}", device_id);
    
    let mut detector = detector.lock().await;
    detector.install_device_driver(&device_id).await.map_err(|e| {
        error!("安装设备驱动失败: {}", e);
        format!("安装设备驱动失败: {}", e)
    })
}

#[command]
pub async fn get_available_drivers(
    detector: State<'_, DeviceDetectorState>
) -> Result<Vec<DriverInfo>, String> {
    let detector = detector.lock().await;
    Ok(detector.get_available_drivers())
}

#[command]
pub async fn get_installed_drivers(
    detector: State<'_, DeviceDetectorState>
) -> Result<Vec<DriverInfo>, String> {
    let detector = detector.lock().await;
    Ok(detector.get_installed_drivers())
}

#[command]
pub async fn check_upload_tools(
    uploader: State<'_, DeviceUploaderState>
) -> Result<HashMap<String, bool>, String> {
    info!("检查上传工具");
    
    let uploader = uploader.lock().await;
    uploader.check_tools().await.map_err(|e| {
        error!("检查上传工具失败: {}", e);
        format!("检查上传工具失败: {}", e)
    })
}

#[command]
pub async fn install_missing_tools(
    uploader: State<'_, DeviceUploaderState>
) -> Result<Vec<String>, String> {
    info!("安装缺失的工具");
    
    let uploader = uploader.lock().await;
    uploader.install_missing_tools().await.map_err(|e| {
        error!("安装工具失败: {}", e);
        format!("安装工具失败: {}", e)
    })
}

#[command]
pub async fn get_arduino_libraries(
    uploader: State<'_, DeviceUploaderState>
) -> Result<Vec<String>, String> {
    info!("获取Arduino库列表");
    
    let uploader = uploader.lock().await;
    uploader.list_arduino_libraries().await.map_err(|e| {
        error!("获取Arduino库列表失败: {}", e);
        format!("获取Arduino库列表失败: {}", e)
    })
}

#[command]
pub async fn install_arduino_library(
    library_name: String,
    uploader: State<'_, DeviceUploaderState>
) -> Result<String, String> {
    info!("安装Arduino库: {}", library_name);
    
    let uploader = uploader.lock().await;
    uploader.install_arduino_library(&library_name).await.map_err(|e| {
        error!("安装Arduino库失败: {}", e);
        format!("安装Arduino库失败: {}", e)
    })
}

#[command]
pub async fn connect_serial(
    port: String,
    baud_rate: u32,
    serial_manager: State<'_, SerialManagerState>
) -> Result<bool, String> {
    info!("连接串口: {} (波特率: {})", port, baud_rate);
    
    let mut manager = serial_manager.lock().await;
    manager.connect(&port, baud_rate).map_err(|e| {
        error!("连接串口失败: {}", e);
        format!("连接串口失败: {}", e)
    })?;
    
    Ok(true)
}

#[command]
pub async fn disconnect_serial(
    port: String,
    serial_manager: State<'_, SerialManagerState>
) -> Result<bool, String> {
    info!("断开串口: {}", port);
    
    let mut manager = serial_manager.lock().await;
    manager.disconnect(&port).map_err(|e| {
        error!("断开串口失败: {}", e);
        format!("断开串口失败: {}", e)
    })?;
    
    Ok(true)
}

#[command]
pub async fn send_serial_data(
    port: String,
    data: String,
    serial_manager: State<'_, SerialManagerState>
) -> Result<usize, String> {
    let mut manager = serial_manager.lock().await;
    
    if let Some(connection) = manager.get_connection(&port) {
        connection.write_string(&data).map_err(|e| {
            error!("发送串口数据失败: {}", e);
            format!("发送串口数据失败: {}", e)
        })
    } else {
        Err(format!("串口 {} 未连接", port))
    }
}

#[command]
pub async fn read_serial_data(
    port: String,
    timeout_ms: u64,
    serial_manager: State<'_, SerialManagerState>
) -> Result<String, String> {
    let mut manager = serial_manager.lock().await;
    
    if let Some(connection) = manager.get_connection(&port) {
        connection.read_line(timeout_ms).map_err(|e| {
            error!("读取串口数据失败: {}", e);
            format!("读取串口数据失败: {}", e)
        })
    } else {
        Err(format!("串口 {} 未连接", port))
    }
}

#[command]
pub async fn get_connected_ports(
    serial_manager: State<'_, SerialManagerState>
) -> Result<Vec<String>, String> {
    let manager = serial_manager.lock().await;
    Ok(manager.connected_ports().into_iter().map(|s| s.to_string()).collect())
} 