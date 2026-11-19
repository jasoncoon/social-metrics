import { Button, Flex, Input, Typography } from "antd";
import { useState } from "react";

export function HandlesForm({
  handles,
  defaults,
  examples,
  normalize,
  onApply,
}: {
  handles: readonly string[];
  defaults: readonly string[];
  examples: readonly string[];
  normalize: (input: string) => string;
  onApply: (handles: string[]) => void;
}) {
  const [text, setText] = useState(handles.join("\n"));

  const parse = (value: string) => [
    ...new Set(
      value
        .split(/[\n;,]/)
        .map((h) => normalize(h))
        .filter(Boolean)
    ),
  ];

  return (
    <Flex vertical gap={12}>
      <Typography.Text type="secondary">
        One profile per line. Follower history is only available for profiles that the
        collector tracks; other profiles still show their current numbers.
      </Typography.Text>
      <Input.TextArea
        aria-label="Profiles"
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoSize={{ minRows: 8, maxRows: 24 }}
        style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
      />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Accepted formats: {examples.map((e, i) => <code key={e}>{i > 0 && ", "}{e}</code>)}
      </Typography.Text>
      <Flex gap={8}>
        <Button type="primary" onClick={() => onApply(parse(text))}>
          Apply
        </Button>
        <Button
          onClick={() => {
            setText(defaults.join("\n"));
            onApply([...defaults]);
          }}
        >
          Reset to defaults
        </Button>
      </Flex>
    </Flex>
  );
}
