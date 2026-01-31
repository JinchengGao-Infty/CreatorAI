import { Button, Card, Input, Space, Tag, Typography, message } from "antd";
import { PlusOutlined, SaveOutlined } from "@ant-design/icons";
import { useMemo, useState } from "react";
import { useCreator } from "../../store/creatorStore";
import type { Preset } from "../../types";
import { open, save } from "@tauri-apps/plugin-dialog";
import { api } from "../../api/creatorai";

const { Text } = Typography;

export function PresetsPanel() {
  const { preset, actions } = useCreator();
  const [draft, setDraft] = useState<Preset | null>(null);
  const [newRule, setNewRule] = useState("");

  const current = useMemo(() => draft ?? preset, [draft, preset]);

  if (!current) {
    return (
      <div className="placeholder">
        <Text className="placeholderTitle">文风预设</Text>
        <Text className="placeholderDesc">加载中…</Text>
      </div>
    );
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Space>
        <Button
          onClick={async () => {
            try {
              const path = await save({
                title: "导出文风预设",
                defaultPath: "preset.json",
                filters: [{ name: "JSON", extensions: ["json"] }],
              });
              if (!path) return;
              await api.presetExport(path, current as Preset);
              message.success("已导出预设");
            } catch (e) {
              message.error(String(e));
            }
          }}
        >
          导出…
        </Button>
        <Button
          onClick={async () => {
            try {
              const path = await open({
                title: "导入文风预设",
                multiple: false,
                directory: false,
                filters: [{ name: "JSON", extensions: ["json"] }],
              });
              if (!path || Array.isArray(path)) return;
              const imported = await api.presetImport(path);
              setDraft(imported);
              message.success("已导入到草稿（点击保存生效）");
            } catch (e) {
              message.error(String(e));
            }
          }}
        >
          导入…
        </Button>
      </Space>

      <Card size="small" className="ivoryCard" title="写作风格">
        <Input.TextArea
          value={current.style}
          onChange={(e) => setDraft({ ...(current as Preset), style: e.target.value })}
          autoSize={{ minRows: 2, maxRows: 6 }}
        />
      </Card>

      <Card size="small" className="ivoryCard" title="叙事视角">
        <Input
          value={current.pov}
          onChange={(e) => setDraft({ ...(current as Preset), pov: e.target.value })}
          placeholder="例如：第三人称限定视角"
        />
      </Card>

      <Card size="small" className="ivoryCard" title="写作规则">
        <Space direction="vertical" style={{ width: "100%" }} size={10}>
          <div className="rulesWrap">
            {(current.rules ?? []).map((r, idx) => (
              <Tag
                key={`${r}-${idx}`}
                closable
                onClose={(e) => {
                  e.preventDefault();
                  const next = (current.rules ?? []).filter((_, i) => i !== idx);
                  setDraft({ ...(current as Preset), rules: next });
                }}
              >
                {r}
              </Tag>
            ))}
          </div>

          <Space.Compact style={{ width: "100%" }}>
            <Input value={newRule} onChange={(e) => setNewRule(e.target.value)} placeholder="添加一条规则…" />
            <Button
              icon={<PlusOutlined />}
              onClick={() => {
                const t = newRule.trim();
                if (!t) return;
                setDraft({ ...(current as Preset), rules: [...(current.rules ?? []), t] });
                setNewRule("");
              }}
            >
              添加
            </Button>
          </Space.Compact>

          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={async () => {
              await actions.savePreset(current as Preset);
              setDraft(null);
            }}
          >
            保存预设
          </Button>
        </Space>
      </Card>
    </Space>
  );
}
