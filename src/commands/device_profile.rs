use crate::device::{
    detector::DeviceDetectorState,
    connection_manager::{DeviceProfile, ConnectionStatus},
    DeviceType,
};
use anyhow::Result;
use tauri::{command, State};
use log::{info, error};
use std::collections::HashMap;

#[derive(serde::Serialize, serde::Deserialize)]
pub struct CreateProfileRequest {
    pub name: String,
    pub device_type: DeviceType,
    pub preferred_language: Option<String>,
    pub baud_rate: Option<u32>,
    pub auto_reconnect: Option<bool>,
    pub reconnect_interval_ms: Option<u64>,
    pub custom_settings: Option<HashMap<String, serde_json::Value>>,
}

#[command]
pub async fn create_device_profile(
    request: CreateProfileRequest,
    detector: State<'_, DeviceDetectorState>
) -> Result<String, String> {
    info!("创建设备配置文件: {}", request.name);
    
    let detector = detector.lock().await;
    let connection_manager = detector.connection_manager();
    
    let mut profile = DeviceProfile::new(request.name, request.device_type);
    
    if let Some(lang) = request.preferred_language {
        profile.preferred_language = lang;
    }
    if let Some(baud) = request.baud_rate {
        profile.baud_rate = baud;
    }
    if let Some(auto) = request.auto_reconnect {
        profile.auto_reconnect = auto;
    }
    if let Some(interval) = request.reconnect_interval_ms {
        profile.reconnect_interval_ms = interval;
    }
    if let Some(settings) = request.custom_settings {
        profile.custom_settings = settings;
    }
    
    connection_manager.create_profile(profile).await.map_err(|e| {
        error!("创建配置文件失败: {}", e);
        format!("创建配置文件失败: {}", e)
    })
}

#[command]
pub async fn update_device_profile(
    profile_id: String,
    updates: HashMap<String, serde_json::Value>,
    detector: State<'_, DeviceDetectorState>
) -> Result<(), String> {
    info!("更新设备配置文件: {}", profile_id);
    
    let detector = detector.lock().await;
    let connection_manager = detector.connection_manager();
    
    connection_manager.update_profile(&profile_id, updates).await.map_err(|e| {
        error!("更新配置文件失败: {}", e);
        format!("更新配置文件失败: {}", e)
    })
}

#[command]
pub async fn delete_device_profile(
    profile_id: String,
    detector: State<'_, DeviceDetectorState>
) -> Result<(), String> {
    info!("删除设备配置文件: {}", profile_id);
    
    let detector = detector.lock().await;
    let connection_manager = detector.connection_manager();
    
    connection_manager.delete_profile(&profile_id).await.map_err(|e| {
        error!("删除配置文件失败: {}", e);
        format!("删除配置文件失败: {}", e)
    })
}

#[command]
pub async fn get_device_profile(
    profile_id: String,
    detector: State<'_, DeviceDetectorState>
) -> Result<DeviceProfile, String> {
    let detector = detector.lock().await;
    let connection_manager = detector.connection_manager();
    
    connection_manager.get_profile(&profile_id).await.map_err(|e| {
        error!("获取配置文件失败: {}", e);
        format!("获取配置文件失败: {}", e)
    })
}

#[command]
pub async fn list_device_profiles(
    detector: State<'_, DeviceDetectorState>
) -> Result<Vec<DeviceProfile>, String> {
    let detector = detector.lock().await;
    let connection_manager = detector.connection_manager();
    
    Ok(connection_manager.list_profiles().await)
}

#[command]
pub async fn associate_device_profile(
    device_id: String,
    profile_id: String,
    detector: State<'_, DeviceDetectorState>
) -> Result<(), String> {
    info!("关联设备 {} 到配置文件 {}", device_id, profile_id);
    
    let detector = detector.lock().await;
    let connection_manager = detector.connection_manager();
    
    connection_manager.associate_device_profile(&device_id, &profile_id).await.map_err(|e| {
        error!("关联设备配置失败: {}", e);
        format!("关联设备配置失败: {}", e)
    })
}

#[command]
pub async fn get_device_connection_status(
    device_id: String,
    detector: State<'_, DeviceDetectorState>
) -> Result<Option<ConnectionStatus>, String> {
    let detector = detector.lock().await;
    let connection_manager = detector.connection_manager();
    
    Ok(connection_manager.get_connection_status(&device_id).await)
}

#[command]
pub async fn batch_connect_devices(
    device_ids: Vec<String>,
    detector: State<'_, DeviceDetectorState>
) -> Result<HashMap<String, bool>, String> {
    info!("批量连接设备: {:?}", device_ids);
    
    let detector = detector.lock().await;
    let connection_manager = detector.connection_manager();
    
    let results = connection_manager.batch_connect(device_ids, |device_id| {
        // 这里应该调用实际的连接逻辑
        // 暂时模拟连接成功
        info!("连接设备: {}", device_id);
        Ok(())
    }).await;
    
    let mut success_map = HashMap::new();
    for (device_id, result) in results {
        success_map.insert(device_id, result.is_ok());
    }
    
    Ok(success_map)
}

#[command]
pub async fn batch_disconnect_devices(
    device_ids: Vec<String>,
    detector: State<'_, DeviceDetectorState>
) -> Result<HashMap<String, bool>, String> {
    info!("批量断开设备: {:?}", device_ids);
    
    let detector = detector.lock().await;
    let connection_manager = detector.connection_manager();
    
    let results = connection_manager.batch_disconnect(device_ids, |device_id| {
        // 这里应该调用实际的断开逻辑
        // 暂时模拟断开成功
        info!("断开设备: {}", device_id);
        Ok(())
    }).await;
    
    let mut success_map = HashMap::new();
    for (device_id, result) in results {
        success_map.insert(device_id, result.is_ok());
    }
    
    Ok(success_map)
}

#[command]
pub async fn batch_apply_profile(
    device_ids: Vec<String>,
    profile_id: String,
    detector: State<'_, DeviceDetectorState>
) -> Result<HashMap<String, bool>, String> {
    info!("批量应用配置文件 {} 到设备: {:?}", profile_id, device_ids);
    
    let detector = detector.lock().await;
    let connection_manager = detector.connection_manager();
    
    let results = connection_manager.batch_apply_profile(device_ids, &profile_id).await;
    
    let mut success_map = HashMap::new();
    for (device_id, result) in results {
        success_map.insert(device_id, result.is_ok());
    }
    
    Ok(success_map)
}

#[command]
pub async fn export_device_profiles(
    detector: State<'_, DeviceDetectorState>
) -> Result<String, String> {
    info!("导出设备配置文件");
    
    let detector = detector.lock().await;
    let connection_manager = detector.connection_manager();
    
    connection_manager.export_profiles().await.map_err(|e| {
        error!("导出配置文件失败: {}", e);
        format!("导出配置文件失败: {}", e)
    })
}

#[command]
pub async fn import_device_profiles(
    json_data: String,
    detector: State<'_, DeviceDetectorState>
) -> Result<usize, String> {
    info!("导入设备配置文件");
    
    let detector = detector.lock().await;
    let connection_manager = detector.connection_manager();
    
    connection_manager.import_profiles(&json_data).await.map_err(|e| {
        error!("导入配置文件失败: {}", e);
        format!("导入配置文件失败: {}", e)
    })
}

#[command]
pub async fn cleanup_disconnected_devices(
    older_than_hours: i64,
    detector: State<'_, DeviceDetectorState>
) -> Result<(), String> {
    info!("清理断开超过 {} 小时的设备", older_than_hours);
    
    let detector = detector.lock().await;
    let connection_manager = detector.connection_manager();
    
    connection_manager.cleanup_disconnected_devices(older_than_hours).await;
    Ok(())
}

#[command]
pub async fn enable_auto_reconnect(
    device_id: String,
    detector: State<'_, DeviceDetectorState>
) -> Result<(), String> {
    info!("启用设备 {} 的自动重连", device_id);
    
    let detector = detector.lock().await;
    let connection_manager = detector.connection_manager();
    let device_id_clone = device_id.clone();
    
    connection_manager.start_auto_reconnect(device_id, move || {
        // 这里应该调用实际的重连逻辑
        // 暂时返回成功
        info!("尝试重连设备: {}", device_id_clone);
        true
    }).await.map_err(|e| {
        error!("启用自动重连失败: {}", e);
        format!("启用自动重连失败: {}", e)
    })
}

#[command]
pub async fn disable_auto_reconnect(
    device_id: String,
    detector: State<'_, DeviceDetectorState>
) -> Result<(), String> {
    info!("禁用设备 {} 的自动重连", device_id);
    
    let detector = detector.lock().await;
    let connection_manager = detector.connection_manager();
    
    connection_manager.stop_auto_reconnect(&device_id).await.map_err(|e| {
        error!("禁用自动重连失败: {}", e);
        format!("禁用自动重连失败: {}", e)
    })
}