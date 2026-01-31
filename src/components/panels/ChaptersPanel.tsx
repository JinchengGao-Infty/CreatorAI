import { Button, Input, List, Modal, Popconfirm, Space, Typography } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useMemo, useState } from "react";
import { useCreator } from "../../store/creatorStore";

const { Text } = Typography;

export function ChaptersPanel() {
  const { chapters, activeChapter, project, actions } = useCreator();
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [renameTargetId, setRenameTargetId] = useState<number | null>(null);

  const canEdit = !!project;

  const activeId = activeChapter?.id ?? null;
  const renameTargetTitle = useMemo(() => {
    if (renameTargetId == null) return "";
    return chapters.find((c) => c.id === renameTargetId)?.title ?? "";
  }, [chapters, renameTargetId]);

  return (
    <div className="chaptersPanel">
      <div className="panelToolbar">
        <Space size={8}>
          <Button
            size="small"
            icon={<PlusOutlined />}
            disabled={!canEdit}
            onClick={() => {
              setTitle("");
              setCreateOpen(true);
            }}
          >
            新建
          </Button>
        </Space>
      </div>

      <List
        size="small"
        dataSource={chapters}
        locale={{ emptyText: "暂无章节" }}
        renderItem={(ch) => (
          <List.Item
            className={`chapterRow ${ch.id === activeId ? "active" : ""}`}
            onClick={() => actions.selectChapter(ch.id)}
            actions={[
              <Button
                key="rename"
                size="small"
                type="text"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  setRenameTargetId(ch.id);
                  setTitle(ch.title);
                  setRenameOpen(true);
                }}
              />,
              <Popconfirm
                key="del"
                title="删除章节？"
                description="会删除该章节的正文与元数据文件，无法撤销。"
                okText="删除"
                cancelText="取消"
                onConfirm={async (e) => {
                  e?.stopPropagation();
                  await actions.deleteChapter(ch.id);
                }}
              >
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>,
            ]}
          >
            <Text className="chapterTitle">{ch.title}</Text>
          </List.Item>
        )}
      />

      <Modal
        title="新建章节"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        okText="创建"
        cancelText="取消"
        onOk={async () => {
          const lastId = chapters.length ? chapters[chapters.length - 1].id : 0;
          const t = title.trim() || `第${lastId + 1}章`;
          await actions.createChapter(t);
          setCreateOpen(false);
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="章节标题" />
      </Modal>

      <Modal
        title={`重命名章节${renameTargetTitle ? `：${renameTargetTitle}` : ""}`}
        open={renameOpen}
        onCancel={() => setRenameOpen(false)}
        okText="保存"
        cancelText="取消"
        onOk={async () => {
          if (renameTargetId == null) return;
          const t = title.trim();
          if (!t) return;
          await actions.renameChapter(renameTargetId, t);
          setRenameOpen(false);
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="章节标题" />
      </Modal>
    </div>
  );
}
