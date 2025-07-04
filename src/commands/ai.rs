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
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeepSeekMessage {
    pub role: String,
    pub content: String,
}

use futures_util::StreamExt;
use tauri::Emitter;

#[derive(Clone, Serialize)]
struct StreamEvent {
    chunk: String,
    finished: bool,
}

#[tauri::command]
pub async fn chat_with_deepseek(
    api_key: String,
    api_url: String,
    messages: Vec<DeepSeekMessage>,
) -> Result<String, String> {
    chat_with_ai_generic(api_key, api_url, "deepseek-chat".to_string(), messages).await
}

// 通用的AI聊天接口
#[tauri::command]
pub async fn chat_with_ai_generic(
    api_key: String,
    api_url: String,
    model: String,
    messages: Vec<DeepSeekMessage>,
) -> Result<String, String> {
    use log::info;
    info!("调用AI API (模型: {})...", model);
    
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))  // 30秒超时
        .build()
        .map_err(|e| format!("创建HTTP客户端失败: {}", e))?;
    
    // 根据模型调整参数
    let (temperature, max_tokens, top_p) = match model.as_str() {
        "deepseek-reasoner" => (0.5, 4096, 0.95),  // 深度思考模型，需要更大的上下文
        "gpt-4o" => (0.7, 4096, 0.95),  // GPT-4o 支持长上下文
        "gpt-4o-mini" => (0.7, 1000, 0.9),  // 简单任务
        "deepseek-chat" => (0.3, 1000, 0.9),  // 简单任务
        _ => (0.5, 1000, 0.9),  // 默认值
    };
    
    // OpenAI兼容的API
    let request_body = serde_json::json!({
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "top_p": top_p,
        "frequency_penalty": 0.1,
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

// 流式响应版本
#[tauri::command]
pub async fn chat_with_deepseek_stream(
    window: tauri::Window,
    api_key: String,
    api_url: String,
    messages: Vec<DeepSeekMessage>,
    event_name: String,
) -> Result<(), String> {
    chat_with_ai_stream_generic(window, api_key, api_url, "deepseek-chat".to_string(), messages, event_name).await
}

// 通用的AI流式聊天接口
#[tauri::command]
pub async fn chat_with_ai_stream_generic(
    window: tauri::Window,
    api_key: String,
    api_url: String,
    model: String,
    messages: Vec<DeepSeekMessage>,
    event_name: String,
) -> Result<(), String> {
    use log::info;
    info!("调用AI API (流式, 模型: {})...", model);
    
    let client = reqwest::Client::new();
    
    // 注意：o1系列模型不支持流式响应
    if model.starts_with("o1-") {
        // 使用非流式API并模拟流式效果
        let result = chat_with_ai_generic(api_key, api_url, model, messages).await?;
        window.emit(&event_name, StreamEvent {
            chunk: result,
            finished: false,
        }).map_err(|e| format!("发送事件失败: {}", e))?;
        window.emit(&event_name, StreamEvent {
            chunk: String::new(),
            finished: true,
        }).map_err(|e| format!("发送事件失败: {}", e))?;
        return Ok(());
    }
    
    // 根据模型调整参数（与非流式保持一致）
    let (temperature, max_tokens, top_p) = match model.as_str() {
        "deepseek-reasoner" => (0.5, 4096, 0.95),  // 深度思考模型，需要更大的上下文
        "gpt-4o" => (0.7, 4096, 0.95),  // GPT-4o 支持长上下文
        "gpt-4o-mini" => (0.7, 1000, 0.9),  // 简单任务
        "deepseek-chat" => (0.3, 1000, 0.9),  // 简单任务
        _ => (0.5, 1000, 0.9),  // 默认值
    };
    
    let request_body = serde_json::json!({
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "top_p": top_p,
        "stream": true,  // 启用流式响应
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
    
    // 处理流式响应
    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    
    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(bytes) => {
                let text = String::from_utf8_lossy(&bytes);
                buffer.push_str(&text);
                
                // 处理 SSE (Server-Sent Events) 格式
                while let Some(line_end) = buffer.find('\n') {
                    let line = buffer[..line_end].trim().to_string();
                    buffer = buffer[line_end + 1..].to_string();
                    
                    if line.starts_with("data: ") {
                        let data = &line[6..];
                        if data == "[DONE]" {
                            // 流结束
                            window.emit(&event_name, StreamEvent {
                                chunk: String::new(),
                                finished: true,
                            }).map_err(|e| format!("发送事件失败: {}", e))?;
                            break;
                        }
                        
                        // 解析 JSON
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                            if let Some(content) = json["choices"][0]["delta"]["content"].as_str() {
                                // 发送内容片段
                                window.emit(&event_name, StreamEvent {
                                    chunk: content.to_string(),
                                    finished: false,
                                }).map_err(|e| format!("发送事件失败: {}", e))?;
                            }
                        }
                    }
                }
            }
            Err(e) => {
                return Err(format!("读取流失败: {}", e));
            }
        }
    }
    
    Ok(())
}

// 测试API连接
#[tauri::command]
pub async fn test_deepseek_connection(
    api_key: String,
    api_url: String,
) -> Result<bool, String> {
    test_ai_connection(api_key, api_url, "deepseek-chat".to_string()).await
}

// 通用的AI连接测试
#[tauri::command]
pub async fn test_ai_connection(
    api_key: String,
    api_url: String,
    model: String,
) -> Result<bool, String> {
    use log::info;
    info!("测试AI API连接 (模型: {})...", model);
    
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
        "model": model,
        "messages": test_messages,
        "temperature": 0.7,
        "max_tokens": 10,
    });
    
    // OpenAI兼容的API (OpenAI, DeepSeek等)
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