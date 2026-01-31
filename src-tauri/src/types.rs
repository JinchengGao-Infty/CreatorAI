use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AppState {
    pub last_project_dir: Option<String>,
    pub last_session_id: Option<String>,
    pub last_chapter_id: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectInfo {
    pub project_dir: String,
    pub project_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChapterIndexItem {
    pub id: u32,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Chapter {
    pub id: u32,
    pub title: String,
    pub content: String,
    #[serde(default)]
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Preset {
    pub style: String,
    pub pov: String,
    pub rules: Vec<String>,
}

impl Preset {
    pub fn default_zh() -> Self {
        Self {
            style: "细腻、沉浸、画面感强".to_string(),
            pov: "第三人称限定视角".to_string(),
            rules: vec![
                "保持文风一致".to_string(),
                "注重感官描写".to_string(),
                "避免上帝视角".to_string(),
                "通过行为和细节展现情感".to_string(),
            ],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GenerationResponse {
    pub content: String,
    pub summary: String,
    #[serde(default)]
    pub raw: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SummaryRecord {
    pub id: String,
    pub chapter_id: u32,
    pub chapter_title: String,
    pub summary: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ModelParameters {
    pub temperature: f32,
    pub max_tokens: u32,
    #[serde(default)]
    pub top_p: Option<f32>,
    #[serde(default)]
    pub top_k: Option<u32>,
}

impl ModelParameters {
    pub fn default_for_writing() -> Self {
        Self {
            temperature: 0.8,
            max_tokens: 4000,
            top_p: None,
            top_k: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EndpointConfig {
    pub id: String,
    pub name: String,
    pub base_url: String,
    pub default_model: String,
    #[serde(default)]
    pub parameters: ModelParameters,
}

impl EndpointConfig {
    pub fn new(name: String, base_url: String, default_model: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            base_url,
            default_model,
            parameters: ModelParameters::default_for_writing(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LlmConfig {
    #[serde(default)]
    pub endpoints: Vec<EndpointConfig>,
    pub active_endpoint_id: Option<String>,
    pub active_model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatSessionIndexItem {
    pub id: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatSession {
    pub id: String,
    pub title: String,
    pub messages: Vec<ChatMessage>,
}
