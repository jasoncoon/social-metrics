import { Alert, Button, Card, Empty, Flex, Input, Spin, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { getFollowerHistory } from "../api/socialMetrics";
import { AppShell, PageTitle } from "../components/AppShell";
import { RangePicker } from "../components/ChartControls";
import { DeltaText } from "../components/DeltaText";
import { FollowersChart } from "../components/FollowersChart";
import { ProfileHeader } from "../components/ProfileHeader";
import { alignSeries, dataBounds, rangeStart, rangeTitle } from "../data/series";
import { summarize } from "../data/summary";
import { useIsMobile } from "../hooks/useMediaQuery";
import { useUrlParams } from "../hooks/useUrlParams";
import { colors } from "../theme";
import type { MetricPoint, Platform, Profile } from "../types";
import { parseRange, profileHref } from "./DashboardPage";

/** Search box shared by the single-profile pages. */
export function HandleSearch({
  platform,
  handle,
  onSearch,
}: {
  platform: Platform;
  handle: string;
  onSearch: (handle: string) => void;
}) {
  return (
    <Input.Search
      key={handle}
      defaultValue={handle}
      placeholder={platform.handleExamples[0]}
      enterButton="Go"
      allowClear
      onSearch={(v) => v.trim() && onSearch(platform.normalizeHandle(v))}
      style={{ maxWidth: 520, marginBottom: 16 }}
      aria-label="Profile handle"
    />
  );
}

export function TrackedProfiles({ platform, hrefFor }: { platform: Platform; hrefFor: (h: string) => string }) {
  return (
    <Card size="small" title="Tracked profiles">
      <Flex wrap gap="4px 16px">
        {platform.defaultHandles.map((h) => (
          <a key={h} href={hrefFor(h)}>
            {platform.shortLabel(h)}
          </a>
        ))}
      </Flex>
    </Card>
  );
}

interface Loaded {
  handle: string;
  profile: Profile | null;
  history: MetricPoint[];
}

export function ProfilePage({ platform }: { platform: Platform }) {
  const [params, update] = useUrlParams();
  const handle = platform.normalizeHandle(params.get("handle") ?? params.get("username") ?? "");
  const range = parseRange(params, "all");
  const [loaded, setLoaded] = useState<Loaded>();
  const mobile = useIsMobile();

  useEffect(() => {
    if (!handle) return;
    let cancelled = false;
    void Promise.all([platform.getProfile(handle), getFollowerHistory(platform.name, handle)]).then(
      ([profile, history]) => {
        if (!cancelled) setLoaded({ handle, profile: profile ?? null, history });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [handle, platform]);

  const current = loaded?.handle === handle ? loaded : undefined;

  const view = useMemo(() => {
    if (!current?.history.length) return undefined;
    const histories = new Map([[handle, current.history]]);
    const { first, last } = dataBounds(histories);
    if (!first || !last) return undefined;
    const aligned = alignSeries(histories, [handle], rangeStart(range, last, first), last);
    return { aligned, summary: summarize(histories, aligned, last)[0] };
  }, [current, handle, range]);

  const search = (h: string) => update({ handle: h, username: null }, { push: true });
  const rangePicker = (
    <RangePicker value={range} onChange={(r) => update({ range: r === "all" ? null : r, days: null })} />
  );

  return (
    <AppShell platform={platform} current="profile" title={current?.profile?.displayName ?? handle}>
      <PageTitle>Profile</PageTitle>
      <HandleSearch platform={platform} handle={handle} onSearch={search} />

      {!handle ? (
        <TrackedProfiles platform={platform} hrefFor={profileHref} />
      ) : !current ? (
        <Spin style={{ display: "block", padding: 80 }} />
      ) : (
        <>
          {current.profile ? (
            <ProfileHeader
              profile={current.profile}
              extra={
                platform.extraProfileLinks && (
                  <Flex gap={8}>
                    {platform.extraProfileLinks(handle).map((l) => (
                      <Button key={l.key} href={l.href}>
                        {l.label}
                      </Button>
                    ))}
                  </Flex>
                )
              }
            />
          ) : (
            <Alert type="error" showIcon title={`Couldn't load the profile for ${handle}`} style={{ marginBottom: 16 }} />
          )}

          <Card
            title="Follower history"
            // On phones the card header is too narrow for the title and the picker.
            extra={!mobile && rangePicker}
          >
            {mobile && <div style={{ marginBottom: 12 }}>{rangePicker}</div>}
            {view ? (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4, max-content)",
                    gap: mobile ? "8px 16px" : "8px 32px",
                    marginBottom: 8,
                  }}
                >
                  {(
                    [
                      ["1 day", view.summary?.d1],
                      ["7 days", view.summary?.d7],
                      ["30 days", view.summary?.d30],
                      [rangeTitle(range), view.summary?.inRange],
                    ] as const
                  )
                    .filter(([label], i, all) => all.findIndex(([l]) => l === label) === i)
                    .map(([label, delta]) => (
                    <Flex vertical key={label}>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {label}
                      </Typography.Text>
                      <DeltaText delta={delta} />
                    </Flex>
                  ))}
                </div>
                {view.summary?.staleSince && (
                  <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 8 }}
                    title={`No data since ${view.summary.staleSince}. The account may have moved servers or changed its handle.`}
                  />
                )}
                <FollowersChart
                  aligned={view.aligned}
                  handles={[handle]}
                  labelFor={() => current.profile?.displayName ?? handle}
                  colorFor={() => colors.series[0]}
                  mode="absolute"
                  height={420}
                />
              </>
            ) : (
              <Empty
                description={
                  <>
                    No follower history for {handle}. History is only collected for tracked
                    profiles.
                  </>
                }
              />
            )}
          </Card>
        </>
      )}
    </AppShell>
  );
}
