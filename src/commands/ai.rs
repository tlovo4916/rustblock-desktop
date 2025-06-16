use crate::ai::{AIService, ChatRequest, ChatResponse, CodeAnalysisRequest, CodeAnalysisResponse};
use tokio::sync::Mutex;
use tauri::{command, State};
use log::{info, error};

// 全局AI服务状态
pub type AIServiceState = Mutex<Option<AIService>>;

#[command]
pub async fn chat_with_ai(
    request: ChatRequest,
    ai_service: State<'_, AIServiceState>
) -> Result<ChatResponse, String> {
    info!("前端请求AI对话");
    
    let ai_service = ai_service.lock().await;
    
    match ai_service.as_ref() {
        Some(service) => {
            service.chat_with_ai(request).await.map_err(|e| {
                error!("AI对话失败: {}", e);
                format!("AI对话失败: {}", e)
            })
        },
        None => {
            error!("AI服务未初始化");
            Err("AI服务未配置，请先在设置中配置API密钥".to_string())
        }
    }
}

#[command]
pub async fn analyze_code(
    request: CodeAnalysisRequest,
    ai_service: State<'_, AIServiceState>
) -> Result<CodeAnalysisResponse, String> {
    info!("前端请求代码分析");
    
    let ai_service = ai_service.lock().await;
    
    match ai_service.as_ref() {
        Some(service) => {
            service.analyze_code(request).await.map_err(|e| {
                error!("代码分析失败: {}", e);
                format!("代码分析失败: {}", e)
            })
        },
        None => {
            error!("AI服务未初始化");
            Err("AI服务未配置，请先在设置中配置API密钥".to_string())
        }
    }
}

#[command]
pub async fn configure_ai_service(
    api_key: String,
    base_url: Option<String>,
    ai_service: State<'_, AIServiceState>
) -> Result<String, String> {
    info!("配置AI服务");
    
    let mut ai_service = ai_service.lock().await;
    
    if api_key.trim().is_empty() {
        return Err("API密钥不能为空".to_string());
    }
    
    let new_service = AIService::new(api_key, base_url);
    *ai_service = Some(new_service);
    
    info!("AI服务配置成功");
    Ok("AI服务配置成功".to_string())
} 