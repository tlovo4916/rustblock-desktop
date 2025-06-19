use crate::ai::{AIService, ChatMessage, ChatRequest, ChatResponse, CodeAnalysisRequest, CodeAnalysisResponse};
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::State;
use serde::{Deserialize, Serialize};

pub struct AIServiceState {
    service: Arc<Mutex<Option<AIService>>>,
}

impl AIServiceState {
    pub fn new(service: Option<AIService>) -> Self {
        Self {
            service: Arc::new(Mutex::new(service)),
        }
    }
}

#[tauri::command]
pub async fn chat_with_ai(
    state: State<'_, AIServiceState>,
    messages: Vec<ChatMessage>,
    max_tokens: Option<u32>,
    temperature: Option<f32>,
) -> Result<ChatResponse, String> {
    let service_lock = state.service.lock().await;
    let service = service_lock.as_ref().ok_or("AI服务未配置，请先在设置中配置API密钥")?;
    
    let request = ChatRequest {
        messages,
        max_tokens,
        temperature,
    };
    
    service.chat_with_ai(request).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn analyze_code(
    state: State<'_, AIServiceState>,
    code: String,
    language: String,
    device_type: String,
    error_message: Option<String>,
) -> Result<CodeAnalysisResponse, String> {
    let service_lock = state.service.lock().await;
    let service = service_lock.as_ref().ok_or("AI服务未配置，请先在设置中配置API密钥")?;
    
    let request = CodeAnalysisRequest {
        code,
        language,
        device_type,
        error_message,
    };
    
    service.analyze_code(request).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn configure_ai_service(
    state: State<'_, AIServiceState>,
    api_key: String,
    base_url: Option<String>,
) -> Result<(), String> {
    let mut service_lock = state.service.lock().await;
    *service_lock = Some(AIService::new(api_key, base_url));
    Ok(())
}

// DeepSeek专用命令
#[derive(Debug, Serialize, Deserialize)]
pub struct DeepSeekMessage {
    pub role: String,
    pub content: String,
}

#[tauri::command]
pub async fn chat_with_deepseek(
    api_key: String,
    api_url: String,
    messages: Vec<DeepSeekMessage>,
) -> Result<String, String> {
    use log::info;
    info!("调用DeepSeek API...");
    
    let client = reqwest::Client::new();
    
    let request_body = serde_json::json!({
        "model": "deepseek-chat",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1000,
    });
    
    let response = client
        .post(format!("{}/v1/chat/completions", api_url))
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API请求失败 ({}): {}", status, error_text));
    }
    
    let response_body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;
    
    if let Some(content) = response_body["choices"][0]["message"]["content"].as_str() {
        Ok(content.to_string())
    } else {
        Err("API响应中没有内容".to_string())
    }
}

// 测试API连接
#[tauri::command]
pub async fn test_deepseek_connection(
    api_key: String,
    api_url: String,
) -> Result<bool, String> {
    use log::info;
    info!("测试DeepSeek API连接...");
    
    let client = reqwest::Client::new();
    
    let test_messages = vec![
        DeepSeekMessage {
            role: "system".to_string(),
            content: "You are a helpful assistant.".to_string(),
        },
        DeepSeekMessage {
            role: "user".to_string(),
            content: "Say 'Hello' if you can hear me.".to_string(),
        },
    ];
    
    let request_body = serde_json::json!({
        "model": "deepseek-chat",
        "messages": test_messages,
        "temperature": 0.7,
        "max_tokens": 10,
    });
    
    let response = client
        .post(format!("{}/v1/chat/completions", api_url))
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await;
    
    match response {
        Ok(res) => Ok(res.status().is_success()),
        Err(_) => Ok(false),
    }
}