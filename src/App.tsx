import "./App.css";
import { ConfigProvider, Layout, Spin } from "antd";
import { useMemo } from "react";
import { ActivityBar } from "./components/ActivityBar";
import { AIPanel } from "./components/AIPanel";
import { EditorPane } from "./components/EditorPane";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { CreatorProvider, useCreator } from "./store/creatorStore";

function AppInner() {
  const { busy } = useCreator();

  if (busy.loading) {
    return (
      <div className="loadingRoot">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout className="appRoot">
      <TopBar />
      <div className="workbench">
        <ActivityBar />
        <Sidebar />
        <EditorPane />
        <AIPanel />
      </div>
    </Layout>
  );
}

export default function App() {
  const theme = useMemo(
    () => ({
      token: {
        colorBgBase: "#FFFFF0",
        colorBgContainer: "#FFFDF0",
        colorBorder: "#E8DCC5",
        colorText: "#2F2F2F",
        colorTextSecondary: "#5A5A5A",
        colorPrimary: "#B08D57",
        borderRadius: 10,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", Arial, sans-serif',
      },
    }),
    [],
  );

  return (
    <ConfigProvider theme={theme}>
      <CreatorProvider>
        <AppInner />
      </CreatorProvider>
    </ConfigProvider>
  );
}

