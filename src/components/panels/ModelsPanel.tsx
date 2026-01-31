import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/creatorai";
import { useCreator } from "../../store/creatorStore";
import type { EndpointConfig, LlmConfig, ModelParameters } from "../../types";

const { Text } = Typography;

function newEndpointDraft(): Pick<EndpointConfig, "name" | "baseUrl" | "defaultModel"> {
  return {
    name: "New Endpoint",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gemini-3-pro-preview",
  };
}

export function ModelsPanel() {
  const { llmConfig, actions } = useCreator();
  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState(newEndpointDraft());
  const [apiKeyModal, setApiKeyModal] = useState<{ open: boolean; endpointId: string | null }>({
    open: false,
    endpointId: null,
  });
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [apiKeyStatus, setApiKeyStatus] = useState<Record<string, boolean>>({});
  const [modelsByEndpoint, setModelsByEndpoint] = useState<Record<string, string[]>>({});
  const [loadingModels, setLoadingModels] = useState<Record<string, boolean>>({});

  const config = llmConfig ?? { endpoints: [], activeEndpointId: null, activeModel: null };

  const activeEndpoint = useMemo(() => {
    if (!config.endpoints.length) return null;
    const id = config.activeEndpointId ?? config.endpoints[0].id;
    return config.endpoints.find((e) => e.id === id) ?? config.endpoints[0];
  }, [config.activeEndpointId, config.endpoints]);

  useEffect(() => {
    (async () => {
      const eps = config.endpoints ?? [];
      const results = await Promise.all(
        eps.map(async (e) => {
          const has = await api.secureHasApiKey(e.id).catch(() => false);
          return [e.id, has] as const;
        }),
      );
      setApiKeyStatus(Object.fromEntries(results));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.endpoints.map((e) => e.id).join(",")]);

  const updateConfig = async (next: LlmConfig) => {
    await actions.saveLlmConfig(next);
  };

  const updateActiveEndpointParams = async (nextParams: ModelParameters) => {
    if (!activeEndpoint) return;
    const nextEndpoints = config.endpoints.map((e) => (e.id === activeEndpoint.id ? { ...e, parameters: nextParams } : e));
    await updateConfig({ ...config, endpoints: nextEndpoints });
  };

  if (!llmConfig) {
    return (
      <div className="placeholder">
        <Text className="placeholderTitle">模型设置</Text>
        <Text className="placeholderDesc">加载中…</Text>
      </div>
    );
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Card
        size="small"
        className="ivoryCard"
        title="端点"
        extra={
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              setAddDraft(newEndpointDraft());
              setAddOpen(true);
            }}
          >
            添加
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: "100%" }} size={10}>
          <Select
            style={{ width: "100%" }}
            placeholder="选择端点"
            options={config.endpoints.map((e) => ({ label: `${e.name} (${e.baseUrl})`, value: e.id }))}
            value={activeEndpoint?.id}
            onChange={async (id) => updateConfig({ ...config, activeEndpointId: id })}
          />

          {activeEndpoint && (
            <Space wrap>
              <Button
                size="small"
                onClick={() => setApiKeyModal({ open: true, endpointId: activeEndpoint.id })}
              >
                API Key：{apiKeyStatus[activeEndpoint.id] ? "已设置" : "未设置"}
              </Button>
              <Popconfirm
                title="删除 API Key？"
                okText="删除"
                cancelText="取消"
                onConfirm={async () => {
                  await api.secureDeleteApiKey(activeEndpoint.id);
                  setApiKeyStatus((s) => ({ ...s, [activeEndpoint.id]: false }));
                  message.success("已删除 API Key");
                }}
              >
                <Button size="small" danger>
                  清除 Key
                </Button>
              </Popconfirm>

              <Popconfirm
                title="删除端点？"
                description="只会删除端点配置，不会影响系统 Keychain 中的 Key。"
                okText="删除"
                cancelText="取消"
                onConfirm={async () => {
                  const nextEndpoints = config.endpoints.filter((e) => e.id !== activeEndpoint.id);
                  const nextActive = nextEndpoints[0]?.id ?? null;
                  await updateConfig({ ...config, endpoints: nextEndpoints, activeEndpointId: nextActive });
                }}
              >
                <Button size="small" danger icon={<DeleteOutlined />}>
                  删除端点
                </Button>
              </Popconfirm>
            </Space>
          )}
        </Space>
      </Card>

      {activeEndpoint && (
        <Card
          size="small"
          className="ivoryCard"
          title="模型与参数"
          extra={
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={!!loadingModels[activeEndpoint.id]}
              onClick={async () => {
                try {
                  setLoadingModels((m) => ({ ...m, [activeEndpoint.id]: true }));
                  const models = await api.llmFetchModels(activeEndpoint.baseUrl, activeEndpoint.id);
                  setModelsByEndpoint((mm) => ({ ...mm, [activeEndpoint.id]: models }));
                  message.success(`已拉取 ${models.length} 个模型`);
                } catch (e) {
                  message.error(String(e));
                } finally {
                  setLoadingModels((m) => ({ ...m, [activeEndpoint.id]: false }));
                }
              }}
            >
              拉取模型
            </Button>
          }
        >
          <Space direction="vertical" style={{ width: "100%" }} size={10}>
            <Space direction="vertical" style={{ width: "100%" }} size={6}>
              <Text className="fieldLabel">当前模型</Text>
              <Select
                style={{ width: "100%" }}
                placeholder="选择模型"
                value={config.activeModel ?? activeEndpoint.defaultModel}
                options={(modelsByEndpoint[activeEndpoint.id] ?? [config.activeModel ?? activeEndpoint.defaultModel]).map((m) => ({
                  label: m,
                  value: m,
                }))}
                onChange={async (m) => updateConfig({ ...config, activeModel: m })}
              />
            </Space>

            <Space wrap size={14}>
              <Space direction="vertical" size={4}>
                <Text className="fieldLabel">temperature</Text>
                <InputNumber
                  min={0}
                  max={2}
                  step={0.05}
                  value={activeEndpoint.parameters.temperature}
                  onChange={async (v) =>
                    updateActiveEndpointParams({ ...activeEndpoint.parameters, temperature: Number(v ?? 0.8) })
                  }
                />
              </Space>

              <Space direction="vertical" size={4}>
                <Text className="fieldLabel">max_tokens</Text>
                <InputNumber
                  min={256}
                  max={200000}
                  step={256}
                  value={activeEndpoint.parameters.maxTokens}
                  onChange={async (v) =>
                    updateActiveEndpointParams({ ...activeEndpoint.parameters, maxTokens: Number(v ?? 4000) })
                  }
                />
              </Space>

              <Space direction="vertical" size={4}>
                <Text className="fieldLabel">top_p</Text>
                <InputNumber
                  min={0}
                  max={1}
                  step={0.05}
                  value={activeEndpoint.parameters.topP ?? 1}
                  onChange={async (v) =>
                    updateActiveEndpointParams({ ...activeEndpoint.parameters, topP: Number(v ?? 1) })
                  }
                />
              </Space>

              <Space direction="vertical" size={4}>
                <Text className="fieldLabel">top_k</Text>
                <InputNumber
                  min={0}
                  max={200}
                  step={1}
                  value={activeEndpoint.parameters.topK ?? 0}
                  onChange={async (v) =>
                    updateActiveEndpointParams({ ...activeEndpoint.parameters, topK: Number(v ?? 0) })
                  }
                />
              </Space>
            </Space>

            <Text type="secondary">
              提示：API Key 会保存到系统 Keychain（macOS）/ Credential Vault（Windows），项目文件不会落盘 Key。
            </Text>
          </Space>
        </Card>
      )}

      <Modal
        title="添加端点"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        okText="添加"
        cancelText="取消"
        onOk={async () => {
          try {
            const baseUrl = addDraft.baseUrl.trim();
            const name = addDraft.name.trim();
            const defaultModel = addDraft.defaultModel.trim();
            if (!name || !baseUrl || !defaultModel) return;

            const endpoint: EndpointConfig = {
              id: crypto.randomUUID(),
              name,
              baseUrl,
              defaultModel,
              parameters: { temperature: 0.8, maxTokens: 4000, topP: 1, topK: 0 },
            };
            const next = { ...config, endpoints: [...config.endpoints, endpoint], activeEndpointId: endpoint.id };
            await updateConfig(next);
            setAddOpen(false);
            message.success("已添加端点");
          } catch (e) {
            message.error(String(e));
          }
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <Input value={addDraft.name} onChange={(e) => setAddDraft({ ...addDraft, name: e.target.value })} placeholder="端点名称" />
          <Input value={addDraft.baseUrl} onChange={(e) => setAddDraft({ ...addDraft, baseUrl: e.target.value })} placeholder="Base URL（包含 /v1）" />
          <Input value={addDraft.defaultModel} onChange={(e) => setAddDraft({ ...addDraft, defaultModel: e.target.value })} placeholder="默认模型" />
        </Space>
      </Modal>

      <Modal
        title="设置 API Key"
        open={apiKeyModal.open}
        onCancel={() => {
          setApiKeyModal({ open: false, endpointId: null });
          setApiKeyValue("");
        }}
        okText="保存"
        cancelText="取消"
        onOk={async () => {
          try {
            const endpointId = apiKeyModal.endpointId;
            if (!endpointId) return;
            const key = apiKeyValue.trim();
            if (!key) return;
            await api.secureSetApiKey(endpointId, key);
            setApiKeyStatus((s) => ({ ...s, [endpointId]: true }));
            setApiKeyModal({ open: false, endpointId: null });
            setApiKeyValue("");
            message.success("已保存 API Key");
          } catch (e) {
            message.error(String(e));
          }
        }}
      >
        <Form layout="vertical">
          <Form.Item label="API Key">
            <Input.Password value={apiKeyValue} onChange={(e) => setApiKeyValue(e.target.value)} placeholder="sk-..." />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
