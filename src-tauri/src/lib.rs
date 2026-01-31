mod llm;
mod prompt;
mod secure;
mod state;
mod storage;
mod types;

use types::*;

#[tauri::command]
fn app_get_state(app: tauri::AppHandle) -> Result<AppState, String> {
    state::load_app_state(&app)
}

#[tauri::command]
fn app_set_state(app: tauri::AppHandle, next: AppState) -> Result<(), String> {
    state::save_app_state(&app, &next)
}

#[tauri::command]
fn app_get_default_project_dir(app: tauri::AppHandle) -> Result<String, String> {
    state::default_project_dir(&app)
}

#[tauri::command]
fn storage_init_project(project_dir: String) -> Result<ProjectInfo, String> {
    storage::init_project(project_dir)
}

#[tauri::command]
fn storage_list_chapters(project_dir: String) -> Result<Vec<ChapterIndexItem>, String> {
    storage::list_chapters(project_dir)
}

#[tauri::command]
fn storage_create_chapter(project_dir: String, title: String) -> Result<ChapterIndexItem, String> {
    storage::create_chapter(project_dir, title)
}

#[tauri::command]
fn storage_rename_chapter(project_dir: String, id: u32, title: String) -> Result<(), String> {
    storage::rename_chapter(project_dir, id, title)
}

#[tauri::command]
fn storage_delete_chapter(project_dir: String, id: u32) -> Result<(), String> {
    storage::delete_chapter(project_dir, id)
}

#[tauri::command]
fn storage_load_chapter(project_dir: String, id: u32) -> Result<Chapter, String> {
    storage::load_chapter(project_dir, id)
}

#[tauri::command]
fn storage_save_chapter(project_dir: String, chapter: Chapter) -> Result<(), String> {
    storage::save_chapter(project_dir, &chapter)
}

#[tauri::command]
fn storage_load_summaries(project_dir: String) -> Result<Vec<SummaryRecord>, String> {
    storage::load_summaries(project_dir)
}

#[tauri::command]
fn storage_append_summary(project_dir: String, record: SummaryRecord) -> Result<(), String> {
    storage::append_summary(project_dir, record)
}

#[tauri::command]
fn storage_load_preset(project_dir: String) -> Result<Preset, String> {
    storage::load_preset(project_dir)
}

#[tauri::command]
fn storage_save_preset(project_dir: String, preset: Preset) -> Result<(), String> {
    storage::save_preset(project_dir, &preset)
}

#[tauri::command]
fn preset_export(file_path: String, preset: Preset) -> Result<(), String> {
    storage::export_preset(file_path, &preset)
}

#[tauri::command]
fn preset_import(file_path: String) -> Result<Preset, String> {
    storage::import_preset(file_path)
}

#[tauri::command]
fn storage_load_llm_config(project_dir: String) -> Result<LlmConfig, String> {
    storage::load_llm_config(project_dir)
}

#[tauri::command]
fn storage_save_llm_config(project_dir: String, config: LlmConfig) -> Result<(), String> {
    storage::save_llm_config(project_dir, &config)
}

#[tauri::command]
fn chat_list_sessions(project_dir: String) -> Result<Vec<ChatSessionIndexItem>, String> {
    storage::list_chat_sessions(project_dir)
}

#[tauri::command]
fn chat_create_session(project_dir: String, title: Option<String>) -> Result<ChatSessionIndexItem, String> {
    storage::create_chat_session(project_dir, title)
}

#[tauri::command]
fn chat_load_session(project_dir: String, session_id: String) -> Result<ChatSession, String> {
    storage::load_chat_session(project_dir, session_id)
}

#[tauri::command]
fn chat_save_session(project_dir: String, session: ChatSession) -> Result<(), String> {
    storage::save_chat_session(project_dir, &session)
}

#[tauri::command]
fn chat_delete_session(project_dir: String, session_id: String) -> Result<(), String> {
    storage::delete_chat_session(project_dir, session_id)
}

#[tauri::command]
fn secure_has_api_key(endpoint_id: String) -> Result<bool, String> {
    secure::has_api_key(&endpoint_id)
}

#[tauri::command]
fn secure_set_api_key(endpoint_id: String, api_key: String) -> Result<(), String> {
    secure::set_api_key(&endpoint_id, &api_key)
}

#[tauri::command]
fn secure_delete_api_key(endpoint_id: String) -> Result<(), String> {
    secure::delete_api_key(&endpoint_id)
}

#[tauri::command]
async fn llm_fetch_models(base_url: String, endpoint_id: String) -> Result<Vec<String>, String> {
    llm::fetch_models(&base_url, &endpoint_id).await
}

#[tauri::command]
async fn llm_continue(
    project_dir: String,
    chapter_id: u32,
    instruction: String,
) -> Result<GenerationResponse, String> {
    llm::continue_chapter(&project_dir, chapter_id, &instruction).await
}

#[tauri::command]
async fn llm_discuss(project_dir: String, session_id: String, user_message: String) -> Result<ChatMessage, String> {
    llm::discuss(&project_dir, &session_id, &user_message).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            app_get_state,
            app_set_state,
            app_get_default_project_dir,
            storage_init_project,
            storage_list_chapters,
            storage_create_chapter,
            storage_rename_chapter,
            storage_delete_chapter,
            storage_load_chapter,
            storage_save_chapter,
            storage_load_summaries,
            storage_append_summary,
            storage_load_preset,
            storage_save_preset,
            preset_export,
            preset_import,
            storage_load_llm_config,
            storage_save_llm_config,
            chat_list_sessions,
            chat_create_session,
            chat_load_session,
            chat_save_session,
            chat_delete_session,
            secure_has_api_key,
            secure_set_api_key,
            secure_delete_api_key,
            llm_fetch_models,
            llm_continue,
            llm_discuss,
        ])
        .setup(|app| {
            let _ = state::ensure_app_state_file(app.handle());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
