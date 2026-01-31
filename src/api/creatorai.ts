import { invoke } from "@tauri-apps/api/core";
import type {
  AppState,
  Chapter,
  ChapterIndexItem,
  ChatMessage,
  ChatSession,
  ChatSessionIndexItem,
  GenerationResponse,
  LlmConfig,
  Preset,
  ProjectInfo,
  SummaryRecord,
} from "../types";

export const api = {
  appGetState: () => invoke<AppState>("app_get_state"),
  appSetState: (next: AppState) => invoke<void>("app_set_state", { next }),
  appGetDefaultProjectDir: () => invoke<string>("app_get_default_project_dir"),

  storageInitProject: (projectDir: string) =>
    invoke<ProjectInfo>("storage_init_project", { projectDir }),
  storageListChapters: (projectDir: string) =>
    invoke<ChapterIndexItem[]>("storage_list_chapters", { projectDir }),
  storageCreateChapter: (projectDir: string, title: string) =>
    invoke<ChapterIndexItem>("storage_create_chapter", { projectDir, title }),
  storageRenameChapter: (projectDir: string, id: number, title: string) =>
    invoke<void>("storage_rename_chapter", { projectDir, id, title }),
  storageDeleteChapter: (projectDir: string, id: number) =>
    invoke<void>("storage_delete_chapter", { projectDir, id }),
  storageLoadChapter: (projectDir: string, id: number) =>
    invoke<Chapter>("storage_load_chapter", { projectDir, id }),
  storageSaveChapter: (projectDir: string, chapter: Chapter) =>
    invoke<void>("storage_save_chapter", { projectDir, chapter }),

  storageLoadSummaries: (projectDir: string) =>
    invoke<SummaryRecord[]>("storage_load_summaries", { projectDir }),
  storageAppendSummary: (projectDir: string, record: SummaryRecord) =>
    invoke<void>("storage_append_summary", { projectDir, record }),

  storageLoadPreset: (projectDir: string) =>
    invoke<Preset>("storage_load_preset", { projectDir }),
  storageSavePreset: (projectDir: string, preset: Preset) =>
    invoke<void>("storage_save_preset", { projectDir, preset }),
  presetExport: (filePath: string, preset: Preset) => invoke<void>("preset_export", { filePath, preset }),
  presetImport: (filePath: string) => invoke<Preset>("preset_import", { filePath }),

  storageLoadLlmConfig: (projectDir: string) =>
    invoke<LlmConfig>("storage_load_llm_config", { projectDir }),
  storageSaveLlmConfig: (projectDir: string, config: LlmConfig) =>
    invoke<void>("storage_save_llm_config", { projectDir, config }),

  chatListSessions: (projectDir: string) =>
    invoke<ChatSessionIndexItem[]>("chat_list_sessions", { projectDir }),
  chatCreateSession: (projectDir: string, title?: string) =>
    invoke<ChatSessionIndexItem>("chat_create_session", { projectDir, title }),
  chatLoadSession: (projectDir: string, sessionId: string) =>
    invoke<ChatSession>("chat_load_session", { projectDir, sessionId }),
  chatSaveSession: (projectDir: string, session: ChatSession) =>
    invoke<void>("chat_save_session", { projectDir, session }),
  chatDeleteSession: (projectDir: string, sessionId: string) =>
    invoke<void>("chat_delete_session", { projectDir, sessionId }),

  secureHasApiKey: (endpointId: string) =>
    invoke<boolean>("secure_has_api_key", { endpointId }),
  secureSetApiKey: (endpointId: string, apiKey: string) =>
    invoke<void>("secure_set_api_key", { endpointId, apiKey }),
  secureDeleteApiKey: (endpointId: string) =>
    invoke<void>("secure_delete_api_key", { endpointId }),

  llmFetchModels: (baseUrl: string, endpointId: string) =>
    invoke<string[]>("llm_fetch_models", { baseUrl, endpointId }),
  llmContinue: (projectDir: string, chapterId: number, instruction: string) =>
    invoke<GenerationResponse>("llm_continue", { projectDir, chapterId, instruction }),
  llmDiscuss: (projectDir: string, sessionId: string, userMessage: string) =>
    invoke<ChatMessage>("llm_discuss", { projectDir, sessionId, userMessage }),
};
