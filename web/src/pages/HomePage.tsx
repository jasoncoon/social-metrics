import { GithubOutlined, RightOutlined } from "@ant-design/icons";
import { Card, Flex, Layout, Typography } from "antd";
import { useIsMobile } from "../hooks/useMediaQuery";
import { bluesky } from "../platforms/bluesky";
import { mastodon } from "../platforms/mastodon";
import { colors } from "../theme";

const sites = [
  {
    platform: bluesky,
    href: "./bsky/",
    blurb: "Follower growth across a set of Bluesky profiles: top gainers, rank changes and history.",
  },
  {
    platform: mastodon,
    href: "./masto/",
    blurb:
      "Follower growth across a set of Mastodon profiles, plus any account's followers and top posts.",
  },
];

/** Landing page linking to the Bluesky and Mastodon dashboards. */
export function HomePage() {
  const mobile = useIsMobile();
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Header
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${colors.grid}` }}
      >
        <span style={{ color: colors.textPrimary, fontWeight: 600, fontSize: 16 }}>Social Metrics</span>
        <a href={bluesky.repoUrl} aria-label="Source on GitHub" style={{ color: colors.textSecondary, fontSize: 18 }}>
          <GithubOutlined />
        </a>
      </Layout.Header>
      <Layout.Content style={{ padding: mobile ? "16px 12px 32px" : "48px 32px", maxWidth: 880, width: "100%", margin: "0 auto" }}>
        <Typography.Title level={2} style={{ marginTop: 0 }}>
          Social Metrics
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ fontSize: 16, marginBottom: 24 }}>
          Daily follower counts for a set of Bluesky and Mastodon profiles, charted over time.
        </Typography.Paragraph>
        <Flex vertical={mobile} gap={16}>
          {sites.map(({ platform, href, blurb }) => (
            <a key={platform.name} href={href} style={{ flex: 1 }}>
              <Card hoverable style={{ height: "100%" }}>
                <Flex justify="space-between" align="center" gap={12}>
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {platform.title}
                  </Typography.Title>
                  <RightOutlined style={{ color: colors.textMuted }} />
                </Flex>
                <Typography.Paragraph type="secondary" style={{ margin: "8px 0 0" }}>
                  {blurb} {platform.defaultHandles.length} profiles tracked.
                </Typography.Paragraph>
              </Card>
            </a>
          ))}
        </Flex>
      </Layout.Content>
    </Layout>
  );
}
