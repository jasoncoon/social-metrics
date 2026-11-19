import { ArrowDownOutlined, ArrowUpOutlined, ExportOutlined, WarningOutlined } from "@ant-design/icons";
import { Avatar, Flex, Segmented, Table, type TableColumnsType, Tag, Tooltip, Typography } from "antd";
import { type CSSProperties, useState } from "react";
import type { Delta, ProfileSummary } from "../data/summary";
import { useIsMobile } from "../hooks/useMediaQuery";
import { colors, formatCount } from "../theme";
import type { Profile } from "../types";
import { type DeltaMeasure, DeltaText } from "./DeltaText";
import { Sparkline } from "./Sparkline";

interface Row extends ProfileSummary {
  profile?: Profile | null;
  followers?: number;
}

const ratio = (a?: number, b?: number) => (a !== undefined && b ? a / b : undefined);
const byNumber = (get: (r: Row) => number | undefined) => (a: Row, b: Row) =>
  (get(a) ?? Number.NEGATIVE_INFINITY) - (get(b) ?? Number.NEGATIVE_INFINITY);

const ellipsis: CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

/**
 * Width of the pinned profile cell on phones: enough to recognize a name, while
 * leaving most of the screen for the columns that scroll past it.
 */
const MOBILE_PROFILE_WIDTH = "min(40vw, 190px)";

export function SummaryTable({
  summaries,
  profiles,
  rangeLabel,
  labelFor,
  colorFor,
  hrefFor,
}: {
  summaries: readonly ProfileSummary[];
  profiles: ReadonlyMap<string, Profile | null>;
  rangeLabel: string;
  labelFor: (handle: string) => string;
  colorFor: (handle: string) => string | undefined;
  hrefFor: (handle: string) => string;
}) {
  const [measure, setMeasure] = useState<DeltaMeasure>("abs");
  const mobile = useIsMobile();

  const rows: Row[] = summaries.map((s) => {
    const profile = profiles.get(s.handle);
    return { ...s, profile, followers: profile?.followers ?? s.latest?.followers };
  });

  const deltaColumn = (title: string, key: keyof Row, get: (r: Row) => Delta | undefined) => ({
    title,
    key,
    align: "right" as const,
    sorter: byNumber((r) => get(r)?.[measure]),
    render: (_: unknown, r: Row) => <DeltaText delta={get(r)} primary={measure} />,
  });

  const rankColumn: TableColumnsType<Row>[number] = {
      title: "#",
      key: "rank",
      width: 64,
      fixed: mobile ? undefined : "start",
      sorter: byNumber((r) => r.rank),
      render: (_, r) => (
        <Flex gap={4} align="center" style={{ fontVariantNumeric: "tabular-nums" }}>
          {r.rank ?? "–"}
          {r.rankChange ? (
            <Tooltip title={`Was #${r.rankAtStart} at the start of the range`}>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                {r.rankChange > 0 ? (
                  <ArrowUpOutlined style={{ color: colors.up }} />
                ) : (
                  <ArrowDownOutlined style={{ color: colors.down }} />
                )}
                {Math.abs(r.rankChange)}
              </Typography.Text>
            </Tooltip>
          ) : null}
        </Flex>
      ),
    };

  const columns: TableColumnsType<Row> = [
    // On phones the rank moves after Followers so the pinned column stays narrow.
    ...(mobile ? [] : [rankColumn]),
    {
      title: "Profile",
      key: "profile",
      fixed: "start",
      sorter: (a, b) => labelFor(a.handle).localeCompare(labelFor(b.handle)),
      render: (_, r) => {
        const color = colorFor(r.handle);
        return (
          <Flex
            gap={mobile ? 6 : 8}
            align="center"
            style={mobile ? { width: MOBILE_PROFILE_WIDTH } : { minWidth: 200 }}
          >
            <Avatar src={r.profile?.avatar} size={mobile ? 24 : 28} style={{ flex: "none" }}>
              {(r.profile?.displayName ?? r.handle).slice(0, 1)}
            </Avatar>
            <Flex vertical style={{ minWidth: 0, lineHeight: 1.25 }}>
              <a href={hrefFor(r.handle)} style={{ fontWeight: 500, ...(mobile && ellipsis) }}>
                {r.profile?.displayName ?? labelFor(r.handle)}
              </a>
              <Typography.Text type="secondary" style={{ fontSize: 12, ...(mobile && ellipsis) }}>
                {color && (
                  <span
                    aria-hidden
                    style={{ display: "inline-block", width: 10, height: 3, borderRadius: 2, background: color, marginRight: 6, verticalAlign: "middle" }}
                  />
                )}
                {mobile ? labelFor(r.handle) : r.handle}
                {r.profile?.url && !mobile && (
                  <a href={r.profile.url} target="_blank" rel="noopener noreferrer" aria-label="Open profile" style={{ marginLeft: 6, color: colors.textMuted }}>
                    <ExportOutlined />
                  </a>
                )}
              </Typography.Text>
            </Flex>
          </Flex>
        );
      },
    },
    {
      title: "Followers",
      key: "followers",
      align: "right",
      defaultSortOrder: "descend",
      sorter: byNumber((r) => r.followers),
      render: (_, r) => (
        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
          {r.followers !== undefined ? formatCount(r.followers) : "–"}
        </span>
      ),
    },
    ...(mobile ? [rankColumn] : []),
    deltaColumn("1 day", "d1", (r) => r.d1),
    deltaColumn("7 days", "d7", (r) => r.d7),
    deltaColumn("30 days", "d30", (r) => r.d30),
    // The selected range, unless it's already one of the fixed columns above.
    ...(["1 day", "7 days", "30 days"].includes(rangeLabel)
      ? []
      : [deltaColumn(rangeLabel, "inRange", (r) => r.inRange)]),
    {
      title: "Trend",
      key: "trend",
      render: (_, r) => <Sparkline values={r.sparkline} />,
    },
    {
      title: "Following",
      key: "following",
      align: "right",
      sorter: byNumber((r) => r.profile?.following),
      render: (_, r) => (r.profile ? formatCount(r.profile.following) : "–"),
    },
    {
      title: <Tooltip title="Followers per follow">FPF</Tooltip>,
      key: "fpf",
      align: "right",
      sorter: byNumber((r) => ratio(r.followers, r.profile?.following)),
      render: (_, r) => {
        const v = ratio(r.followers, r.profile?.following);
        return v === undefined ? "–" : v.toFixed(1);
      },
    },
    {
      title: "Posts",
      key: "posts",
      align: "right",
      sorter: byNumber((r) => r.profile?.posts),
      render: (_, r) => (r.profile ? formatCount(r.profile.posts) : "–"),
    },
    {
      title: <Tooltip title="Followers per post">FPP</Tooltip>,
      key: "fpp",
      align: "right",
      sorter: byNumber((r) => ratio(r.followers, r.profile?.posts)),
      render: (_, r) => {
        const v = ratio(r.followers, r.profile?.posts);
        return v === undefined ? "–" : v.toFixed(2);
      },
    },
    {
      title: "Joined",
      key: "joined",
      sorter: (a, b) => (a.profile?.createdAt ?? "").localeCompare(b.profile?.createdAt ?? ""),
      render: (_, r) => (r.profile ? new Date(r.profile.createdAt).toLocaleDateString() : "–"),
    },
    {
      title: "Data",
      key: "data",
      sorter: byNumber((r) => (r.staleSince ? 1000 : 0) + r.gaps),
      render: (_, r) => (
        <Flex gap={4} wrap>
          {r.profile === null && <Tag color="error">Profile not found</Tag>}
          {!r.latest && r.profile !== undefined && <Tag>No history</Tag>}
          {r.staleSince && (
            <Tooltip title="No data in the last 3+ days. The account may have moved or been renamed.">
              <Tag icon={<WarningOutlined />} color="warning">
                No data since {r.staleSince}
              </Tag>
            </Tooltip>
          )}
          {r.gaps > 0 && !r.staleSince && (
            <Tooltip title="Days in this range with no data (shown as gaps in the chart)">
              <Tag>
                {r.gaps} {r.gaps === 1 ? "gap" : "gaps"}
              </Tag>
            </Tooltip>
          )}
        </Flex>
      ),
    },
  ];

  return (
    <>
      <Flex justify="flex-end" align="center" gap={8} style={{ marginBottom: 8 }}>
        <Typography.Text type="secondary">{mobile ? "Show changes as" : "Sort and show changes as"}</Typography.Text>
        <Segmented<DeltaMeasure>
          size="small"
          value={measure}
          onChange={setMeasure}
          options={[
            { value: "abs", label: "Followers" },
            { value: "pct", label: "%" },
          ]}
        />
      </Flex>
      <Table<Row>
        rowKey="handle"
        size="small"
        sticky={{ offsetHeader: 64 }}
        pagination={false}
        scroll={{ x: "max-content" }}
        columns={columns}
        dataSource={rows}
        showSorterTooltip={false}
      />
    </>
  );
}
