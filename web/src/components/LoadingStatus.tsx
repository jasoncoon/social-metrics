import { Flex, Progress, Typography } from "antd";

export function LoadingStatus({ done, total, label }: { done: number; total: number; label?: string }) {
  if (total === 0 || done >= total) return null;
  return (
    <Flex align="center" gap={12} style={{ maxWidth: 520, marginBottom: 16 }}>
      <Progress percent={Math.round((done / total) * 100)} size="small" style={{ flex: 1, margin: 0 }} />
      <Typography.Text type="secondary" style={{ whiteSpace: "nowrap" }}>
        {label ?? "Loading"} {done} of {total}…
      </Typography.Text>
    </Flex>
  );
}
