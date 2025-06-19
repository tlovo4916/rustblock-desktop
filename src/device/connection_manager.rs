use super::{DeviceInfo, DeviceType};
use anyhow::{Result, anyhow};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use tokio::time::{interval, Duration};
use log::{info, warn, error, debug};
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceProfile {
    pub id: String,
    pub name: String,
    pub device_type: DeviceType,
    pub preferred_language: String,
    pub baud_rate: u32,
    pub auto_reconnect: bool,
    pub reconnect_interval_ms: u64,
    pub custom_settings: HashMap<String, serde_json::Value>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_modified: chrono::DateTime<chrono::Utc>,
}

impl DeviceProfile {
    pub fn new(name: String, device_type: DeviceType) -> Self {
        let now = chrono::Utc::now();
        let preferred_language = match device_type {
            DeviceType::Arduino => "arduino".to_string(),
            DeviceType::MicroBit => "micropython".to_string(),
            DeviceType::ESP32 => "arduino".to_string(),
            DeviceType::RaspberryPiPico => "micropython".to_string(),
            DeviceType::Unknown => "arduino".to_string(),
        };
        let baud_rate = match device_type {
            DeviceType::Arduino => 9600,
            _ => 115200,
        };
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            device_type,
            preferred_language,
            baud_rate,
            auto_reconnect: true,
            reconnect_interval_ms: 5000,
            custom_settings: HashMap::new(),
            created_at: now,
            last_modified: now,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionStatus {
    pub connected: bool,
    pub last_seen: chrono::DateTime<chrono::Utc>,
    pub connection_attempts: u32,
    pub last_error: Option<String>,
}

pub struct ConnectionManager {
    profiles: Arc<RwLock<HashMap<String, DeviceProfile>>>,
    connections: Arc<RwLock<HashMap<String, ConnectionStatus>>>,
    device_profiles: Arc<RwLock<HashMap<String, String>>>, // device_id -> profile_id
    auto_reconnect_tasks: Arc<Mutex<HashMap<String, tokio::task::JoinHandle<()>>>>,
}

impl ConnectionManager {
    pub fn new() -> Self {
        Self {
            profiles: Arc::new(RwLock::new(HashMap::new())),
            connections: Arc::new(RwLock::new(HashMap::new())),
            device_profiles: Arc::new(RwLock::new(HashMap::new())),
            auto_reconnect_tasks: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// 创建设备配置文件
    pub async fn create_profile(&self, profile: DeviceProfile) -> Result<String> {
        let profile_id = profile.id.clone();
        let mut profiles = self.profiles.write().await;
        profiles.insert(profile_id.clone(), profile);
        info!("创建设备配置文件: {}", profile_id);
        Ok(profile_id)
    }

    /// 更新设备配置文件
    pub async fn update_profile(&self, profile_id: &str, updates: HashMap<String, serde_json::Value>) -> Result<()> {
        let mut profiles = self.profiles.write().await;
        let profile = profiles.get_mut(profile_id)
            .ok_or_else(|| anyhow!("配置文件不存在: {}", profile_id))?;

        for (key, value) in updates {
            match key.as_str() {
                "name" => profile.name = value.as_str().unwrap_or(&profile.name).to_string(),
                "preferred_language" => profile.preferred_language = value.as_str().unwrap_or(&profile.preferred_language).to_string(),
                "baud_rate" => profile.baud_rate = value.as_u64().unwrap_or(profile.baud_rate as u64) as u32,
                "auto_reconnect" => profile.auto_reconnect = value.as_bool().unwrap_or(profile.auto_reconnect),
                "reconnect_interval_ms" => profile.reconnect_interval_ms = value.as_u64().unwrap_or(profile.reconnect_interval_ms),
                _ => {
                    profile.custom_settings.insert(key, value);
                }
            }
        }

        profile.last_modified = chrono::Utc::now();
        info!("更新设备配置文件: {}", profile_id);
        Ok(())
    }

    /// 删除设备配置文件
    pub async fn delete_profile(&self, profile_id: &str) -> Result<()> {
        let mut profiles = self.profiles.write().await;
        profiles.remove(profile_id)
            .ok_or_else(|| anyhow!("配置文件不存在: {}", profile_id))?;
        
        // 清理关联的设备映射
        let mut device_profiles = self.device_profiles.write().await;
        device_profiles.retain(|_, pid| pid != profile_id);
        
        info!("删除设备配置文件: {}", profile_id);
        Ok(())
    }

    /// 获取设备配置文件
    pub async fn get_profile(&self, profile_id: &str) -> Result<DeviceProfile> {
        let profiles = self.profiles.read().await;
        profiles.get(profile_id)
            .cloned()
            .ok_or_else(|| anyhow!("配置文件不存在: {}", profile_id))
    }

    /// 获取所有配置文件
    pub async fn list_profiles(&self) -> Vec<DeviceProfile> {
        let profiles = self.profiles.read().await;
        profiles.values().cloned().collect()
    }

    /// 将设备关联到配置文件
    pub async fn associate_device_profile(&self, device_id: &str, profile_id: &str) -> Result<()> {
        // 验证配置文件存在
        let profiles = self.profiles.read().await;
        if !profiles.contains_key(profile_id) {
            return Err(anyhow!("配置文件不存在: {}", profile_id));
        }
        drop(profiles);

        let mut device_profiles = self.device_profiles.write().await;
        device_profiles.insert(device_id.to_string(), profile_id.to_string());
        
        info!("设备 {} 关联到配置文件 {}", device_id, profile_id);
        Ok(())
    }

    /// 获取设备的配置文件
    pub async fn get_device_profile(&self, device_id: &str) -> Option<DeviceProfile> {
        let device_profiles = self.device_profiles.read().await;
        if let Some(profile_id) = device_profiles.get(device_id) {
            let profiles = self.profiles.read().await;
            profiles.get(profile_id).cloned()
        } else {
            None
        }
    }

    /// 启动设备自动重连
    pub async fn start_auto_reconnect(&self, device_id: String, reconnect_fn: impl Fn() -> bool + Send + Sync + 'static) -> Result<()> {
        let profile = self.get_device_profile(&device_id).await
            .ok_or_else(|| anyhow!("设备没有关联的配置文件"))?;

        if !profile.auto_reconnect {
            return Ok(());
        }

        let device_id_clone = device_id.clone();
        let connections = Arc::clone(&self.connections);
        let interval_ms = profile.reconnect_interval_ms;

        // 停止现有的重连任务
        self.stop_auto_reconnect(&device_id).await?;

        let task = tokio::spawn(async move {
            let mut interval = interval(Duration::from_millis(interval_ms));
            let mut attempts = 0u32;

            loop {
                interval.tick().await;
                
                // 检查是否需要重连
                let should_reconnect = {
                    let conns = connections.read().await;
                    if let Some(status) = conns.get(&device_id_clone) {
                        !status.connected
                    } else {
                        false
                    }
                };

                if should_reconnect {
                    attempts += 1;
                    info!("尝试重连设备 {} (第 {} 次)", device_id_clone, attempts);
                    
                    if reconnect_fn() {
                        info!("设备 {} 重连成功", device_id_clone);
                        let mut conns = connections.write().await;
                        if let Some(status) = conns.get_mut(&device_id_clone) {
                            status.connected = true;
                            status.last_seen = chrono::Utc::now();
                            status.connection_attempts = attempts;
                            status.last_error = None;
                        }
                        attempts = 0;
                    } else {
                        warn!("设备 {} 重连失败", device_id_clone);
                        let mut conns = connections.write().await;
                        if let Some(status) = conns.get_mut(&device_id_clone) {
                            status.connection_attempts = attempts;
                            status.last_error = Some("重连失败".to_string());
                        }
                    }
                }
            }
        });

        let mut tasks = self.auto_reconnect_tasks.lock().await;
        tasks.insert(device_id, task);

        Ok(())
    }

    /// 停止设备自动重连
    pub async fn stop_auto_reconnect(&self, device_id: &str) -> Result<()> {
        let mut tasks = self.auto_reconnect_tasks.lock().await;
        if let Some(task) = tasks.remove(device_id) {
            task.abort();
            info!("停止设备 {} 的自动重连", device_id);
        }
        Ok(())
    }

    /// 更新设备连接状态
    pub async fn update_connection_status(&self, device_id: &str, connected: bool, error: Option<String>) {
        let mut connections = self.connections.write().await;
        let status = connections.entry(device_id.to_string()).or_insert(ConnectionStatus {
            connected,
            last_seen: chrono::Utc::now(),
            connection_attempts: 0,
            last_error: error.clone(),
        });

        status.connected = connected;
        status.last_seen = chrono::Utc::now();
        if let Some(err) = error {
            status.last_error = Some(err);
        }

        debug!("更新设备 {} 连接状态: {}", device_id, connected);
    }

    /// 获取设备连接状态
    pub async fn get_connection_status(&self, device_id: &str) -> Option<ConnectionStatus> {
        let connections = self.connections.read().await;
        connections.get(device_id).cloned()
    }

    /// 批量操作：连接多个设备
    pub async fn batch_connect(&self, device_ids: Vec<String>, connect_fn: impl Fn(&str) -> Result<()>) -> HashMap<String, Result<()>> {
        info!("批量连接 {} 个设备", device_ids.len());
        let mut results = HashMap::new();

        for device_id in device_ids {
            let result = connect_fn(&device_id);
            if result.is_ok() {
                self.update_connection_status(&device_id, true, None).await;
            } else {
                self.update_connection_status(&device_id, false, result.as_ref().err().map(|e| e.to_string())).await;
            }
            results.insert(device_id, result);
        }

        results
    }

    /// 批量操作：断开多个设备
    pub async fn batch_disconnect(&self, device_ids: Vec<String>, disconnect_fn: impl Fn(&str) -> Result<()>) -> HashMap<String, Result<()>> {
        info!("批量断开 {} 个设备", device_ids.len());
        let mut results = HashMap::new();

        for device_id in device_ids {
            // 先停止自动重连
            let _ = self.stop_auto_reconnect(&device_id).await;
            
            let result = disconnect_fn(&device_id);
            self.update_connection_status(&device_id, false, result.as_ref().err().map(|e| e.to_string())).await;
            results.insert(device_id, result);
        }

        results
    }

    /// 批量操作：应用配置文件到多个设备
    pub async fn batch_apply_profile(&self, device_ids: Vec<String>, profile_id: &str) -> HashMap<String, Result<()>> {
        info!("批量应用配置文件 {} 到 {} 个设备", profile_id, device_ids.len());
        let mut results = HashMap::new();

        for device_id in device_ids {
            let result = self.associate_device_profile(&device_id, profile_id).await;
            results.insert(device_id, result);
        }

        results
    }

    /// 导出配置文件
    pub async fn export_profiles(&self) -> Result<String> {
        let profiles = self.profiles.read().await;
        let json = serde_json::to_string_pretty(&*profiles)?;
        Ok(json)
    }

    /// 导入配置文件
    pub async fn import_profiles(&self, json: &str) -> Result<usize> {
        let imported_profiles: HashMap<String, DeviceProfile> = serde_json::from_str(json)?;
        let count = imported_profiles.len();
        
        let mut profiles = self.profiles.write().await;
        for (id, profile) in imported_profiles {
            profiles.insert(id, profile);
        }

        info!("导入 {} 个配置文件", count);
        Ok(count)
    }

    /// 清理断开连接的设备
    pub async fn cleanup_disconnected_devices(&self, older_than_hours: i64) {
        let cutoff = chrono::Utc::now() - chrono::Duration::hours(older_than_hours);
        let mut connections = self.connections.write().await;
        
        connections.retain(|device_id, status| {
            if !status.connected && status.last_seen < cutoff {
                info!("清理长时间断开的设备: {}", device_id);
                false
            } else {
                true
            }
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_profile_management() {
        let manager = ConnectionManager::new();
        
        // 创建配置文件
        let profile = DeviceProfile::new("Arduino测试".to_string(), DeviceType::Arduino);
        let profile_id = manager.create_profile(profile).await.unwrap();
        
        // 获取配置文件
        let retrieved = manager.get_profile(&profile_id).await.unwrap();
        assert_eq!(retrieved.name, "Arduino测试");
        
        // 更新配置文件
        let mut updates = HashMap::new();
        updates.insert("baud_rate".to_string(), serde_json::json!(115200));
        manager.update_profile(&profile_id, updates).await.unwrap();
        
        let updated = manager.get_profile(&profile_id).await.unwrap();
        assert_eq!(updated.baud_rate, 115200);
        
        // 删除配置文件
        manager.delete_profile(&profile_id).await.unwrap();
        assert!(manager.get_profile(&profile_id).await.is_err());
    }

    #[tokio::test]
    async fn test_device_association() {
        let manager = ConnectionManager::new();
        
        // 创建配置文件
        let profile = DeviceProfile::new("ESP32配置".to_string(), DeviceType::ESP32);
        let profile_id = manager.create_profile(profile).await.unwrap();
        
        // 关联设备
        let device_id = "test_device_123";
        manager.associate_device_profile(device_id, &profile_id).await.unwrap();
        
        // 获取设备配置
        let device_profile = manager.get_device_profile(device_id).await.unwrap();
        assert_eq!(device_profile.name, "ESP32配置");
    }
}