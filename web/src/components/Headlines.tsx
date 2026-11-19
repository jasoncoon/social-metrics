import { ArrowDownOutlined, ArrowUpOutlined, WarningOutlined } from "@ant-design/icons";
import { Alert, Card, Flex, Typography } from "antd";
import { Fragment } from "react";
import type { Delta, Headline, ProfileSummary } from "../data/summary";
import { colors, formatCount, formatPct, formatSigned } from "../theme";

/** The trend summary in words and numbers, so you don't need the chart to see who's moving. */
export function Headlines({
  items,
  movers,
  stale,
  summaries,
  labelFor,
  hrefFor,
  rangeLabel,
  total,
}: {
  items: readonly Headline[];
  /** All profiles combined over the range. */
  total?: { total: number; delta: Delta };
  movers: readonly ProfileSummary[];
  stale: readonly ProfileSummary[];
  summaries: ReadonlyMap<string, ProfileSummary>;
  labelFor: (handle: string) => string;
  hrefFor: (handle: string) => string;
  rangeLabel: string;
}) {
  if (!items.length && !movers.length && !stale.length) return null;

  return (
    <Flex vertical gap={12} style={{ marginBottom: 16 }}>
      {items.length > 0 && (
        <div
          style={{
            display: "grid",
            // Two per row on phones, one row on desktop.
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
            gap: 8,
          }}
        >
          {items.map((h) => {
            const up = h.delta.abs > 0;
            const Icon = up ? ArrowUpOutlined : ArrowDownOutlined;
            const total = summaries.get(h.handle)?.latest?.followers;
            return (
              <Card key={h.key} size="small">
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {h.title} · {rangeLabel.toLowerCase()}
                </Typography.Text>
                <div style={{ fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, lineHeight: 1.3 }}>
                  <Icon style={{ color: up ? colors.up : colors.down, fontSize: 16, marginRight: 6 }} />
                  {h.measure === "abs" ? formatSigned(h.delta.abs) : formatPct(h.delta.pct)}
                </div>
                <a href={hrefFor(h.handle)} style={{ fontWeight: 500, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {labelFor(h.handle)}
                </a>
                <Typography.Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                  {h.measure === "abs" ? formatPct(h.delta.pct) : formatSigned(h.delta.abs)}
                  {total !== undefined && ` · ${formatCount(total)} total`}
                </Typography.Text>
              </Card>
            );
          })}
          {total && (
            <Card size="small">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                All profiles combined · {rangeLabel.toLowerCase()}
              </Typography.Text>
              <div style={{ fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, lineHeight: 1.3 }}>
                {total.delta.abs > 0 ? (
                  <ArrowUpOutlined style={{ color: colors.up, fontSize: 16, marginRight: 6 }} />
                ) : total.delta.abs < 0 ? (
                  <ArrowDownOutlined style={{ color: colors.down, fontSize: 16, marginRight: 6 }} />
                ) : null}
                {formatSigned(total.delta.abs)}
              </div>
              <Typography.Text style={{ fontWeight: 500 }}>{formatCount(total.total)} followers</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                {formatPct(total.delta.pct)}
              </Typography.Text>
            </Card>
          )}
        </div>
      )}

      {movers.length > 0 && (
        <Typography.Text>
          <Typography.Text type="secondary">Rank changes over {rangeLabel.toLowerCase()}: </Typography.Text>
          {movers.map((s, i) => (
            <Fragment key={s.handle}>
              {i > 0 && ", "}
              <span style={{ whiteSpace: "nowrap" }}>
                <a href={hrefFor(s.handle)}>{labelFor(s.handle)}</a>{" "}
                {s.rankChange! > 0 ? (
                  <ArrowUpOutlined style={{ color: colors.up }} aria-label="up" />
                ) : (
                  <ArrowDownOutlined style={{ color: colors.down }} aria-label="down" />
                )}
                {Math.abs(s.rankChange!)} to #{s.rank}
              </span>
            </Fragment>
          ))}
        </Typography.Text>
      )}

      {stale.length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          title={
            <>
              No recent data for{" "}
              {stale.map((s, i) => (
                <span key={s.handle}>
                  {i > 0 && ", "}
                  <a href={hrefFor(s.handle)}>{labelFor(s.handle)}</a> (since {s.staleSince})
                </span>
              ))}
              . The account may have moved servers or changed its handle.
            </>
          }
        />
      )}
    </Flex>
  );
}
