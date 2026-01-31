import { Button, Select, Space, Typography } from "antd";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpenOutlined, ReloadOutlined } from "@ant-design/icons";
import { useMemo } from "react";
import { useCreator } from "../store/creatorStore";

const { Text } = Typography;

export function TopBar() {
  const { project, llmConfig, busy, actions } = useCreator();

  const endpointOptions = useMemo(() => {
    const eps = llmConfig?.endpoints ?? [];
    return eps.map((e) => ({ label: e.name, value: e.id }));
  }, [llmConfig?.endpoints]);

  const activeEndpoint = useMemo(() => {
    if (!llmConfig?.endpoints?.length) return null;
    const id = llmConfig.activeEndpointId ?? llmConfig.endpoints[0].id;
    return llmConfig.endpoints.find((e) => e.id === id) ?? llmConfig.endpoints[0];
  }, [llmConfig]);

  const activeModelValue = llmConfig?.activeModel ?? activeEndpoint?.defaultModel ?? null;

  return (
    <div className="topBar">
      <div className="topBarLeft">
        <Text className="appTitle">CreatorAI v2</Text>
        <Text className="appSubtitle">Ivory Edition</Text>
      </div>

      <div className="topBarRight">
        <Space size={10} align="center">
          <Text className="projectName">{project ? `项目：${project.projectName}` : "未打开项目"}</Text>
          <Button
            size="small"
            icon={<FolderOpenOutlined />}
            onClick={async () => {
              const dir = await open({ directory: true, multiple: false, title: "选择项目目录" });
              if (!dir || Array.isArray(dir)) return;
              await actions.openProject(dir);
            }}
          >
            打开项目
          </Button>
          <Button size="small" icon={<ReloadOutlined />} disabled={!project} onClick={actions.reloadProject}>
            刷新
          </Button>

          {llmConfig && (
            <Space size={8}>
              <Select
                size="small"
                style={{ width: 160 }}
                placeholder="端点"
                options={endpointOptions}
                value={llmConfig.activeEndpointId ?? undefined}
                onChange={async (id) => {
                  await actions.saveLlmConfig({ ...llmConfig, activeEndpointId: id });
                }}
              />
              <Select
                size="small"
                style={{ width: 210 }}
                placeholder="模型"
                value={activeModelValue ?? undefined}
                options={
                  activeEndpoint
                    ? [{ label: activeModelValue ?? activeEndpoint.defaultModel, value: activeModelValue ?? activeEndpoint.defaultModel }]
                    : []
                }
                onChange={async (m) => {
                  await actions.saveLlmConfig({ ...llmConfig, activeModel: m });
                }}
              />
            </Space>
          )}

          {busy.saving && <Text className="savingHint">保存中…</Text>}
        </Space>
      </div>
    </div>
  );
}

