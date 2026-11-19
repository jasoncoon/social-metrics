import { colors } from "../theme";

/** Tiny inline trend line. Gaps break the line rather than being bridged. */
export function Sparkline({
  values,
  width = 112,
  height = 28,
}: {
  values: readonly (number | null)[];
  width?: number;
  height?: number;
}) {
  const present = values.filter((v): v is number => v !== null);
  if (present.length < 2) return <svg width={width} height={height} aria-hidden />;

  const min = Math.min(...present);
  const max = Math.max(...present);
  const pad = 3;
  const x = (i: number) => pad + (i / Math.max(values.length - 1, 1)) * (width - pad * 2);
  const y = (v: number) =>
    max === min ? height / 2 : pad + (1 - (v - min) / (max - min)) * (height - pad * 2);

  let d = "";
  let penDown = false;
  values.forEach((v, i) => {
    if (v === null) {
      penDown = false;
      return;
    }
    d += `${penDown ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    penDown = true;
  });

  const lastIndex = values.findLastIndex((v) => v !== null);
  const last = values[lastIndex] as number;

  return (
    <svg width={width} height={height} role="img" aria-label={`Trend from ${present[0]} to ${last}`}>
      <path d={d} fill="none" stroke={colors.textSecondary} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(lastIndex)} cy={y(last)} r={3} fill={colors.series[0]} stroke={colors.surface} strokeWidth={1.5} />
    </svg>
  );
}
