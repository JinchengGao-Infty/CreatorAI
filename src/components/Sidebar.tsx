import { Typography } from "antd";
import { useCreator } from "../store/creatorStore";
import { ChaptersPanel } from "./panels/ChaptersPanel";
import { ModelsPanel } from "./panels/ModelsPanel";
import { PresetsPanel } from "./panels/PresetsPanel";
import { SummariesPanel } from "./panels/SummariesPanel";

const { Text } = Typography;

export function Sidebar() {
  const { activePanel } = useCreator();

  return (
    <div className="sidebar">
      <div className="panelHeader">
        <Text className="panelTitle">
          {activePanel === "chapters" && "章节目录"}
          {activePanel === "summaries" && "摘要记录"}
          {activePanel === "presets" && "文风预设"}
          {activePanel === "models" && "模型设置"}
        </Text>
      </div>
      <div className="panelBody">
        {activePanel === "chapters" && <ChaptersPanel />}
        {activePanel === "summaries" && <SummariesPanel />}
        {activePanel === "presets" && <PresetsPanel />}
        {activePanel === "models" && <ModelsPanel />}
      </div>
    </div>
  );
}

