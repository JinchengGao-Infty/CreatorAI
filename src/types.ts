export type AppState = {
  lastProjectDir?: string | null;
  lastSessionId?: string | null;
  lastChapterId?: number | null;
};

export type ProjectInfo = {
  projectDir: string;
  projectName: string;
};

export type ChapterIndexItem = { id: number; title: string };

export type Chapter = { id: number; title: string; content: string; summary: string };

export type Preset = { style: string; pov: string; rules: string[] };

export type SummaryRecord = {
  id: string;
  chapterId: number;
  chapterTitle: string;
  summary: string;
  createdAt: string;
};

export type ModelParameters = {
  temperature: number;
  maxTokens: number;
  topP?: number | null;
  topK?: number | null;
};

export type EndpointConfig = {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  parameters: ModelParameters;
};

export type LlmConfig = {
  endpoints: EndpointConfig[];
  activeEndpointId?: string | null;
  activeModel?: string | null;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type ChatSessionIndexItem = { id: string; title: string };

export type ChatSession = { id: string; title: string; messages: ChatMessage[] };

export type GenerationResponse = { content: string; summary: string; raw?: string | null };

