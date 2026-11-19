import { Avatar, Card, Flex, Statistic, Typography } from "antd";
import type { ReactNode } from "react";
import { useIsMobile } from "../hooks/useMediaQuery";
import { colors } from "../theme";
import type { Profile } from "../types";

export function ProfileHeader({ profile, extra }: { profile: Profile; extra?: ReactNode }) {
  const mobile = useIsMobile();
  const statStyles = mobile ? { content: { fontSize: 20 } } : undefined;
  return (
    <Card
      style={{ marginBottom: 16, overflow: "hidden" }}
      styles={{ body: { paddingTop: profile.banner ? 0 : undefined } }}
      cover={
        profile.banner ? (
          <img alt="" src={profile.banner} style={{ height: mobile ? 110 : 160, objectFit: "cover" }} />
        ) : undefined
      }
    >
      <Flex gap={16} align="flex-end" wrap style={{ marginTop: profile.banner ? -36 : 0 }}>
        <Avatar
          src={profile.avatar}
          size={mobile ? 72 : 88}
          style={{ border: `3px solid ${colors.surface}`, flex: "none" }}
        >
          {profile.displayName.slice(0, 1)}
        </Avatar>
        {/* On phones the name takes the rest of the avatar's row; `extra` wraps below. */}
        <div style={{ flex: 1, minWidth: mobile ? "calc(100% - 88px)" : 200 }}>
          <Typography.Title level={3} style={{ margin: 0, overflowWrap: "break-word" }}>
            {profile.displayName}
          </Typography.Title>
          <a href={profile.url} target="_blank" rel="noopener noreferrer">
            {profile.url.replace(/^https:\/\//, "")}
          </a>
        </div>
        {extra}
      </Flex>
      {profile.descriptionHtml && (
        <div
          style={{ marginTop: 12, maxWidth: 760, color: colors.textSecondary }}
          dangerouslySetInnerHTML={{ __html: profile.descriptionHtml }}
        />
      )}
      <div
        style={{
          display: "grid",
          // 2×2 on phones rather than three in a row and one orphan.
          gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4, max-content)",
          gap: mobile ? "12px 16px" : "16px 40px",
          marginTop: 16,
        }}
      >
        <Statistic title="Followers" value={profile.followers} styles={statStyles} />
        <Statistic title="Following" value={profile.following} styles={statStyles} />
        <Statistic title="Posts" value={profile.posts} styles={statStyles} />
        <Statistic title="Joined" value={new Date(profile.createdAt).toLocaleDateString()} styles={statStyles} />
      </div>
    </Card>
  );
}
