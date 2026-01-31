use crate::types::*;
use serde_json::json;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

fn p(project_dir: String) -> PathBuf {
    PathBuf::from(project_dir)
}

fn chapters_dir(project_dir: &Path) -> PathBuf {
    project_dir.join("chapters")
}

fn chat_sessions_dir(project_dir: &Path) -> PathBuf {
    project_dir.join("chat_sessions")
}

fn creatorai_dir(project_dir: &Path) -> PathBuf {
    project_dir.join(".creatorai")
}

fn vectors_dir(project_dir: &Path) -> PathBuf {
    creatorai_dir(project_dir).join("vectors")
}

fn chapters_index_file(project_dir: &Path) -> PathBuf {
    chapters_dir(project_dir).join("index.json")
}

fn chapter_txt(project_dir: &Path, id: u32) -> PathBuf {
    chapters_dir(project_dir).join(format!("chapter_{id:03}.txt"))
}

fn chapter_meta(project_dir: &Path, id: u32) -> PathBuf {
    chapters_dir(project_dir).join(format!("chapter_{id:03}.json"))
}

fn config_file(project_dir: &Path) -> PathBuf {
    project_dir.join("config.json")
}

fn llm_config_file(project_dir: &Path) -> PathBuf {
    project_dir.join("llm_config.json")
}

fn summaries_file(project_dir: &Path) -> PathBuf {
    project_dir.join("summaries.json")
}

fn sessions_index_file(project_dir: &Path) -> PathBuf {
    chat_sessions_dir(project_dir).join("index.json")
}

fn session_file(project_dir: &Path, session_id: &str) -> PathBuf {
    chat_sessions_dir(project_dir).join(format!("session_{session_id}.json"))
}

fn ensure_dir(dir: &Path) -> Result<(), String> {
    fs::create_dir_all(dir).map_err(|e| format!("无法创建目录 {dir:?}: {e}"))
}

fn atomic_write_json(path: &Path, value: &impl serde::Serialize) -> Result<(), String> {
    let dir = path.parent().ok_or("无效路径")?;
    ensure_dir(dir)?;

    let tmp = path.with_extension("json.tmp");
    let raw = serde_json::to_string_pretty(value).map_err(|e| format!("序列化失败: {e}"))?;
    fs::write(&tmp, raw).map_err(|e| format!("写入失败 {tmp:?}: {e}"))?;
    fs::rename(&tmp, path).map_err(|e| format!("保存失败 {path:?}: {e}"))?;
    Ok(())
}

pub fn init_project(project_dir: String) -> Result<ProjectInfo, String> {
    let root = p(project_dir);
    ensure_dir(&root)?;
    ensure_dir(&chapters_dir(&root))?;
    ensure_dir(&chat_sessions_dir(&root))?;
    ensure_dir(&vectors_dir(&root))?;

    // preset
    if !config_file(&root).exists() {
        atomic_write_json(&config_file(&root), &Preset::default_zh())?;
    }

    // llm config
    if !llm_config_file(&root).exists() {
        let default_endpoint = EndpointConfig::new(
            "Local Test".to_string(),
            "https://api.openai.com/v1".to_string(),
            "gemini-3-pro-preview".to_string(),
        );
        let cfg = LlmConfig {
            endpoints: vec![default_endpoint.clone()],
            active_endpoint_id: Some(default_endpoint.id),
            active_model: Some(default_endpoint.default_model),
        };
        atomic_write_json(&llm_config_file(&root), &cfg)?;
    }

    // summaries
    if !summaries_file(&root).exists() {
        atomic_write_json(&summaries_file(&root), &json!([]))?;
    }

    // chapters index + first chapter
    if !chapters_index_file(&root).exists() {
        let first = Chapter {
            id: 1,
            title: "第一章".to_string(),
            content: "".to_string(),
            summary: "".to_string(),
        };
        save_chapter(root.to_string_lossy().to_string(), &first)?;
        atomic_write_json(&chapters_index_file(&root), &vec![ChapterIndexItem { id: 1, title: first.title }])?;
    }

    Ok(ProjectInfo {
        project_dir: root.to_string_lossy().to_string(),
        project_name: root
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "Project".to_string()),
    })
}

pub fn list_chapters(project_dir: String) -> Result<Vec<ChapterIndexItem>, String> {
    let root = p(project_dir);
    let index_file = chapters_index_file(&root);
    if !index_file.exists() {
        return Ok(vec![]);
    }
    let raw = fs::read_to_string(index_file).map_err(|e| format!("无法读取章节索引: {e}"))?;
    serde_json::from_str(&raw).map_err(|e| format!("章节索引格式错误: {e}"))
}

pub fn create_chapter(project_dir: String, title: String) -> Result<ChapterIndexItem, String> {
    let root = p(project_dir.clone());
    let mut index = list_chapters(project_dir.clone())?;
    let next_id = index.iter().map(|c| c.id).max().unwrap_or(0) + 1;

    let ch = Chapter {
        id: next_id,
        title: title.clone(),
        content: "".to_string(),
        summary: "".to_string(),
    };
    save_chapter(project_dir.clone(), &ch)?;

    let item = ChapterIndexItem { id: next_id, title };
    index.push(item.clone());
    atomic_write_json(&chapters_index_file(&root), &index)?;
    Ok(item)
}

pub fn rename_chapter(project_dir: String, id: u32, title: String) -> Result<(), String> {
    let root = p(project_dir.clone());
    let mut index = list_chapters(project_dir.clone())?;
    for item in index.iter_mut() {
        if item.id == id {
            item.title = title.clone();
        }
    }
    atomic_write_json(&chapters_index_file(&root), &index)?;

    let mut ch = load_chapter(project_dir, id)?;
    ch.title = title;
    save_chapter(root.to_string_lossy().to_string(), &ch)?;
    Ok(())
}

pub fn delete_chapter(project_dir: String, id: u32) -> Result<(), String> {
    let root = p(project_dir.clone());
    let mut index = list_chapters(project_dir.clone())?;
    index.retain(|c| c.id != id);
    atomic_write_json(&chapters_index_file(&root), &index)?;

    let txt = chapter_txt(&root, id);
    let meta = chapter_meta(&root, id);
    let _ = fs::remove_file(txt);
    let _ = fs::remove_file(meta);
    Ok(())
}

pub fn load_chapter(project_dir: String, id: u32) -> Result<Chapter, String> {
    let root = p(project_dir);
    let txt = chapter_txt(&root, id);
    if !txt.exists() {
        return Err("章节不存在".to_string());
    }
    let content = fs::read_to_string(txt).map_err(|e| format!("无法读取章节正文: {e}"))?;

    let mut title = format!("第{id}章");
    let mut summary = "".to_string();

    let meta = chapter_meta(&root, id);
    if meta.exists() {
        let raw = fs::read_to_string(meta).map_err(|e| format!("无法读取章节元数据: {e}"))?;
        let v: serde_json::Value = serde_json::from_str(&raw).map_err(|e| format!("章节元数据格式错误: {e}"))?;
        if let Some(t) = v.get("title").and_then(|x| x.as_str()) {
            title = t.to_string();
        }
        if let Some(s) = v.get("summary").and_then(|x| x.as_str()) {
            summary = s.to_string();
        }
    } else {
        // fallback to index title
        if let Ok(index) = list_chapters(root.to_string_lossy().to_string()) {
            if let Some(item) = index.into_iter().find(|c| c.id == id) {
                title = item.title;
            }
        }
    }

    Ok(Chapter { id, title, content, summary })
}

pub fn save_chapter(project_dir: String, chapter: &Chapter) -> Result<(), String> {
    let root = p(project_dir.clone());
    ensure_dir(&chapters_dir(&root))?;

    fs::write(chapter_txt(&root, chapter.id), &chapter.content)
        .map_err(|e| format!("保存章节正文失败: {e}"))?;

    let meta = json!({
      "id": chapter.id,
      "title": chapter.title,
      "summary": chapter.summary
    });
    atomic_write_json(&chapter_meta(&root, chapter.id), &meta)?;

    // keep index in sync (title)
    let mut index = list_chapters(project_dir)?;
    let mut found = false;
    for item in index.iter_mut() {
        if item.id == chapter.id {
            item.title = chapter.title.clone();
            found = true;
        }
    }
    if !found {
        index.push(ChapterIndexItem {
            id: chapter.id,
            title: chapter.title.clone(),
        });
    }
    atomic_write_json(&chapters_index_file(&root), &index)?;
    Ok(())
}

pub fn load_summaries(project_dir: String) -> Result<Vec<SummaryRecord>, String> {
    let root = p(project_dir);
    let file = summaries_file(&root);
    if !file.exists() {
        return Ok(vec![]);
    }
    let raw = fs::read_to_string(file).map_err(|e| format!("无法读取 summaries.json: {e}"))?;
    serde_json::from_str(&raw).map_err(|e| format!("summaries.json 格式错误: {e}"))
}

pub fn append_summary(project_dir: String, record: SummaryRecord) -> Result<(), String> {
    let root = p(project_dir);
    let mut all = load_summaries(root.to_string_lossy().to_string())?;
    all.push(record);
    atomic_write_json(&summaries_file(&root), &all)?;
    Ok(())
}

pub fn load_preset(project_dir: String) -> Result<Preset, String> {
    let root = p(project_dir);
    let file = config_file(&root);
    if !file.exists() {
        return Ok(Preset::default_zh());
    }
    let raw = fs::read_to_string(file).map_err(|e| format!("无法读取 config.json: {e}"))?;
    serde_json::from_str(&raw).map_err(|e| format!("config.json 格式错误: {e}"))
}

pub fn save_preset(project_dir: String, preset: &Preset) -> Result<(), String> {
    let root = p(project_dir);
    atomic_write_json(&config_file(&root), preset)
}

pub fn export_preset(file_path: String, preset: &Preset) -> Result<(), String> {
    atomic_write_json(Path::new(&file_path), preset)
}

pub fn import_preset(file_path: String) -> Result<Preset, String> {
    let raw = fs::read_to_string(&file_path).map_err(|e| format!("无法读取预设文件: {e}"))?;
    serde_json::from_str(&raw).map_err(|e| format!("预设文件格式错误: {e}"))
}

pub fn load_llm_config(project_dir: String) -> Result<LlmConfig, String> {
    let root = p(project_dir);
    let file = llm_config_file(&root);
    if !file.exists() {
        return Ok(LlmConfig::default());
    }
    let raw = fs::read_to_string(file).map_err(|e| format!("无法读取 llm_config.json: {e}"))?;
    serde_json::from_str(&raw).map_err(|e| format!("llm_config.json 格式错误: {e}"))
}

pub fn save_llm_config(project_dir: String, cfg: &LlmConfig) -> Result<(), String> {
    let root = p(project_dir);
    atomic_write_json(&llm_config_file(&root), cfg)
}

pub fn list_chat_sessions(project_dir: String) -> Result<Vec<ChatSessionIndexItem>, String> {
    let root = p(project_dir);
    let idx = sessions_index_file(&root);
    if !idx.exists() {
        return Ok(vec![]);
    }
    let raw = fs::read_to_string(idx).map_err(|e| format!("无法读取会话索引: {e}"))?;
    serde_json::from_str(&raw).map_err(|e| format!("会话索引格式错误: {e}"))
}

pub fn create_chat_session(project_dir: String, title: Option<String>) -> Result<ChatSessionIndexItem, String> {
    let root = p(project_dir.clone());
    ensure_dir(&chat_sessions_dir(&root))?;

    let id = Uuid::new_v4().to_string();
    let title = title.unwrap_or_else(|| "新对话".to_string());
    let session = ChatSession {
        id: id.clone(),
        title: title.clone(),
        messages: vec![],
    };
    save_chat_session(root.to_string_lossy().to_string(), &session)?;
    Ok(ChatSessionIndexItem { id, title })
}

pub fn load_chat_session(project_dir: String, session_id: String) -> Result<ChatSession, String> {
    let root = p(project_dir);
    let file = session_file(&root, &session_id);
    if !file.exists() {
        return Ok(ChatSession {
            id: session_id,
            title: "新对话".to_string(),
            messages: vec![],
        });
    }
    let raw = fs::read_to_string(file).map_err(|e| format!("无法读取会话: {e}"))?;
    serde_json::from_str(&raw).map_err(|e| format!("会话格式错误: {e}"))
}

pub fn save_chat_session(project_dir: String, session: &ChatSession) -> Result<(), String> {
    let root = p(project_dir);
    ensure_dir(&chat_sessions_dir(&root))?;
    atomic_write_json(&session_file(&root, &session.id), session)?;

    let mut index = list_chat_sessions(root.to_string_lossy().to_string())?;
    let mut found = false;
    for item in index.iter_mut() {
        if item.id == session.id {
            item.title = session.title.clone();
            found = true;
        }
    }
    if !found {
        index.push(ChatSessionIndexItem {
            id: session.id.clone(),
            title: session.title.clone(),
        });
    }
    atomic_write_json(&sessions_index_file(&root), &index)?;
    Ok(())
}

pub fn delete_chat_session(project_dir: String, session_id: String) -> Result<(), String> {
    let root = p(project_dir);
    let file = session_file(&root, &session_id);
    let _ = fs::remove_file(file);

    let mut index = list_chat_sessions(root.to_string_lossy().to_string())?;
    index.retain(|x| x.id != session_id);
    atomic_write_json(&sessions_index_file(&root), &index)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn init_and_create_chapter() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().to_string_lossy().to_string();
        let info = init_project(root.clone()).unwrap();
        assert!(info.project_dir.contains(dir.path().to_string_lossy().as_ref()));
        let chapters = list_chapters(root.clone()).unwrap();
        assert_eq!(chapters.len(), 1);

        let c2 = create_chapter(root.clone(), "第二章".to_string()).unwrap();
        assert_eq!(c2.id, 2);
        let chapters = list_chapters(root.clone()).unwrap();
        assert_eq!(chapters.len(), 2);

        let mut ch = load_chapter(root.clone(), 2).unwrap();
        ch.content = "hello".to_string();
        save_chapter(root.clone(), &ch).unwrap();
        let ch2 = load_chapter(root.clone(), 2).unwrap();
        assert_eq!(ch2.content, "hello");
    }
}
