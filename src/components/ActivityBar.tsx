import { BookOutlined, FileTextOutlined, SettingOutlined, ThunderboltOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";
import type { PanelKey } from "../store/creatorStore";
import { useCreator } from "../store/creatorStore";

const items: { key: PanelKey; title: string; icon: ReactNode }[] = [
  { key: "chapters", title: "章节目录", icon: <BookOutlined /> },
  { key: "summaries", title: "摘要记录", icon: <FileTextOutlined /> },
  { key: "presets", title: "文风预设", icon: <SettingOutlined /> },
  { key: "models", title: "模型设置", icon: <ThunderboltOutlined /> },
];

export function ActivityBar() {
  const { activePanel, actions } = useCreator();

  return (
    <div className="activityBar">
      {items.map((it) => (
        <div
          key={it.key}
          className={`activityIcon ${activePanel === it.key ? "active" : ""}`}
          onClick={() => actions.setActivePanel(it.key)}
          title={it.title}
          role="button"
          tabIndex={0}
        >
          {it.icon}
        </div>
      ))}
    </div>
  );
}
