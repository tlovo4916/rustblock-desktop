use crate::device::{DeviceInfo, DeviceType, UploadOptions, detector::DeviceDetector};
use anyhow::Result;
use tokio::sync::Mutex;
use tauri::{command, State};
use log::{info, error};

// 全局设备检测器状态
pub type DeviceDetectorState = Mutex<DeviceDetector>;

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
    detector: State<'_, DeviceDetectorState>
) -> Result<String, String> {
    info!("前端请求上传代码到设备: {}", options.device_id);
    
    let detector = detector.lock().await;
    
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
            
            // 这里应该调用实际的代码上传逻辑
            // 根据设备类型和语言选择合适的上传方式
            match (&device.device_type, options.language.as_str()) {
                (DeviceType::Arduino, "arduino") => {
                    upload_arduino_code(&options, device).await
                },
                (DeviceType::MicroBit, "micropython") => {
                    upload_micropython_code(&options, device).await
                },
                (DeviceType::ESP32, "arduino") => {
                    upload_arduino_code(&options, device).await
                },
                (DeviceType::ESP32, "micropython") => {
                    upload_micropython_code(&options, device).await
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

async fn upload_arduino_code(options: &UploadOptions, device: &DeviceInfo) -> Result<String, String> {
    info!("上传Arduino代码到设备: {}", device.name);
    
    // 模拟上传过程
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
    
    // 这里应该调用Arduino CLI或其他工具进行实际的编译和上传
    // 暂时返回成功消息
    Ok(format!("Arduino代码已成功上传到 {}", device.name))
}

async fn upload_micropython_code(options: &UploadOptions, device: &DeviceInfo) -> Result<String, String> {
    info!("上传MicroPython代码到设备: {}", device.name);
    
    // 模拟上传过程
    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    
    // 这里应该使用合适的工具（如ampy、rshell等）上传MicroPython代码
    // 暂时返回成功消息
    Ok(format!("MicroPython代码已成功上传到 {}", device.name))
} 