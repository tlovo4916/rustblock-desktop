pub mod performance;

use std::path::PathBuf;
use anyhow::Result;

/// 获取应用程序数据目录
pub fn get_app_data_dir() -> Result<PathBuf> {
    let mut path = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("RustBlock");
    
    if !path.exists() {
        std::fs::create_dir_all(&path)?;
    }
    
    Ok(path)
}

/// 获取项目文件保存目录
pub fn get_projects_dir() -> Result<PathBuf> {
    let mut path = get_app_data_dir()?;
    path.push("projects");
    
    if !path.exists() {
        std::fs::create_dir_all(&path)?;
    }
    
    Ok(path)
}

/// 格式化文件大小
pub fn format_file_size(bytes: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB"];
    let mut size = bytes as f64;
    let mut unit_index = 0;
    
    while size >= 1024.0 && unit_index < UNITS.len() - 1 {
        size /= 1024.0;
        unit_index += 1;
    }
    
    format!("{:.1} {}", size, UNITS[unit_index])
} 