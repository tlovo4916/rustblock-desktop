use crate::utils::get_projects_dir;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::command;
use log::{info, error};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub device_type: String,
    pub language: String,
    pub file_path: String,
    pub file_size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectData {
    pub info: ProjectInfo,
    pub blocks_xml: String, // Blockly积木的XML数据
    pub generated_code: String, // 生成的代码
}

#[command]
pub async fn new_project(
    name: String,
    description: String,
    device_type: String,
    language: String,
) -> Result<ProjectInfo, String> {
    info!("创建新项目: {}", name);
    
    if name.trim().is_empty() {
        return Err("项目名称不能为空".to_string());
    }
    
    let projects_dir = get_projects_dir().map_err(|e| {
        error!("获取项目目录失败: {}", e);
        format!("获取项目目录失败: {}", e)
    })?;
    
    let project_id = format!("project_{}", chrono::Utc::now().timestamp());
    let project_file = projects_dir.join(format!("{}.json", project_id));
    
    let project_info = ProjectInfo {
        id: project_id.clone(),
        name: name.trim().to_string(),
        description: description.trim().to_string(),
        created_at: chrono::Utc::now().timestamp(),
        updated_at: chrono::Utc::now().timestamp(),
        device_type,
        language,
        file_path: project_file.to_string_lossy().to_string(),
        file_size: 0,
    };
    
    let project_data = ProjectData {
        info: project_info.clone(),
        blocks_xml: String::new(),
        generated_code: String::new(),
    };
    
    // 保存项目文件
    let json_data = serde_json::to_string_pretty(&project_data).map_err(|e| {
        error!("序列化项目数据失败: {}", e);
        format!("序列化项目数据失败: {}", e)
    })?;
    
    fs::write(&project_file, json_data).map_err(|e| {
        error!("保存项目文件失败: {}", e);
        format!("保存项目文件失败: {}", e)
    })?;
    
    info!("项目创建成功: {}", project_id);
    Ok(project_info)
}

#[command]
pub async fn save_project(
    project_id: String,
    blocks_xml: String,
    generated_code: String,
) -> Result<String, String> {
    info!("保存项目: {}", project_id);
    
    let projects_dir = get_projects_dir().map_err(|e| {
        error!("获取项目目录失败: {}", e);
        format!("获取项目目录失败: {}", e)
    })?;
    
    let project_file = projects_dir.join(format!("{}.json", project_id));
    
    if !project_file.exists() {
        return Err(format!("项目文件不存在: {}", project_id));
    }
    
    // 读取现有项目数据
    let existing_data = fs::read_to_string(&project_file).map_err(|e| {
        error!("读取项目文件失败: {}", e);
        format!("读取项目文件失败: {}", e)
    })?;
    
    let mut project_data: ProjectData = serde_json::from_str(&existing_data).map_err(|e| {
        error!("解析项目数据失败: {}", e);
        format!("解析项目数据失败: {}", e)
    })?;
    
    // 更新项目数据
    project_data.blocks_xml = blocks_xml;
    project_data.generated_code = generated_code;
    project_data.info.updated_at = chrono::Utc::now().timestamp();
    
    // 保存更新后的数据
    let json_data = serde_json::to_string_pretty(&project_data).map_err(|e| {
        error!("序列化项目数据失败: {}", e);
        format!("序列化项目数据失败: {}", e)
    })?;
    
    fs::write(&project_file, &json_data).map_err(|e| {
        error!("保存项目文件失败: {}", e);
        format!("保存项目文件失败: {}", e)
    })?;
    
    // 更新文件大小
    project_data.info.file_size = json_data.len() as u64;
    
    info!("项目保存成功: {}", project_id);
    Ok("项目保存成功".to_string())
}

#[command]
pub async fn load_project(project_id: String) -> Result<ProjectData, String> {
    info!("加载项目: {}", project_id);
    
    let projects_dir = get_projects_dir().map_err(|e| {
        error!("获取项目目录失败: {}", e);
        format!("获取项目目录失败: {}", e)
    })?;
    
    let project_file = projects_dir.join(format!("{}.json", project_id));
    
    if !project_file.exists() {
        return Err(format!("项目文件不存在: {}", project_id));
    }
    
    let project_data = fs::read_to_string(&project_file).map_err(|e| {
        error!("读取项目文件失败: {}", e);
        format!("读取项目文件失败: {}", e)
    })?;
    
    let mut project: ProjectData = serde_json::from_str(&project_data).map_err(|e| {
        error!("解析项目数据失败: {}", e);
        format!("解析项目数据失败: {}", e)
    })?;
    
    // 更新文件大小信息
    project.info.file_size = project_data.len() as u64;
    
    info!("项目加载成功: {}", project_id);
    Ok(project)
}

#[command]
pub async fn list_projects() -> Result<Vec<ProjectInfo>, String> {
    info!("获取项目列表");
    
    let projects_dir = get_projects_dir().map_err(|e| {
        error!("获取项目目录失败: {}", e);
        format!("获取项目目录失败: {}", e)
    })?;
    
    let mut projects = Vec::new();
    
    if projects_dir.exists() {
        let entries = fs::read_dir(&projects_dir).map_err(|e| {
            error!("读取项目目录失败: {}", e);
            format!("读取项目目录失败: {}", e)
        })?;
        
        for entry in entries {
            let entry = entry.map_err(|e| {
                error!("读取目录项失败: {}", e);
                format!("读取目录项失败: {}", e)
            })?;
            
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                match fs::read_to_string(&path) {
                    Ok(content) => {
                        match serde_json::from_str::<ProjectData>(&content) {
                            Ok(mut project_data) => {
                                // 更新文件大小
                                project_data.info.file_size = content.len() as u64;
                                projects.push(project_data.info);
                            },
                            Err(e) => {
                                error!("解析项目文件失败 {}: {}", path.display(), e);
                            }
                        }
                    },
                    Err(e) => {
                        error!("读取项目文件失败 {}: {}", path.display(), e);
                    }
                }
            }
        }
    }
    
    // 按更新时间排序
    projects.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    
    info!("找到 {} 个项目", projects.len());
    Ok(projects)
}

#[command]
pub async fn delete_project(project_id: String) -> Result<String, String> {
    info!("删除项目: {}", project_id);
    
    let projects_dir = get_projects_dir().map_err(|e| {
        error!("获取项目目录失败: {}", e);
        format!("获取项目目录失败: {}", e)
    })?;
    
    let project_file = projects_dir.join(format!("{}.json", project_id));
    
    if !project_file.exists() {
        return Err(format!("项目文件不存在: {}", project_id));
    }
    
    fs::remove_file(&project_file).map_err(|e| {
        error!("删除项目文件失败: {}", e);
        format!("删除项目文件失败: {}", e)
    })?;
    
    info!("项目删除成功: {}", project_id);
    Ok("项目删除成功".to_string())
} 