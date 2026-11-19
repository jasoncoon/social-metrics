import { ExportOutlined, GithubOutlined, MenuOutlined } from "@ant-design/icons";
import { App, Button, ConfigProvider, Drawer, Flex, Layout, Menu, type ThemeConfig, Typography } from "antd";
import { type ReactNode, StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { useIsMobile } from "../hooks/useMediaQuery";
import { colors, themeConfig } from "../theme";
import type { Platform } from "../types";

/** Mounts a page with the shared dark theme. */
export function mount(page: ReactNode) {
  document.documentElement.style.colorScheme = "dark";
  document.body.style.background = colors.page;
  document.body.style.margin = "0";
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ThemedApp>{page}</ThemedApp>
    </StrictMode>
  );
}

/** The shared theme, with tighter card padding on phones so content gets the width. */
function ThemedApp({ children }: { children: ReactNode }) {
  const mobile = useIsMobile();
  const theme = useMemo<ThemeConfig>(
    () =>
      mobile
        ? {
            ...themeConfig,
            components: {
              ...themeConfig.components,
              Card: { bodyPadding: 12, headerPadding: 12, bodyPaddingSM: 10, headerPaddingSM: 10 },
            },
          }
        : themeConfig,
    [mobile]
  );
  return (
    <ConfigProvider theme={theme}>
      <App>{children}</App>
    </ConfigProvider>
  );
}

export function AppShell({
  platform,
  current,
  title,
  children,
}: {
  platform: Platform;
  current: string;
  /** Page-specific title, e.g. a profile name. */
  title?: string;
  children: ReactNode;
}) {
  const mobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.title = [title, platform.title].filter(Boolean).join(" · ");
  }, [title, platform.title]);

  const menuItems = platform.pages.map((p) => ({
    key: p.key,
    label: <a href={p.href}>{p.label}</a>,
  }));

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          borderBottom: `1px solid ${colors.grid}`,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <a
          href="./"
          style={{ color: colors.textPrimary, fontWeight: 600, fontSize: 16, whiteSpace: "nowrap", flex: mobile ? 1 : undefined }}
        >
          {platform.title}
        </a>
        {mobile ? (
          <>
            <Button
              type="text"
              icon={<MenuOutlined />}
              aria-label="Menu"
              onClick={() => setMenuOpen(true)}
              style={{ marginRight: -8 }}
            />
            <Drawer
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              placement="right"
              size={280}
              title={platform.title}
              styles={{ body: { padding: "8px 0" } }}
            >
              <Menu mode="inline" selectedKeys={[current]} items={menuItems} style={{ borderInlineEnd: "none" }} />
              <Flex vertical gap={16} style={{ padding: "16px 24px", borderTop: `1px solid ${colors.grid}`, marginTop: 8 }}>
                <a href={platform.otherApp.url}>
                  {platform.otherApp.name} <ExportOutlined />
                </a>
                <a href={platform.repoUrl} style={{ color: colors.textSecondary }}>
                  <GithubOutlined /> Source on GitHub
                </a>
              </Flex>
            </Drawer>
          </>
        ) : (
          <>
        <Menu
          mode="horizontal"
          selectedKeys={[current]}
          style={{ flex: 1, minWidth: 0, borderBottom: "none" }}
          items={menuItems}
        />
        <Flex gap={16} align="center">
          <a href={platform.otherApp.url} style={{ whiteSpace: "nowrap" }}>
            {platform.otherApp.name} <ExportOutlined />
          </a>
          <a href={platform.repoUrl} aria-label="Source on GitHub" style={{ color: colors.textSecondary, fontSize: 18 }}>
            <GithubOutlined />
          </a>
        </Flex>
          </>
        )}
      </Layout.Header>
      <Layout.Content style={{ padding: mobile ? "8px 12px 32px" : "16px clamp(12px, 3vw, 32px) 48px", maxWidth: 1600, width: "100%", margin: "0 auto" }}>
        {children}
      </Layout.Content>
    </Layout>
  );
}

export function PageTitle({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <Flex justify="space-between" align="center" wrap gap={12} style={{ margin: "8px 0 16px" }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        {children}
      </Typography.Title>
      {extra}
    </Flex>
  );
}
