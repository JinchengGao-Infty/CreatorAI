import { Button, Input, List, Segmented, Select, Space, Tabs, Typography, message } from "antd";
import { SendOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { useMemo, useState } from "react";
import { useCreator } from "../store/creatorStore";

const { Text } = Typography;

export function AIPanel() {
  const { aiMode, instruction, generated, activeSession, sessions, llmConfig, busy, actions } = useCreator();
  const [chatInput, setChatInput] = useState("");

  const historyItems = useMemo(() => {
    return activeSession?.messages ?? [];
  }, [activeSession?.messages]);

  const sessionOptions = useMemo(() => sessions.map((s) => ({ label: s.title, value: s.id })), [sessions]);

  return (
    <div className="aiPanel">
      <div className="panelHeader">
        <Text className="panelTitle">AI 助手</Text>
        <Segmented
          size="small"
          value={aiMode}
          options={[
            { label: "续写", value: "continue" },
            { label: "讨论", value: "discuss" },
          ]}
          onChange={(v) => actions.setAiMode(v as typeof aiMode)}
        />
      </div>

      <div className="panelBody aiBody">
        <Tabs
          size="small"
          items={[
            {
              key: "history",
              label: "对话历史",
              children: (
                <div className="chatHistory">
                  <Space direction="vertical" style={{ width: "100%" }} size={10}>
                    <Select
                      size="small"
                      style={{ width: "100%" }}
                      placeholder="会话"
                      options={sessionOptions}
                      value={activeSession?.id}
                      onChange={async (id) => {
                        if (!id) return;
                        await actions.selectSession(id);
                      }}
                      allowClear
                    />
                    <List
                      size="small"
                      dataSource={historyItems}
                      locale={{ emptyText: "暂无对话记录" }}
                      renderItem={(m) => (
                        <List.Item className="chatRow">
                          <div className={`chatBubble ${m.role === "user" ? "user" : "ai"}`}>
                            <Text className="chatText">{m.content}</Text>
                          </div>
                        </List.Item>
                      )}
                    />
                  </Space>
                </div>
              ),
            },
            {
              key: "actions",
              label: "操作",
              children: (
                <div className="chatActions">
                  <Text className="hint">
                    模式：{aiMode === "continue" ? "续写（输出正文 + 摘要）" : "讨论（创作思路）"}
                  </Text>

                  {aiMode === "continue" && (
                    <>
                      <Input.TextArea
                        value={instruction}
                        onChange={(e) => actions.setInstruction(e.target.value)}
                        placeholder="输入续写指令…（例如：继续写下去，强调感官细节，控制节奏）"
                        autoSize={{ minRows: 3, maxRows: 8 }}
                      />
                      <Space>
                        <Button
                          type="primary"
                          icon={<ThunderboltOutlined />}
                          loading={busy.generating}
                          onClick={async () => {
                            try {
                              await actions.continueGenerate();
                            } catch (e) {
                              message.error(String(e));
                            }
                          }}
                        >
                          生成
                        </Button>
                      </Space>

                      {generated && (
                        <div className="generationPreview">
                          <Text className="previewTitle">生成结果</Text>
                          <div className="previewBox">{generated.content}</div>
                          <Text className="previewTitle">摘要</Text>
                          <div className="previewBox">{generated.summary || "（未生成摘要）"}</div>
                          <Space>
                            <Button onClick={actions.applyGeneratedAppend}>追加到末尾</Button>
                            <Button danger onClick={actions.applyGeneratedReplace}>
                              替换整章
                            </Button>
                          </Space>
                        </div>
                      )}
                    </>
                  )}

                  {aiMode === "discuss" && (
                    <>
                      <Input.TextArea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="输入你要讨论的问题…"
                        autoSize={{ minRows: 3, maxRows: 8 }}
                      />
                      <Space>
                        <Button
                          type="primary"
                          icon={<SendOutlined />}
                          loading={busy.chatting}
                          onClick={async () => {
                            try {
                              const t = chatInput.trim();
                              if (!t) return;
                              setChatInput("");
                              await actions.sendChat(t);
                            } catch (e) {
                              message.error(String(e));
                            }
                          }}
                        >
                          发送
                        </Button>
                      </Space>
                    </>
                  )}

                  {!llmConfig?.endpoints?.length && (
                    <Text type="secondary">请先在“模型设置”中添加端点并设置 API Key。</Text>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
