import { ArrowDownOutlined, ArrowUpOutlined, MinusOutlined } from "@ant-design/icons";
import { Typography } from "antd";
import type { Delta } from "../data/summary";
import { colors, formatPct, formatSigned } from "../theme";

export type DeltaMeasure = "abs" | "pct";

/**
 * A signed change with a direction arrow. The arrow carries the color; the
 * numbers stay in text ink so direction never relies on color alone.
 */
export function DeltaText({
  delta,
  primary = "abs",
  secondary = true,
}: {
  delta?: Delta;
  primary?: DeltaMeasure;
  secondary?: boolean;
}) {
  if (!delta) return <Typography.Text type="secondary">–</Typography.Text>;
  const Icon = delta.abs > 0 ? ArrowUpOutlined : delta.abs < 0 ? ArrowDownOutlined : MinusOutlined;
  const iconColor = delta.abs > 0 ? colors.up : delta.abs < 0 ? colors.down : colors.textMuted;
  const abs = formatSigned(delta.abs);
  const pct = formatPct(delta.pct);
  return (
    <span style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
      <Icon style={{ color: iconColor, fontSize: 11, marginRight: 4 }} />
      {primary === "abs" ? abs : pct}
      {secondary && (
        <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>
          {primary === "abs" ? pct : abs}
        </Typography.Text>
      )}
    </span>
  );
}
