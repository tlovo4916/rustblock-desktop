use serde::{Deserialize, Serialize};
use anyhow::{Result, anyhow};
use reqwest::Client;
use log::{info, error, debug};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String, // "user", "assistant", "system"
    pub content: String,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequest {
    pub messages: Vec<ChatMessage>,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub message: String,
    pub usage: Option<TokenUsage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeAnalysisRequest {
    pub code: String,
    pub language: String, // "arduino", "micropython"
    pub device_type: String,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeAnalysisResponse {
    pub analysis: String,
    pub suggestions: Vec<String>,
    pub fixed_code: Option<String>,
    pub confidence: f32, // 0.0 - 1.0
}

pub struct AIService {
    client: Client,
    api_key: String,
    base_url: String,
}

impl AIService {
    pub fn new(api_key: String, base_url: Option<String>) -> Self {
        Self {
            client: Client::new(),
            api_key,
            base_url: base_url.unwrap_or_else(|| "https://api.deepseek.com".to_string()),
        }
    }

    /// 与DeepSeek V3对话 - 面向10岁以下小朋友的友好对话
    pub async fn chat_with_ai(&self, request: ChatRequest) -> Result<ChatResponse> {
        info!("开始AI对话请求");
        debug!("对话消息数量: {}", request.messages.len());

        // 添加系统提示，确保AI回复适合10岁以下小朋友
        let mut messages = vec![ChatMessage {
            role: "system".to_string(),
            content: "你是RustBlock的AI助手，专门帮助10岁以下的小朋友学习编程。请用简单易懂的语言回答问题，保持友好和鼓励的语气。当回答技术问题时，用小朋友能理解的比喻和例子。如果遇到复杂概念，请分步骤解释。".to_string(),
            timestamp: chrono::Utc::now().timestamp(),
        }];
        
        messages.extend(request.messages);

        let payload = serde_json::json!({
            "model": "deepseek-chat",
            "messages": messages.iter().map(|msg| serde_json::json!({
                "role": msg.role,
                "content": msg.content
            })).collect::<Vec<_>>(),
            "max_tokens": request.max_tokens.unwrap_or(2000),
            "temperature": request.temperature.unwrap_or(0.7),
            "stream": false
        });

        let response = self.client
            .post(&format!("{}/v1/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await
            .map_err(|e| anyhow!("发送AI请求失败: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "未知错误".to_string());
            error!("AI请求失败: {}", error_text);
            return Err(anyhow!("AI服务响应错误: {}", error_text));
        }

        let response_body: serde_json::Value = response.json().await
            .map_err(|e| anyhow!("解析AI响应失败: {}", e))?;

        debug!("AI响应: {:?}", response_body);

        let message = response_body["choices"][0]["message"]["content"]
            .as_str()
            .ok_or_else(|| anyhow!("AI响应格式错误"))?
            .to_string();

        let usage = response_body.get("usage").and_then(|u| {
            Some(TokenUsage {
                prompt_tokens: u["prompt_tokens"].as_u64()? as u32,
                completion_tokens: u["completion_tokens"].as_u64()? as u32,
                total_tokens: u["total_tokens"].as_u64()? as u32,
            })
        });

        info!("AI对话成功完成");
        Ok(ChatResponse { message, usage })
    }

    /// 使用DeepSeek R1分析和优化代码
    pub async fn analyze_code(&self, request: CodeAnalysisRequest) -> Result<CodeAnalysisResponse> {
        info!("开始代码分析请求");
        debug!("代码语言: {}, 设备类型: {}", request.language, request.device_type);

        let analysis_prompt = self.build_code_analysis_prompt(&request);

        let messages = vec![
            ChatMessage {
                role: "system".to_string(),
                content: "你是一个专业的代码分析师，擅长Arduino和MicroPython代码的调试和优化。请仔细分析提供的代码，找出问题并给出具体的修复建议。如果可以，请提供修复后的代码。".to_string(),
                timestamp: chrono::Utc::now().timestamp(),
            },
            ChatMessage {
                role: "user".to_string(),
                content: analysis_prompt,
                timestamp: chrono::Utc::now().timestamp(),
            }
        ];

        let chat_request = ChatRequest {
            messages,
            max_tokens: Some(4000),
            temperature: Some(0.2), // 使用较低的温度以获得更准确的分析
        };

        let chat_response = self.chat_with_ai(chat_request).await?;
        
        // 解析AI的响应，提取分析结果、建议和修复代码
        let (analysis, suggestions, fixed_code) = self.parse_analysis_response(&chat_response.message);

        info!("代码分析完成");
        Ok(CodeAnalysisResponse {
            analysis,
            suggestions,
            fixed_code,
            confidence: 0.8, // 暂时设置固定值，后续可以根据实际情况调整
        })
    }

    fn build_code_analysis_prompt(&self, request: &CodeAnalysisRequest) -> String {
        let mut prompt = format!(
            "请分析以下{}代码，目标设备是{}：\n\n```{}\n{}\n```\n\n",
            request.language, request.device_type, request.language, request.code
        );

        if let Some(error) = &request.error_message {
            prompt.push_str(&format!("编译或运行时出现以下错误：\n{}\n\n", error));
        }

        prompt.push_str("请提供：\n");
        prompt.push_str("1. 代码分析（问题识别）\n");
        prompt.push_str("2. 具体的修复建议\n");
        prompt.push_str("3. 修复后的完整代码（如果需要修改）\n");
        prompt.push_str("4. 代码优化建议（如果有）\n\n");
        prompt.push_str("请用清晰的格式回复，便于解析。");

        prompt
    }

    fn parse_analysis_response(&self, response: &str) -> (String, Vec<String>, Option<String>) {
        let mut analysis = String::new();
        let mut suggestions = Vec::new();
        let mut fixed_code = None;

        // 简单的解析逻辑，后续可以使用更复杂的NLP处理
        let lines: Vec<&str> = response.lines().collect();
        let mut current_section = "";
        let mut code_block = String::new();
        let mut in_code_block = false;

        for line in lines {
            if line.starts_with("```") {
                if in_code_block {
                    // 代码块结束
                    if !code_block.trim().is_empty() {
                        fixed_code = Some(code_block.trim().to_string());
                    }
                    in_code_block = false;
                    code_block.clear();
                } else {
                    // 代码块开始
                    in_code_block = true;
                }
                continue;
            }

            if in_code_block {
                code_block.push_str(line);
                code_block.push('\n');
                continue;
            }

            if line.contains("分析") || line.contains("问题") {
                current_section = "analysis";
            } else if line.contains("建议") || line.contains("修复") {
                current_section = "suggestions";
            }

            match current_section {
                "analysis" => {
                    if !line.trim().is_empty() && !line.contains("分析") {
                        if !analysis.is_empty() {
                            analysis.push('\n');
                        }
                        analysis.push_str(line.trim());
                    }
                },
                "suggestions" => {
                    if !line.trim().is_empty() && !line.contains("建议") {
                        suggestions.push(line.trim().to_string());
                    }
                },
                _ => {}
            }
        }

        // 如果没有解析到具体内容，将整个响应作为分析结果
        if analysis.is_empty() {
            analysis = response.to_string();
        }

        (analysis, suggestions, fixed_code)
    }
} 