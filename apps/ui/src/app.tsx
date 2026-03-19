import {
  MantineProvider,
  AppShell,
  Group,
  Title,
  ActionIcon,
  useMantineColorScheme,
  useComputedColorScheme,
} from "@mantine/core";
import "@mantine/core/styles.css";

function ThemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light");

  return (
    <ActionIcon
      variant="subtle"
      size="lg"
      onClick={() =>
        setColorScheme(computedColorScheme === "light" ? "dark" : "light")
      }
      aria-label="Toggle color scheme"
    >
      {computedColorScheme === "light" ? "🌙" : "☀️"}
    </ActionIcon>
  );
}

function Shell() {
  return (
    <AppShell header={{ height: 50 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title order={4}>Herbrand</Title>
          <ThemeToggle />
        </Group>
      </AppShell.Header>
      <AppShell.Main>
      </AppShell.Main>
    </AppShell>
  );
}

export function App() {
  return (
    <MantineProvider defaultColorScheme="light">
      <Shell />
    </MantineProvider>
  );
}
