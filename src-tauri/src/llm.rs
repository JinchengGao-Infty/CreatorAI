use crate::{prompt, secure, storage, types::*};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};

fn normalize_base_url(base_url: &str) -> String {
    base_url.trim_end_matches('/').to_string()
}

fn headers(api_key: &str) -> Result<HeaderMap, String> {
    let mut headers = HeaderMap::new();
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Bearer {api_key}"))
            .map_err(|e| format!("无效的 API Key: {e}"))?,
    );
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    Ok(headers)
}

#[derive(serde::Deserialize)]
struct ModelsResponse {
    data: Vec<ModelItem>,
}

#[derive(serde::Deserialize)]
struct ModelItem {
    id: String,
}

pub async fn fetch_models(base_url: &str, endpoint_id: &str) -> Result<Vec<String>, String> {
    let api_key = secure::get_api_key(endpoint_id)?;
    let url = format!("{}/models", normalize_base_url(base_url));
    let client = reqwest::Client::new();
    let res = client
        .get(url)
        .headers(headers(&api_key)?)
        .send()
        .await
        .map_err(|e| format!("请求模型列表失败: {e}"))?;

    if !res.status().is_success() {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        return Err(format!("请求模型列表失败: {status} {body}"));
    }

    let parsed: ModelsResponse = res.json().await.map_err(|e| format!("解析模型列表失败: {e}"))?;
    let mut models = parsed.data.into_iter().map(|m| m.id).collect::<Vec<_>>();
    models.sort();
    Ok(models)
}

fn active_endpoint(cfg: &LlmConfig) -> Result<EndpointConfig, String> {
    if cfg.endpoints.is_empty() {
        return Err("请先在“模型设置”中添加一个 API 端点".to_string());
    }
    if let Some(id) = &cfg.active_endpoint_id {
        if let Some(ep) = cfg.endpoints.iter().find(|e| &e.id == id) {
            return Ok(ep.clone());
        }
    }
    Ok(cfg.endpoints[0].clone())
}

fn active_model(cfg: &LlmConfig, ep: &EndpointConfig) -> String {
    cfg.active_model
        .clone()
        .filter(|m| !m.trim().is_empty())
        .unwrap_or_else(|| ep.default_model.clone())
}

async fn post_chat_completions(
    base_url: &str,
    api_key: &str,
    model: &str,
    params: &ModelParameters,
    messages: Vec<serde_json::Value>,
) -> Result<String, String> {
    let url = format!("{}/chat/completions", normalize_base_url(base_url));
    let mut body = serde_json::json!({
      "model": model,
      "messages": messages,
      "max_tokens": params.max_tokens,
      "temperature": params.temperature,
    });

    if let Some(top_p) = params.top_p {
        if top_p < 1.0 {
            body["top_p"] = serde_json::json!(top_p);
        }
    }
    if let Some(top_k) = params.top_k {
        if top_k > 0 {
            body["top_k"] = serde_json::json!(top_k);
        }
    }

    let client = reqwest::Client::new();
    let res = client
        .post(url)
        .headers(headers(api_key)?)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("请求失败: {e}"))?;

    if !res.status().is_success() {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        return Err(format!("请求失败: {status} {body}"));
    }

    let v: serde_json::Value = res.json().await.map_err(|e| format!("解析响应失败: {e}"))?;
    let content = v
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c0| c0.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .ok_or("响应缺少 choices[0].message.content")?;
    Ok(content.to_string())
}

fn extract_json_block(raw: &str) -> Option<String> {
    // Try ```json ... ```
    let start = raw.find("```json")?;
    let after = &raw[start + "```json".len()..];
    let end = after.find("```")?;
    Some(after[..end].trim().to_string())
}

fn parse_generation(raw: &str) -> GenerationResponse {
    let candidate = extract_json_block(raw).unwrap_or_else(|| raw.trim().to_string());
    match serde_json::from_str::<serde_json::Value>(&candidate) {
        Ok(v) => GenerationResponse {
            content: v.get("content").and_then(|x| x.as_str()).unwrap_or("").to_string(),
            summary: v.get("summary").and_then(|x| x.as_str()).unwrap_or("").to_string(),
            raw: None,
        },
        Err(_) => GenerationResponse {
            content: raw.to_string(),
            summary: "".to_string(),
            raw: Some(raw.to_string()),
        },
    }
}

pub async fn continue_chapter(project_dir: &str, chapter_id: u32, instruction: &str) -> Result<GenerationResponse, String> {
    let preset = storage::load_preset(project_dir.to_string())?;
    let cfg = storage::load_llm_config(project_dir.to_string())?;
    let ep = active_endpoint(&cfg)?;
    let model = active_model(&cfg, &ep);
    let api_key = secure::get_api_key(&ep.id)
        .map_err(|_| "当前端点未设置 API Key（请到“模型设置”里设置）".to_string())?;

    let chapter = storage::load_chapter(project_dir.to_string(), chapter_id)?;
    let summaries = storage::load_summaries(project_dir.to_string())?;
    let mut ctx = summaries
        .into_iter()
        .filter(|s| !s.summary.trim().is_empty())
        .rev()
        .take(20)
        .map(|s| (s.chapter_title, s.summary))
        .collect::<Vec<_>>();
    ctx.reverse();

    let system = prompt::build_system_prompt(&preset, "continue");
    let user = prompt::build_user_prompt(&ctx, &chapter.content, "continue", instruction);
    let messages = vec![
        serde_json::json!({ "role": "system", "content": system }),
        serde_json::json!({ "role": "user", "content": user }),
    ];

    let raw = post_chat_completions(&ep.base_url, &api_key, &model, &ep.parameters, messages).await?;
    Ok(parse_generation(&raw))
}

pub async fn discuss(project_dir: &str, session_id: &str, user_message: &str) -> Result<ChatMessage, String> {
    let preset = storage::load_preset(project_dir.to_string())?;
    let cfg = storage::load_llm_config(project_dir.to_string())?;
    let ep = active_endpoint(&cfg)?;
    let model = active_model(&cfg, &ep);
    let api_key = secure::get_api_key(&ep.id)
        .map_err(|_| "当前端点未设置 API Key（请到“模型设置”里设置）".to_string())?;

    let mut session = storage::load_chat_session(project_dir.to_string(), session_id.to_string())?;
    let system = prompt::build_system_prompt(&preset, "discuss");

    let user_msg = ChatMessage {
        role: "user".to_string(),
        content: user_message.to_string(),
        created_at: prompt::now_iso(),
    };
    session.messages.push(user_msg.clone());

    let history = session
        .messages
        .iter()
        .filter(|m| m.role == "user" || m.role == "assistant")
        .cloned()
        .collect::<Vec<_>>();
    let messages = prompt::to_openai_messages(system, &history[..history.len().saturating_sub(1)], user_message.to_string());

    let raw = post_chat_completions(&ep.base_url, &api_key, &model, &ep.parameters, messages).await?;
    let assistant = ChatMessage {
        role: "assistant".to_string(),
        content: raw,
        created_at: prompt::now_iso(),
    };
    session.messages.push(assistant.clone());

    if session.title.trim().is_empty() || session.title == "新对话" {
        let t = user_message.trim();
        if !t.is_empty() {
            session.title = t.chars().take(16).collect::<String>();
        }
    }

    storage::save_chat_session(project_dir.to_string(), &session)?;
    Ok(assistant)
}

