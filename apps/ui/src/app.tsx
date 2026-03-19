import { useState } from "react";
import {
  MantineProvider,
  AppShell,
  Group,
  Tabs,
  ActionIcon,
  useMantineColorScheme,
  useComputedColorScheme,
} from "@mantine/core";
import "@mantine/core/styles.css";
import { Sun, Moon, FileTs, Graph, Briefcase } from "@phosphor-icons/react";
import { HerbrandLogo } from "./logo";
import { store } from "./state";
import { SpecsView } from "./views/specs";
import { GraphView } from "./views/graph";
import { BusinessView } from "./views/business";

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
      {computedColorScheme === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </ActionIcon>
  );
}

function Shell() {
  const [activeTab, setActiveTab] = useState<string | null>("specs");

  return (
    <AppShell header={{ height: 50 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="lg">
            <span style={{ fontFamily: "'Courier New', Courier, monospace", fontWeight: 700, fontSize: 18 }}>
              <HerbrandLogo /> Herbrand
            </span>
            <Tabs value={activeTab} onChange={setActiveTab} variant="subtle" style={{ alignSelf: "stretch" }}>
              <Tabs.List h="100%">
                <Tabs.Tab value="specs" leftSection={<FileTs size={16} />}>Specs</Tabs.Tab>
                <Tabs.Tab value="graph" leftSection={<Graph size={16} />}>Decision Graph</Tabs.Tab>
                <Tabs.Tab value="business" leftSection={<Briefcase size={16} />}>Business</Tabs.Tab>
              </Tabs.List>
            </Tabs>
          </Group>
          <ThemeToggle />
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        {activeTab === "specs" && <SpecsView store={store} />}
        {activeTab === "graph" && <GraphView store={store} />}
        {activeTab === "business" && <BusinessView store={store} />}
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
