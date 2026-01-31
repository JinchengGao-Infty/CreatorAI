import Editor from "@monaco-editor/react";
import { Typography } from "antd";
import { useEffect, useMemo, useRef } from "react";
import { useCreator } from "../store/creatorStore";

const { Text } = Typography;

export function EditorPane() {
  const { activeChapter, busy, actions } = useCreator();
  const saveTimer = useRef<number | null>(null);

  const title = activeChapter?.title ?? "未选择章节";

  const editorOptions = useMemo(
    () => ({
      minimap: { enabled: false },
      wordWrap: "on" as const,
      lineNumbers: "on" as const,
      fontSize: 15,
      fontFamily:
        '"Iosevka", "SF Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      padding: { top: 16, bottom: 16 },
      scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
    }),
    [],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current != null) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, []);

  return (
    <div className="editorArea">
      <div className="editorHeader">
        <Text className="editorTitle">{title}</Text>
        {busy.saving && <Text className="savingHint">保存中…</Text>}
      </div>
      <div className="editorBody">
        <Editor
          height="100%"
          language="markdown"
          theme="vs"
          value={activeChapter?.content ?? ""}
          onChange={(v) => {
            actions.updateChapterContent(v ?? "");
            if (saveTimer.current != null) window.clearTimeout(saveTimer.current);
            saveTimer.current = window.setTimeout(() => {
              void actions.saveChapter();
            }, 600);
          }}
          options={editorOptions}
        />
      </div>
    </div>
  );
}

