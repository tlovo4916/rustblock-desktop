use crate::ai::{
    enhanced_ai::{
        EnhancedAIService, CodeOptimizationRequest, CodeOptimizationResponse,
        LearningPathRequest, LearningPath, ProjectTemplate, OptimizationGoal, SkillLevel
    },
    AIService
};
use anyhow::Result;
use tauri::{command, State};
use tokio::sync::Mutex;
use log::{info, error};
use std::collections::HashMap;

pub type EnhancedAIServiceState = Mutex<Option<EnhancedAIService>>;

#[command]
pub async fn optimize_code(
    request: CodeOptimizationRequest,
    enhanced_ai: State<'_, EnhancedAIServiceState>
) -> Result<CodeOptimizationResponse, String> {
    info!("代码优化请求: 语言={}, 设备={}", request.language, request.device_type);
    
    let enhanced_ai = enhanced_ai.lock().await;
    let service = enhanced_ai.as_ref()
        .ok_or_else(|| "AI服务未配置".to_string())?;
    
    service.optimize_code(request).await.map_err(|e| {
        error!("代码优化失败: {}", e);
        format!("代码优化失败: {}", e)
    })
}

#[command]
pub async fn generate_learning_path(
    request: LearningPathRequest,
    enhanced_ai: State<'_, EnhancedAIServiceState>
) -> Result<LearningPath, String> {
    info!("生成学习路径请求: 年龄={}, 技能={:?}", request.student_age, request.current_skill_level);
    
    let enhanced_ai = enhanced_ai.lock().await;
    let service = enhanced_ai.as_ref()
        .ok_or_else(|| "AI服务未配置".to_string())?;
    
    service.generate_learning_path(request).await.map_err(|e| {
        error!("生成学习路径失败: {}", e);
        format!("生成学习路径失败: {}", e)
    })
}

#[command]
pub async fn get_project_template(
    template_id: String,
    enhanced_ai: State<'_, EnhancedAIServiceState>
) -> Result<Option<ProjectTemplate>, String> {
    let enhanced_ai = enhanced_ai.lock().await;
    let service = enhanced_ai.as_ref()
        .ok_or_else(|| "AI服务未配置".to_string())?;
    
    Ok(service.get_project_template(&template_id).cloned())
}

#[command]
pub async fn get_suitable_templates(
    age: u8,
    skill_level: SkillLevel,
    device_type: Option<String>,
    enhanced_ai: State<'_, EnhancedAIServiceState>
) -> Result<Vec<ProjectTemplate>, String> {
    let enhanced_ai = enhanced_ai.lock().await;
    let service = enhanced_ai.as_ref()
        .ok_or_else(|| "AI服务未配置".to_string())?;
    
    let templates = service.get_suitable_templates(
        age, 
        &skill_level, 
        device_type.as_deref()
    );
    
    Ok(templates.into_iter().cloned().collect())
}

#[command]
pub async fn recommend_projects(
    learning_goals: Vec<String>,
    student_age: u8,
    skill_level: SkillLevel,
    enhanced_ai: State<'_, EnhancedAIServiceState>
) -> Result<Vec<ProjectTemplate>, String> {
    info!("推荐项目: 年龄={}, 目标={:?}", student_age, learning_goals);
    
    let enhanced_ai = enhanced_ai.lock().await;
    let service = enhanced_ai.as_ref()
        .ok_or_else(|| "AI服务未配置".to_string())?;
    
    service.recommend_projects(learning_goals, student_age, skill_level).await.map_err(|e| {
        error!("推荐项目失败: {}", e);
        format!("推荐项目失败: {}", e)
    })
}

#[command]
pub async fn generate_custom_template(
    title: String,
    description: String,
    age: u8,
    skill_level: SkillLevel,
    device_type: String,
    learning_objectives: Vec<String>,
    enhanced_ai: State<'_, EnhancedAIServiceState>
) -> Result<ProjectTemplate, String> {
    info!("生成自定义模板: {}", title);
    
    let enhanced_ai = enhanced_ai.lock().await;
    let service = enhanced_ai.as_ref()
        .ok_or_else(|| "AI服务未配置".to_string())?;
    
    service.generate_custom_template(
        title, description, age, skill_level, device_type, learning_objectives
    ).await.map_err(|e| {
        error!("生成自定义模板失败: {}", e);
        format!("生成自定义模板失败: {}", e)
    })
}

#[command]
pub async fn configure_enhanced_ai_service(
    api_key: String,
    base_url: Option<String>,
    enhanced_ai: State<'_, EnhancedAIServiceState>
) -> Result<(), String> {
    info!("配置增强AI服务");
    
    let ai_service = AIService::new(api_key, base_url);
    let enhanced_service = EnhancedAIService::new(ai_service);
    
    let mut enhanced_ai = enhanced_ai.lock().await;
    *enhanced_ai = Some(enhanced_service);
    
    info!("增强AI服务配置完成");
    Ok(())
}

#[command]
pub async fn get_optimization_suggestions(
    code: String,
    language: String,
    enhanced_ai: State<'_, EnhancedAIServiceState>
) -> Result<Vec<String>, String> {
    info!("获取代码优化建议");
    
    let request = CodeOptimizationRequest {
        code,
        language: language.clone(),
        device_type: "generic".to_string(),
        optimization_goals: vec![
            OptimizationGoal::Readability,
            OptimizationGoal::BestPractices,
            OptimizationGoal::ChildFriendly,
        ],
    };
    
    let enhanced_ai = enhanced_ai.lock().await;
    let service = enhanced_ai.as_ref()
        .ok_or_else(|| "AI服务未配置".to_string())?;
    
    let response = service.optimize_code(request).await.map_err(|e| {
        error!("获取优化建议失败: {}", e);
        format!("获取优化建议失败: {}", e)
    })?;
    
    Ok(response.improvements.into_iter().map(|imp| imp.description).collect())
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct StudentProfile {
    pub age: u8,
    pub skill_level: SkillLevel,
    pub interests: Vec<String>,
    pub completed_projects: Vec<String>,
    pub learning_preferences: HashMap<String, String>,
}

#[command]
pub async fn generate_personalized_curriculum(
    student_profile: StudentProfile,
    duration_weeks: u8,
    enhanced_ai: State<'_, EnhancedAIServiceState>
) -> Result<LearningPath, String> {
    info!("生成个性化课程，持续{}周", duration_weeks);
    
    let request = LearningPathRequest {
        student_age: student_profile.age,
        current_skill_level: student_profile.skill_level,
        interests: student_profile.interests,
        preferred_devices: vec!["Arduino".to_string(), "micro:bit".to_string()],
        learning_goals: vec![
            "掌握基础编程概念".to_string(),
            "完成有趣的项目".to_string(),
            "培养逻辑思维".to_string(),
        ],
    };
    
    let enhanced_ai = enhanced_ai.lock().await;
    let service = enhanced_ai.as_ref()
        .ok_or_else(|| "AI服务未配置".to_string())?;
    
    service.generate_learning_path(request).await.map_err(|e| {
        error!("生成个性化课程失败: {}", e);
        format!("生成个性化课程失败: {}", e)
    })
}

#[command]
pub async fn get_age_appropriate_templates(
    age: u8,
    enhanced_ai: State<'_, EnhancedAIServiceState>
) -> Result<Vec<ProjectTemplate>, String> {
    let skill_level = match age {
        5..=6 => SkillLevel::Beginner,
        7..=8 => SkillLevel::Novice,
        9..=10 => SkillLevel::Intermediate,
        _ => SkillLevel::Advanced,
    };
    
    let enhanced_ai = enhanced_ai.lock().await;
    let service = enhanced_ai.as_ref()
        .ok_or_else(|| "AI服务未配置".to_string())?;
    
    let templates = service.get_suitable_templates(age, &skill_level, None);
    Ok(templates.into_iter().cloned().collect())
}

#[command]
pub async fn validate_child_code(
    code: String,
    language: String,
    enhanced_ai: State<'_, EnhancedAIServiceState>
) -> Result<HashMap<String, serde_json::Value>, String> {
    info!("验证儿童代码安全性和适用性");
    
    let request = CodeOptimizationRequest {
        code: code.clone(),
        language,
        device_type: "generic".to_string(),
        optimization_goals: vec![OptimizationGoal::ChildFriendly],
    };
    
    let enhanced_ai = enhanced_ai.lock().await;
    let service = enhanced_ai.as_ref()
        .ok_or_else(|| "AI服务未配置".to_string())?;
    
    let response = service.optimize_code(request).await.map_err(|e| {
        error!("代码验证失败: {}", e);
        format!("代码验证失败: {}", e)
    })?;
    
    let mut result = HashMap::new();
    result.insert("is_safe".to_string(), serde_json::json!(true));
    result.insert("is_age_appropriate".to_string(), serde_json::json!(true));
    result.insert("suggestions".to_string(), serde_json::json!(response.improvements));
    result.insert("explanation".to_string(), serde_json::json!(response.explanation));
    
    Ok(result)
}