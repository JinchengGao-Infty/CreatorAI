import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/creatorai";
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

export type PanelKey = "chapters" | "summaries" | "presets" | "models";
export type AiMode = "continue" | "discuss";

type CreatorContextValue = {
  appState: AppState | null;
  project: ProjectInfo | null;
  chapters: ChapterIndexItem[];
  activeChapter: Chapter | null;
  activePanel: PanelKey;
  preset: Preset | null;
  llmConfig: LlmConfig | null;
  summaries: SummaryRecord[];
  sessions: ChatSessionIndexItem[];
  activeSession: ChatSession | null;
  aiMode: AiMode;
  instruction: string;
  generated: GenerationResponse | null;
  busy: {
    loading: boolean;
    saving: boolean;
    generating: boolean;
    chatting: boolean;
  };
  actions: {
    setActivePanel: (k: PanelKey) => void;
    setAiMode: (m: AiMode) => void;
    setInstruction: (s: string) => void;
    openProject: (projectDir: string) => Promise<void>;
    reloadProject: () => Promise<void>;
    selectChapter: (id: number) => Promise<void>;
    updateChapterContent: (content: string) => void;
    saveChapter: () => Promise<void>;
    createChapter: (title: string) => Promise<void>;
    renameChapter: (id: number, title: string) => Promise<void>;
    deleteChapter: (id: number) => Promise<void>;
    savePreset: (preset: Preset) => Promise<void>;
    saveLlmConfig: (config: LlmConfig) => Promise<void>;
    ensureSession: () => Promise<ChatSession>;
    selectSession: (sessionId: string) => Promise<void>;
    deleteSession: (sessionId: string) => Promise<void>;
    continueGenerate: () => Promise<void>;
    applyGeneratedAppend: () => Promise<void>;
    applyGeneratedReplace: () => Promise<void>;
    sendChat: (text: string) => Promise<void>;
  };
};

const CreatorContext = createContext<CreatorContextValue | null>(null);

function useCreatorContext() {
  const v = useContext(CreatorContext);
  if (!v) throw new Error("CreatorProvider missing");
  return v;
}

function trimOrEmpty(s: string | undefined | null) {
  return (s ?? "").trim();
}

export function CreatorProvider({ children }: { children: React.ReactNode }) {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [chapters, setChapters] = useState<ChapterIndexItem[]>([]);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [activePanel, setActivePanel] = useState<PanelKey>("chapters");
  const [preset, setPreset] = useState<Preset | null>(null);
  const [llmConfig, setLlmConfig] = useState<LlmConfig | null>(null);
  const [summaries, setSummaries] = useState<SummaryRecord[]>([]);
  const [sessions, setSessions] = useState<ChatSessionIndexItem[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [aiMode, setAiMode] = useState<AiMode>("continue");
  const [instruction, setInstruction] = useState("");
  const [generated, setGenerated] = useState<GenerationResponse | null>(null);
  const [busy, setBusy] = useState({
    loading: true,
    saving: false,
    generating: false,
    chatting: false,
  });

  const lastSavedChapterRef = useRef<Chapter | null>(null);

  const persistAppState = async (next: AppState) => {
    setAppState(next);
    try {
      await api.appSetState(next);
    } catch {
      // ignore; UI still works with memory state
    }
  };

  const loadAll = async (projectDir: string, nextAppState?: AppState | null) => {
    setBusy((b) => ({ ...b, loading: true }));
    const info = await api.storageInitProject(projectDir);
    setProject(info);

    const [chs, pr, llm, sums, sessIdx] = await Promise.all([
      api.storageListChapters(projectDir),
      api.storageLoadPreset(projectDir),
      api.storageLoadLlmConfig(projectDir),
      api.storageLoadSummaries(projectDir),
      api.chatListSessions(projectDir),
    ]);
    setChapters(chs);
    setPreset(pr);
    setLlmConfig(llm);
    setSummaries(sums);
    setSessions(sessIdx);

    const fallbackChapterId = chs[0]?.id;
    const desiredChapterId = nextAppState?.lastChapterId ?? appState?.lastChapterId ?? fallbackChapterId;
    if (desiredChapterId) {
      const ch = await api.storageLoadChapter(projectDir, desiredChapterId);
      setActiveChapter(ch);
      lastSavedChapterRef.current = ch;
    }

    const desiredSessionId = nextAppState?.lastSessionId ?? appState?.lastSessionId;
    if (desiredSessionId) {
      const s = await api.chatLoadSession(projectDir, desiredSessionId);
      setActiveSession(s);
    }

    setBusy((b) => ({ ...b, loading: false }));
  };

  useEffect(() => {
    (async () => {
      setBusy((b) => ({ ...b, loading: true }));
      const st = await api.appGetState().catch(() => ({} as AppState));
      setAppState(st);
      const projectDir = trimOrEmpty(st.lastProjectDir ?? "");
      if (projectDir) {
        await loadAll(projectDir, st);
      } else {
        const def = await api.appGetDefaultProjectDir();
        await persistAppState({ ...st, lastProjectDir: def });
        await loadAll(def, { ...st, lastProjectDir: def });
      }
      setBusy((b) => ({ ...b, loading: false }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openProject = async (projectDir: string) => {
    const st = appState ?? {};
    await persistAppState({ ...st, lastProjectDir: projectDir });
    await loadAll(projectDir, { ...st, lastProjectDir: projectDir });
  };

  const reloadProject = async () => {
    if (!project) return;
    await loadAll(project.projectDir);
  };

  const saveChapter = async () => {
    if (!project || !activeChapter) return;
    setBusy((b) => ({ ...b, saving: true }));
    try {
      await api.storageSaveChapter(project.projectDir, activeChapter);
      lastSavedChapterRef.current = activeChapter;
      await persistAppState({
        ...(appState ?? {}),
        lastProjectDir: project.projectDir,
        lastChapterId: activeChapter.id,
      });
      const chs = await api.storageListChapters(project.projectDir);
      setChapters(chs);
    } finally {
      setBusy((b) => ({ ...b, saving: false }));
    }
  };

  const selectChapter = async (id: number) => {
    if (!project) return;
    if (activeChapter && lastSavedChapterRef.current?.content !== activeChapter.content) {
      await saveChapter();
    }
    const ch = await api.storageLoadChapter(project.projectDir, id);
    setActiveChapter(ch);
    lastSavedChapterRef.current = ch;
    setGenerated(null);
    await persistAppState({
      ...(appState ?? {}),
      lastProjectDir: project.projectDir,
      lastChapterId: id,
    });
  };

  const updateChapterContent = (content: string) => {
    setActiveChapter((ch) => (ch ? { ...ch, content } : ch));
  };

  const createChapter = async (title: string) => {
    if (!project) return;
    const item = await api.storageCreateChapter(project.projectDir, title);
    const next = await api.storageListChapters(project.projectDir);
    setChapters(next);
    await selectChapter(item.id);
  };

  const renameChapter = async (id: number, title: string) => {
    if (!project) return;
    await api.storageRenameChapter(project.projectDir, id, title);
    const next = await api.storageListChapters(project.projectDir);
    setChapters(next);
    if (activeChapter?.id === id) {
      setActiveChapter((ch) => (ch ? { ...ch, title } : ch));
    }
  };

  const deleteChapter = async (id: number) => {
    if (!project) return;
    await api.storageDeleteChapter(project.projectDir, id);
    const next = await api.storageListChapters(project.projectDir);
    setChapters(next);
    if (activeChapter?.id === id) {
      if (next[0]) await selectChapter(next[0].id);
      else setActiveChapter(null);
    }
  };

  const savePreset = async (nextPreset: Preset) => {
    if (!project) return;
    await api.storageSavePreset(project.projectDir, nextPreset);
    setPreset(nextPreset);
  };

  const saveLlmConfig = async (cfg: LlmConfig) => {
    if (!project) return;
    await api.storageSaveLlmConfig(project.projectDir, cfg);
    setLlmConfig(cfg);
  };

  const ensureSession = async (): Promise<ChatSession> => {
    if (!project) throw new Error("No project");
    if (activeSession) return activeSession;
    const created = await api.chatCreateSession(project.projectDir);
    const s = await api.chatLoadSession(project.projectDir, created.id);
    setActiveSession(s);
    setSessions(await api.chatListSessions(project.projectDir));
    await persistAppState({ ...(appState ?? {}), lastProjectDir: project.projectDir, lastSessionId: s.id });
    return s;
  };

  const selectSession = async (sessionId: string) => {
    if (!project) return;
    const s = await api.chatLoadSession(project.projectDir, sessionId);
    setActiveSession(s);
    await persistAppState({ ...(appState ?? {}), lastProjectDir: project.projectDir, lastSessionId: sessionId });
  };

  const deleteSession = async (sessionId: string) => {
    if (!project) return;
    await api.chatDeleteSession(project.projectDir, sessionId);
    const idx = await api.chatListSessions(project.projectDir);
    setSessions(idx);
    if (activeSession?.id === sessionId) {
      setActiveSession(null);
      await persistAppState({ ...(appState ?? {}), lastProjectDir: project.projectDir, lastSessionId: null });
    }
  };

  const continueGenerate = async () => {
    if (!project || !activeChapter) return;
    setBusy((b) => ({ ...b, generating: true }));
    try {
      const resp = await api.llmContinue(project.projectDir, activeChapter.id, instruction);
      setGenerated(resp);
    } finally {
      setBusy((b) => ({ ...b, generating: false }));
    }
  };

  const applyGenerated = async (mode: "append" | "replace") => {
    if (!project || !activeChapter || !generated) return;
    const nextContent =
      mode === "append"
        ? `${activeChapter.content}${activeChapter.content.endsWith("\n") || generated.content.startsWith("\n") ? "" : "\n"}${generated.content}`
        : generated.content;
    const nextChapter: Chapter = { ...activeChapter, content: nextContent, summary: generated.summary || activeChapter.summary };
    setActiveChapter(nextChapter);
    await api.storageSaveChapter(project.projectDir, nextChapter);

    if (generated.summary?.trim()) {
      const record: SummaryRecord = {
        id: crypto.randomUUID(),
        chapterId: nextChapter.id,
        chapterTitle: nextChapter.title,
        summary: generated.summary,
        createdAt: new Date().toISOString(),
      };
      await api.storageAppendSummary(project.projectDir, record);
      setSummaries(await api.storageLoadSummaries(project.projectDir));
    }

    setGenerated(null);
  };

  const applyGeneratedAppend = async () => applyGenerated("append");
  const applyGeneratedReplace = async () => applyGenerated("replace");

  const sendChat = async (text: string) => {
    if (!project) return;
    const t = text.trim();
    if (!t) return;

    setBusy((b) => ({ ...b, chatting: true }));
    try {
      const session = await ensureSession();
      // optimistic add user message
      const userMsg: ChatMessage = { role: "user", content: t, createdAt: new Date().toISOString() };
      setActiveSession({ ...session, messages: [...session.messages, userMsg] });
      await api.llmDiscuss(project.projectDir, session.id, t);
      const refreshed = await api.chatLoadSession(project.projectDir, session.id);
      setActiveSession(refreshed);
      setSessions(await api.chatListSessions(project.projectDir));
    } finally {
      setBusy((b) => ({ ...b, chatting: false }));
    }
  };

  const value: CreatorContextValue = useMemo(
    () => ({
      appState,
      project,
      chapters,
      activeChapter,
      activePanel,
      preset,
      llmConfig,
      summaries,
      sessions,
      activeSession,
      aiMode,
      instruction,
      generated,
      busy,
      actions: {
        setActivePanel,
        setAiMode,
        setInstruction,
        openProject,
        reloadProject,
        selectChapter,
        updateChapterContent,
        saveChapter,
        createChapter,
        renameChapter,
        deleteChapter,
        savePreset,
        saveLlmConfig,
        ensureSession,
        selectSession,
        deleteSession,
        continueGenerate,
        applyGeneratedAppend,
        applyGeneratedReplace,
        sendChat,
      },
    }),
    [
      appState,
      project,
      chapters,
      activeChapter,
      activePanel,
      preset,
      llmConfig,
      summaries,
      sessions,
      activeSession,
      aiMode,
      instruction,
      generated,
      busy,
    ],
  );

  return <CreatorContext.Provider value={value}>{children}</CreatorContext.Provider>;
}

export function useCreator() {
  return useCreatorContext();
}

