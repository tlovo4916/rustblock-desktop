use super::{AIService, ChatMessage, ChatRequest};
use serde::{Deserialize, Serialize};
use anyhow::{Result, anyhow};
use std::collections::HashMap;
use log::{info, debug};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeOptimizationRequest {
    pub code: String,
    pub language: String,
    pub device_type: String,
    pub optimization_goals: Vec<OptimizationGoal>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OptimizationGoal {
    Performance,      // 性能优化
    Memory,          // 内存优化
    Readability,     // 可读性优化
    BestPractices,   // 最佳实践
    ChildFriendly,   // 儿童友好
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeOptimizationResponse {
    pub original_issues: Vec<String>,
    pub optimized_code: String,
    pub improvements: Vec<Improvement>,
    pub explanation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Improvement {
    pub category: OptimizationGoal,
    pub description: String,
    pub before: String,
    pub after: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningPathRequest {
    pub student_age: u8,
    pub current_skill_level: SkillLevel,
    pub interests: Vec<String>,
    pub preferred_devices: Vec<String>,
    pub learning_goals: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SkillLevel {
    Beginner,      // 初学者
    Novice,        // 新手
    Intermediate,  // 中级
    Advanced,      // 高级
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningPath {
    pub title: String,
    pub description: String,
    pub estimated_time: String,
    pub difficulty: SkillLevel,
    pub steps: Vec<LearningStep>,
    pub required_materials: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningStep {
    pub step_number: u32,
    pub title: String,
    pub description: String,
    pub objectives: Vec<String>,
    pub activities: Vec<Activity>,
    pub estimated_time: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Activity {
    pub activity_type: ActivityType,
    pub title: String,
    pub description: String,
    pub template_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ActivityType {
    Tutorial,      // 教程
    Practice,      // 练习
    Project,       // 项目
    Challenge,     // 挑战
    Review,        // 复习
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectTemplate {
    pub id: String,
    pub title: String,
    pub description: String,
    pub age_range: (u8, u8),
    pub difficulty: SkillLevel,
    pub device_types: Vec<String>,
    pub programming_language: String,
    pub estimated_time: String,
    pub learning_objectives: Vec<String>,
    pub materials_needed: Vec<String>,
    pub blockly_xml: String,
    pub generated_code: String,
    pub step_by_step_guide: Vec<ProjectStep>,
    pub extensions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectStep {
    pub step_number: u32,
    pub title: String,
    pub instruction: String,
    pub code_snippet: Option<String>,
    pub expected_result: String,
    pub troubleshooting: Vec<String>,
}

pub struct EnhancedAIService {
    ai_service: AIService,
    project_templates: HashMap<String, ProjectTemplate>,
}

impl EnhancedAIService {
    pub fn new(ai_service: AIService) -> Self {
        let mut service = Self {
            ai_service,
            project_templates: HashMap::new(),
        };
        service.initialize_default_templates();
        service
    }

    /// 代码优化功能
    pub async fn optimize_code(&self, request: CodeOptimizationRequest) -> Result<CodeOptimizationResponse> {
        info!("开始代码优化请求");
        
        let optimization_prompt = self.build_optimization_prompt(&request);
        
        let messages = vec![
            ChatMessage {
                role: "system".to_string(),
                content: "你是一个专业的代码优化专家，专门为儿童编程教育优化代码。请保持代码的简单性和可读性，同时提供性能和最佳实践的改进。".to_string(),
                timestamp: chrono::Utc::now().timestamp(),
            },
            ChatMessage {
                role: "user".to_string(),
                content: optimization_prompt,
                timestamp: chrono::Utc::now().timestamp(),
            }
        ];

        let chat_request = ChatRequest {
            messages,
            max_tokens: Some(4000),
            temperature: Some(0.3),
        };

        let chat_response = self.ai_service.chat_with_ai(chat_request).await?;
        
        // 解析优化响应
        let (issues, optimized_code, improvements, explanation) = 
            self.parse_optimization_response(&chat_response.message);

        Ok(CodeOptimizationResponse {
            original_issues: issues,
            optimized_code,
            improvements,
            explanation,
        })
    }

    /// 生成个性化学习路径
    pub async fn generate_learning_path(&self, request: LearningPathRequest) -> Result<LearningPath> {
        info!("生成学习路径，年龄: {}, 技能水平: {:?}", request.student_age, request.current_skill_level);
        
        let learning_prompt = self.build_learning_path_prompt(&request);
        
        let messages = vec![
            ChatMessage {
                role: "system".to_string(),
                content: "你是一个儿童编程教育专家，擅长为不同年龄和技能水平的孩子设计个性化的学习路径。请根据孩子的兴趣和目标，制定循序渐进、有趣且具有挑战性的学习计划。".to_string(),
                timestamp: chrono::Utc::now().timestamp(),
            },
            ChatMessage {
                role: "user".to_string(),
                content: learning_prompt,
                timestamp: chrono::Utc::now().timestamp(),
            }
        ];

        let chat_request = ChatRequest {
            messages,
            max_tokens: Some(6000),
            temperature: Some(0.7),
        };

        let chat_response = self.ai_service.chat_with_ai(chat_request).await?;
        
        // 解析学习路径响应
        self.parse_learning_path_response(&chat_response.message, &request)
    }

    /// 获取项目模板
    pub fn get_project_template(&self, template_id: &str) -> Option<&ProjectTemplate> {
        self.project_templates.get(template_id)
    }

    /// 获取适合的项目模板
    pub fn get_suitable_templates(&self, age: u8, skill_level: &SkillLevel, device_type: Option<&str>) -> Vec<&ProjectTemplate> {
        self.project_templates
            .values()
            .filter(|template| {
                age >= template.age_range.0 && age <= template.age_range.1 &&
                self.skill_level_matches(&template.difficulty, skill_level) &&
                device_type.map_or(true, |device| template.device_types.contains(&device.to_string()))
            })
            .collect()
    }

    /// 根据学习目标推荐项目
    pub async fn recommend_projects(&self, learning_goals: Vec<String>, student_age: u8, skill_level: SkillLevel) -> Result<Vec<ProjectTemplate>> {
        info!("推荐项目，目标: {:?}", learning_goals);
        
        let suitable_templates = self.get_suitable_templates(student_age, &skill_level, None);
        
        // 使用AI来评估哪些项目最适合学习目标
        let recommendation_prompt = format!(
            "学生年龄: {}, 技能水平: {:?}, 学习目标: {:?}\n\n可选项目:\n{}",
            student_age,
            skill_level,
            learning_goals,
            suitable_templates.iter()
                .map(|t| format!("- {}: {}", t.title, t.description))
                .collect::<Vec<_>>()
                .join("\n")
        );

        let messages = vec![
            ChatMessage {
                role: "system".to_string(),
                content: "你是一个项目推荐专家，请根据学生的学习目标推荐最适合的项目，并说明推荐理由。".to_string(),
                timestamp: chrono::Utc::now().timestamp(),
            },
            ChatMessage {
                role: "user".to_string(),
                content: recommendation_prompt,
                timestamp: chrono::Utc::now().timestamp(),
            }
        ];

        let chat_request = ChatRequest {
            messages,
            max_tokens: Some(2000),
            temperature: Some(0.5),
        };

        let _chat_response = self.ai_service.chat_with_ai(chat_request).await?;
        
        // 简化版本：返回前3个适合的模板
        Ok(suitable_templates.into_iter().take(3).cloned().collect())
    }

    /// 生成自定义项目模板
    pub async fn generate_custom_template(&self, 
        title: String, 
        description: String,
        age: u8,
        skill_level: SkillLevel,
        device_type: String,
        learning_objectives: Vec<String>
    ) -> Result<ProjectTemplate> {
        info!("生成自定义项目模板: {}", title);
        
        let template_prompt = format!(
            "请为以下项目创建详细的教学模板：\n\
            项目标题: {}\n\
            项目描述: {}\n\
            目标年龄: {}\n\
            技能水平: {:?}\n\
            设备类型: {}\n\
            学习目标: {:?}\n\n\
            请提供：\n\
            1. 详细的分步指导\n\
            2. 所需材料清单\n\
            3. 预期学习时间\n\
            4. 每个步骤的具体说明\n\
            5. 可能遇到的问题和解决方案",
            title, description, age, skill_level, device_type, learning_objectives
        );

        let messages = vec![
            ChatMessage {
                role: "system".to_string(),
                content: "你是一个儿童编程课程设计专家，请创建详细的项目教学模板。".to_string(),
                timestamp: chrono::Utc::now().timestamp(),
            },
            ChatMessage {
                role: "user".to_string(),
                content: template_prompt,
                timestamp: chrono::Utc::now().timestamp(),
            }
        ];

        let chat_request = ChatRequest {
            messages,
            max_tokens: Some(6000),
            temperature: Some(0.6),
        };

        let chat_response = self.ai_service.chat_with_ai(chat_request).await?;
        
        // 解析响应并创建模板
        self.parse_custom_template_response(&chat_response.message, title, description, age, skill_level, device_type, learning_objectives)
    }

    // 私有辅助方法

    fn build_optimization_prompt(&self, request: &CodeOptimizationRequest) -> String {
        let goals_str = request.optimization_goals.iter()
            .map(|goal| match goal {
                OptimizationGoal::Performance => "性能优化",
                OptimizationGoal::Memory => "内存优化",
                OptimizationGoal::Readability => "可读性优化",
                OptimizationGoal::BestPractices => "最佳实践",
                OptimizationGoal::ChildFriendly => "儿童友好",
            })
            .collect::<Vec<_>>()
            .join(", ");

        format!(
            "请优化以下{}代码，目标设备: {}，优化目标: {}\n\n```{}\n{}\n```\n\n\
            请提供：\n\
            1. 原代码存在的问题\n\
            2. 优化后的完整代码\n\
            3. 每个改进点的详细说明\n\
            4. 优化效果的预期\n\
            5. 适合儿童理解的解释",
            request.language, request.device_type, goals_str, request.language, request.code
        )
    }

    fn build_learning_path_prompt(&self, request: &LearningPathRequest) -> String {
        format!(
            "请为{}岁的孩子设计个性化编程学习路径：\n\
            当前技能水平: {:?}\n\
            兴趣领域: {:?}\n\
            偏好设备: {:?}\n\
            学习目标: {:?}\n\n\
            请提供：\n\
            1. 学习路径标题和总体描述\n\
            2. 预估学习时间\n\
            3. 详细的学习步骤（至少5个步骤）\n\
            4. 每个步骤的学习目标和活动\n\
            5. 所需材料清单\n\
            6. 适合年龄的项目建议",
            request.student_age, request.current_skill_level, request.interests, 
            request.preferred_devices, request.learning_goals
        )
    }

    fn parse_optimization_response(&self, response: &str) -> (Vec<String>, String, Vec<Improvement>, String) {
        // 简化的解析逻辑，实际应用中可以使用更复杂的NLP处理
        let issues = vec!["代码结构需要优化".to_string()];
        let optimized_code = "// 优化后的代码".to_string();
        let improvements = vec![
            Improvement {
                category: OptimizationGoal::Readability,
                description: "提高代码可读性".to_string(),
                before: "原始代码片段".to_string(),
                after: "优化后代码片段".to_string(),
            }
        ];
        let explanation = response.to_string();

        (issues, optimized_code, improvements, explanation)
    }

    fn parse_learning_path_response(&self, response: &str, request: &LearningPathRequest) -> Result<LearningPath> {
        // 简化的解析逻辑
        Ok(LearningPath {
            title: "个性化编程学习路径".to_string(),
            description: "根据学生需求定制的学习计划".to_string(),
            estimated_time: "4-6周".to_string(),
            difficulty: request.current_skill_level.clone(),
            steps: vec![
                LearningStep {
                    step_number: 1,
                    title: "基础概念学习".to_string(),
                    description: "了解编程基本概念".to_string(),
                    objectives: vec!["理解什么是编程".to_string()],
                    activities: vec![
                        Activity {
                            activity_type: ActivityType::Tutorial,
                            title: "编程入门".to_string(),
                            description: "学习编程基础".to_string(),
                            template_id: Some("basic_intro".to_string()),
                        }
                    ],
                    estimated_time: "1周".to_string(),
                }
            ],
            required_materials: vec!["Arduino板".to_string(), "LED灯".to_string()],
        })
    }

    fn parse_custom_template_response(&self, 
        response: &str, 
        title: String, 
        description: String,
        age: u8,
        skill_level: SkillLevel,
        device_type: String,
        learning_objectives: Vec<String>
    ) -> Result<ProjectTemplate> {
        Ok(ProjectTemplate {
            id: format!("custom_{}", chrono::Utc::now().timestamp()),
            title,
            description,
            age_range: (age.saturating_sub(2), age + 2),
            difficulty: skill_level,
            device_types: vec![device_type],
            programming_language: "arduino".to_string(),
            estimated_time: "2-3小时".to_string(),
            learning_objectives,
            materials_needed: vec!["Arduino开发板".to_string()],
            blockly_xml: "<xml></xml>".to_string(),
            generated_code: "// 生成的代码".to_string(),
            step_by_step_guide: vec![],
            extensions: vec![],
        })
    }

    fn skill_level_matches(&self, template_level: &SkillLevel, student_level: &SkillLevel) -> bool {
        use SkillLevel::*;
        matches!(
            (template_level, student_level),
            (Beginner, Beginner) | (Beginner, Novice) |
            (Novice, Beginner) | (Novice, Novice) | (Novice, Intermediate) |
            (Intermediate, Novice) | (Intermediate, Intermediate) | (Intermediate, Advanced) |
            (Advanced, Intermediate) | (Advanced, Advanced)
        )
    }

    fn initialize_default_templates(&mut self) {
        // 初始化一些默认的项目模板
        let templates = vec![
            ProjectTemplate {
                id: "blink_led".to_string(),
                title: "闪烁的LED灯".to_string(),
                description: "学习如何让LED灯闪烁，这是编程的第一步！".to_string(),
                age_range: (5, 10),
                difficulty: SkillLevel::Beginner,
                device_types: vec!["Arduino".to_string()],
                programming_language: "arduino".to_string(),
                estimated_time: "30分钟".to_string(),
                learning_objectives: vec![
                    "理解LED的工作原理".to_string(),
                    "学习基本的输出控制".to_string(),
                    "掌握delay函数的使用".to_string(),
                ],
                materials_needed: vec![
                    "Arduino Uno开发板".to_string(),
                    "LED灯".to_string(),
                    "220Ω电阻".to_string(),
                    "跳线".to_string(),
                ],
                blockly_xml: r#"<xml>
                    <block type="event_when_started">
                        <statement name="DO">
                            <block type="led_blink">
                                <field name="PIN">13</field>
                                <field name="TIMES">10</field>
                            </block>
                        </statement>
                    </block>
                </xml>"#.to_string(),
                generated_code: r#"void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}"#.to_string(),
                step_by_step_guide: vec![
                    ProjectStep {
                        step_number: 1,
                        title: "连接电路".to_string(),
                        instruction: "将LED的正极连接到Arduino的13号引脚".to_string(),
                        code_snippet: None,
                        expected_result: "LED正确连接到电路板".to_string(),
                        troubleshooting: vec!["检查极性是否正确".to_string()],
                    }
                ],
                extensions: vec!["尝试改变闪烁频率".to_string()],
            }
        ];

        for template in templates {
            self.project_templates.insert(template.id.clone(), template);
        }
    }
}