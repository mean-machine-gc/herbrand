import { Stack, Text } from "@mantine/core";
import { Graph } from "@phosphor-icons/react";

export function GraphView() {
  return (
    <Stack align="center" justify="center" h="60vh" gap="md">
      <Graph size={48} weight="light" color="var(--mantine-color-dimmed)" />
      <Text c="dimmed" size="sm">Nothing to show</Text>
    </Stack>
  );
}
