use crate::types::{ChatMessage, Preset};

pub fn build_system_prompt(preset: &Preset, task_action: &str) -> String {
    let rules_text = preset
        .rules
        .iter()
        .map(|r| format!("- {r}"))
        .collect::<Vec<_>>()
        .join("\n");

    let mut base_prompt = format!(
        "你是一位专业的小说写作助手。\n\n## 写作风格\n{}\n\n## 叙事视角\n{}\n\n## 写作规则\n{}\n",
        preset.style, preset.pov, rules_text
    );

    if task_action == "continue" {
        base_prompt.push_str(
            r#"
## 输出要求
你必须以 JSON 格式输出，包含两个字段：
1. "content": 生成的正文内容
2. "summary": 对生成内容的简短摘要（50-100字）

示例输出格式：
```json
{
  "content": "生成的正文...",
  "summary": "这段内容的摘要..."
}
```

只输出 JSON，不要有其他内容。
"#,
        );
    } else {
        base_prompt.push_str(
            r#"
## 输出要求
你现在是创作顾问模式。请与用户讨论创作思路、情节发展、角色塑造等问题。
给出专业的建议和灵感启发，像一个有经验的编辑在和作者交流。
直接用自然语言回复，不需要 JSON 格式。
"#,
        );
    }

    base_prompt
}

pub fn build_user_prompt(
    chapter_summaries: &[(String, String)],
    current_text: &str,
    task_action: &str,
    instruction: &str,
) -> String {
    let mut parts: Vec<String> = vec![];

    if !chapter_summaries.is_empty() {
        parts.push("## 前文摘要".to_string());
        for (title, summary) in chapter_summaries {
            parts.push(format!("【{title}】{summary}"));
        }
        parts.push("".to_string());
    }

    if !current_text.is_empty() {
        parts.push("## 当前章节内容".to_string());
        parts.push(current_text.to_string());
        parts.push("".to_string());
    }

    let action_text = match task_action {
        "continue" => "续写正文",
        "discuss" => "讨论创作",
        "outline" => "生成大纲",
        "polish" => "润色修改",
        other => other,
    };
    parts.push(format!("## 任务：{action_text}"));
    if !instruction.trim().is_empty() {
        parts.push(format!("用户说：{}", instruction.trim()));
    }

    parts.join("\n")
}

pub fn now_iso() -> String {
    time::OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string())
}

pub fn to_openai_messages(system: String, history: &[ChatMessage], user: String) -> Vec<serde_json::Value> {
    let mut out = vec![serde_json::json!({ "role": "system", "content": system })];
    for msg in history {
        out.push(serde_json::json!({ "role": msg.role, "content": msg.content }));
    }
    out.push(serde_json::json!({ "role": "user", "content": user }));
    out
}
