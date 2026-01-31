use crate::types::AppState;
use serde_json::json;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("无法获取应用数据目录: {e}"))
}

pub fn default_project_dir(app: &tauri::AppHandle) -> Result<String, String> {
    let dir = app_data_dir(app)?.join("MyNovel");
    Ok(dir.to_string_lossy().to_string())
}

fn state_file(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("app_state.json"))
}

pub fn ensure_app_state_file(app: &tauri::AppHandle) -> Result<(), String> {
    let dir = app_data_dir(app)?;
    fs::create_dir_all(&dir).map_err(|e| format!("无法创建应用数据目录: {e}"))?;

    let file = state_file(app)?;
    if !file.exists() {
        fs::write(&file, json!({}).to_string())
            .map_err(|e| format!("无法写入 app_state.json: {e}"))?;
    }
    Ok(())
}

pub fn load_app_state(app: &tauri::AppHandle) -> Result<AppState, String> {
    ensure_app_state_file(app)?;
    let file = state_file(app)?;
    let raw = fs::read_to_string(&file).map_err(|e| format!("无法读取 app_state.json: {e}"))?;
    serde_json::from_str(&raw).map_err(|e| format!("app_state.json 格式错误: {e}"))
}

pub fn save_app_state(app: &tauri::AppHandle, next: &AppState) -> Result<(), String> {
    ensure_app_state_file(app)?;
    let file = state_file(app)?;
    atomic_write_json(&file, next)
}

fn atomic_write_json(path: &Path, value: &impl serde::Serialize) -> Result<(), String> {
    let dir = path.parent().ok_or("无效路径")?;
    fs::create_dir_all(dir).map_err(|e| format!("无法创建目录: {e}"))?;

    let tmp = path.with_extension("json.tmp");
    let raw = serde_json::to_string_pretty(value).map_err(|e| format!("序列化失败: {e}"))?;
    fs::write(&tmp, raw).map_err(|e| format!("写入临时文件失败: {e}"))?;
    fs::rename(&tmp, path).map_err(|e| format!("保存失败: {e}"))?;
    Ok(())
}
