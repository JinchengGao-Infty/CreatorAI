import { List, Tag, Typography } from "antd";
import { useMemo } from "react";
import { useCreator } from "../../store/creatorStore";

const { Text } = Typography;

export function SummariesPanel() {
  const { summaries } = useCreator();

  const sorted = useMemo(() => {
    return [...summaries].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
  }, [summaries]);

  return (
    <List
      size="small"
      dataSource={sorted}
      locale={{ emptyText: "暂无摘要记录" }}
      renderItem={(r) => (
        <List.Item className="summaryRow">
          <div className="summaryCard">
            <div className="summaryTop">
              <Text className="summaryTitle">{r.chapterTitle}</Text>
              <Tag className="summaryTag">{r.createdAt}</Tag>
            </div>
            <Text className="summaryText">{r.summary}</Text>
          </div>
        </List.Item>
      )}
    />
  );
}

