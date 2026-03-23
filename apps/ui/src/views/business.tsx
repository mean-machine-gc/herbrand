import { useState } from "react";
import {
  Stack, Text, Paper, Badge, Group, Title, Tabs, Table, Box, ScrollArea,
} from "@mantine/core";
import { Briefcase } from "@phosphor-icons/react";
import type { HerbrandStore } from "herbrand-signals";
import type { UserStory, AcceptanceCriteria, DecisionTable, Scenario as ScenarioType, UserStoryView } from "herbrand-core";

// Shared badge colors
const intentColor = "blue";
const outcomeColor = "orange";
const rejectColor = "red";
const infoColor = "green";
const tagColor = "gray";

// --- Filter chips (same pattern as specs view) ---

function FilterChips({
  label, values, active, onToggle,
}: {
  label: string; values: string[]; active: string | null; onToggle: (v: string | null) => void;
}) {
  if (values.length <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
      <Text size="xs" c="dimmed" fw={500} style={{ flex: "0 0 10%", minWidth: 28 }}>{label}</Text>
      <div style={{ flex: "1 1 90%", display: "flex", flexWrap: "wrap", gap: 4 }}>
        {values.map((v) => (
          <Badge key={v} size="sm" variant={active === v ? "filled" : "outline"} color="gray"
            style={{ cursor: "pointer" }} onClick={() => onToggle(active === v ? null : v)}
          >{v}</Badge>
        ))}
      </div>
    </div>
  );
}

// --- Acceptance Criteria tab ---

function AcceptanceCriteriaTab({ ac }: { ac: AcceptanceCriteria }) {
  return (
    <Stack gap="sm">
      {/* Given — trigger + preconditions */}
      <div>
        <Text size="xs" fw={700} tt="uppercase" c={intentColor} mb={4}>Given</Text>
        <Box pl="md" mb={4}>
          <Badge size="xs" color={ac.triggerType === "reject" ? rejectColor : outcomeColor}>{ac.trigger}</Badge>
        </Box>
        {ac.given.map((g) => (
          <Box key={g.tag} pl="md" mb={4}>
            <Group gap={4}><Badge size="xs" color={tagColor}>{g.tag}</Badge><Text size="xs">{g.description}</Text></Group>
          </Box>
        ))}
      </div>

      {/* When */}
      <div>
        <Text size="xs" fw={700} tt="uppercase" c={intentColor} mb={4}>When</Text>
        <Box pl="md"><Badge size="sm" color={intentColor}>{ac.when}</Badge></Box>
      </div>

      {/* Then */}
      {ac.then.length > 0 ? ac.then.map((t) => (
        <div key={t.outcome}>
          <Text size="xs" fw={700} tt="uppercase" c={intentColor} mb={4}>Then</Text>
          <Box pl="md">
            <Group gap={4} mb={4}><Badge size="sm" color={outcomeColor}>{t.outcome}</Badge><Text size="xs">{t.description}</Text></Group>
            {t.condition && t.condition !== "always" && (
              <Box pl="md" mb={4} style={{ borderLeft: "2px solid var(--mantine-color-default-border)" }}>
                <Text size="xs" c="dimmed" fw={500} tt="uppercase">If</Text>
                <Text size="xs" pl="sm">{t.condition}</Text>
              </Box>
            )}
            {t.assertions.length > 0 && (
              <Box pl="md" style={{ borderLeft: "2px solid var(--mantine-color-default-border)" }}>
                <Text size="xs" c="dimmed" fw={500} tt="uppercase" mb={4}>Assertions</Text>
                {t.assertions.map((a) => (
                  <Box key={a.tag} mb={4}>
                    <Group gap={4}><Badge size="xs" color={tagColor}>{a.tag}</Badge><Text size="xs">{a.description}</Text></Group>
                    {a.affectedInfo.length > 0 && (
                      <Group gap={4} pl="sm" mt={2}>
                        {a.affectedInfo.map((i) => <Badge key={i} size="xs" color={infoColor} variant="light">{i}</Badge>)}
                      </Group>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </div>
      )) : (
        <div>
          <Text size="xs" fw={700} tt="uppercase" c={intentColor} mb={4}>Then</Text>
          <Text size="xs" c="dimmed" fs="italic" pl="md">No outcome decision linked — acceptance criteria incomplete</Text>
        </div>
      )}

      {/* Should Fail If */}
      {ac.shouldFailIf.length > 0 && (
        <div>
          <Text size="xs" fw={700} tt="uppercase" c={rejectColor} mb={4}>Should Fail If</Text>
          {ac.shouldFailIf.map((f) => (
            <Box key={f.tag} pl="md" mb={4}>
              <Group gap={4}><Badge size="xs" color={rejectColor} variant="light">{f.tag}</Badge><Text size="xs">{f.description}</Text></Group>
            </Box>
          ))}
        </div>
      )}
    </Stack>
  );
}

// --- Decision Table tab ---

function DecisionTableTab({ table }: { table: DecisionTable }) {
  if (table.rows.length === 0) {
    return <Text size="xs" c="dimmed" fs="italic">Not enough data to generate a decision table.</Text>;
  }

  const { preconditionColumns, constraintColumns, rows } = table;
  const hasConstraints = constraintColumns.length > 0;

  return (
    <ScrollArea>
      <Table fontSize="xs" striped highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Scenario</Table.Th>
            <Table.Th>Type</Table.Th>
            {preconditionColumns.map((p) => <Table.Th key={p} style={{ fontSize: 10 }}>{p}</Table.Th>)}
            {constraintColumns.map((c) => <Table.Th key={c} style={{ fontSize: 10 }}>{c}</Table.Th>)}
            <Table.Th>Outcome</Table.Th>
            <Table.Th>Assertions</Table.Th>
            <Table.Th>Effects</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row, i) => (
            <Table.Tr key={i} style={{
              background: row.type === "success" ? "var(--mantine-color-green-0)" :
                row.type === "failure" ? "var(--mantine-color-red-0)" : undefined,
            }}>
              <Table.Td><Text size="xs" c="dimmed">{row.scenarioDescription}</Text></Table.Td>
              <Table.Td>
                <Badge size="xs" variant="light"
                  color={row.type === "success" ? "green" : row.type === "failure" ? "red" : "gray"}
                >{row.type}</Badge>
              </Table.Td>
              {preconditionColumns.map((p) => (
                <Table.Td key={p} ta="center">
                  {row.type === "skipped" && !row.preconditions[p]
                    ? <Text size="sm" c="red" fw={700}>✗</Text>
                    : row.type === "skipped" && row.preconditions[p]
                    ? <Text size="sm" c="green">✓</Text>
                    : <Text size="sm" c="green">✓</Text>}
                </Table.Td>
              ))}
              {constraintColumns.map((c) => (
                <Table.Td key={c} ta="center">
                  {row.type === "skipped" ? <Text size="sm" c="dimmed">—</Text> :
                    row.constraints[c]
                    ? <Text size="sm" c="green">✓</Text>
                    : <Text size="sm" c="red" fw={700}>✗</Text>}
                </Table.Td>
              ))}
              <Table.Td>
                {row.outcome ? (
                  <Badge size="xs" color={row.outcome.startsWith("rejected:") ? rejectColor : outcomeColor}>
                    {row.outcome}
                  </Badge>
                ) : null}
              </Table.Td>
              <Table.Td>
                <Group gap={2} wrap="wrap">
                  {row.assertions.map((a) => <Badge key={a} size="xs" color={tagColor}>{a}</Badge>)}
                </Group>
              </Table.Td>
              <Table.Td>
                <Group gap={2} wrap="wrap">
                  {row.effects.map((e) => <Badge key={e} size="xs" color={infoColor} variant="light">{e}</Badge>)}
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}

// --- Scenarios tab ---

function ScenariosTab({ scenarios }: { scenarios: ScenarioType[] }) {
  if (scenarios.length === 0) {
    return <Text size="xs" c="dimmed" fs="italic">No scenarios to display.</Text>;
  }

  return (
    <Stack gap="xs">
      {scenarios.map((s) => (
        <Paper key={`${s.type}-${s.tag}`} p="xs" withBorder>
          <Group gap="xs" mb={4}>
            <Badge size="xs" variant="light"
              color={s.type === "success" ? "green" : s.type === "failure" ? "red" : "gray"}
            >{s.type}</Badge>
            <Text size="sm" fw={500}>{s.tag}</Text>
          </Group>
          {s.description && <Text size="xs" c="dimmed" mb={4}>{s.description}</Text>}
          {s.scenarios.length > 0 ? (
            <Stack gap={2}>
              <Text size="xs" fw={600} tt="uppercase" c="dimmed">Scenarios</Text>
              {s.scenarios.map((sc, i) => (
                <Text key={i} size="xs" pl="md" style={{ borderLeft: "2px solid var(--mantine-color-default-border)" }}>
                  {sc}
                </Text>
              ))}
            </Stack>
          ) : (
            <Text size="xs" c="dimmed" fs="italic">No scenarios yet</Text>
          )}
        </Paper>
      ))}
    </Stack>
  );
}

// --- Views tab ---

function ViewsTab({ views }: { views: UserStoryView[] }) {
  if (views.length === 0) {
    return <Text size="xs" c="dimmed" fs="italic">No views — this decision has no required info.</Text>;
  }

  const multiple = views.length > 1;
  return (
    <Stack gap="xs">
      {views.map((view, i) => (
        <Paper key={view.id} p="xs" withBorder>
          {multiple && <Text size="xs" c="dimmed" mb={4}>View {i + 1} of {views.length}</Text>}
          {view.role && <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={4}>{view.role}</Text>}
          <Group gap={4} wrap="wrap">
            {view.infos.map((info) => <Badge key={info} size="xs" color={infoColor} variant="light">{info}</Badge>)}
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}

// --- User Story Card ---

function UserStoryCard({ story }: { story: UserStory }) {
  return (
    <Paper p="lg" withBorder mb="md">
      <Text size="md" mb="md" lh={1.7}>
        As a <strong>{story.role}</strong>,
        I want to <strong>{story.intentLabel}</strong>{" "}
        so to <strong>{story.businessGoal}</strong>
      </Text>

      <Tabs defaultValue="ac">
        <Tabs.List mb="sm">
          <Tabs.Tab value="ac" size="xs">Acceptance Criteria</Tabs.Tab>
          <Tabs.Tab value="dt" size="xs">Decision Table</Tabs.Tab>
          <Tabs.Tab value="sc" size="xs">Scenarios</Tabs.Tab>
          <Tabs.Tab value="vw" size="xs">Views</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="ac"><AcceptanceCriteriaTab ac={story.acceptanceCriteria} /></Tabs.Panel>
        <Tabs.Panel value="dt"><DecisionTableTab table={story.decisionTable} /></Tabs.Panel>
        <Tabs.Panel value="sc"><ScenariosTab scenarios={story.scenarios} /></Tabs.Panel>
        <Tabs.Panel value="vw"><ViewsTab views={story.views} /></Tabs.Panel>
      </Tabs>
    </Paper>
  );
}

// --- Business View ---

export function BusinessView({ store }: { store: HerbrandStore }) {
  const stories = store.userStories;
  const storyList = Object.values(stories).sort((a, b) => a.name.localeCompare(b.name));

  const [filterContext, setFilterContext] = useState<string | null>(null);
  const [filterModule, setFilterModule] = useState<string | null>(null);
  const [filterAggregate, setFilterAggregate] = useState<string | null>(null);

  const contexts = [...new Set(storyList.map((s) => s.context).filter(Boolean))] as string[];
  const modules = [...new Set(storyList.map((s) => s.module).filter(Boolean))] as string[];
  const aggregates = [...new Set(storyList.map((s) => s.aggregate).filter(Boolean))] as string[];

  const filtered = storyList.filter((s) => {
    if (filterContext && s.context !== filterContext) return false;
    if (filterModule && s.module !== filterModule) return false;
    if (filterAggregate && s.aggregate !== filterAggregate) return false;
    return true;
  });

  if (storyList.length === 0) {
    return (
      <Stack align="center" justify="center" h="60vh" gap="md">
        <Briefcase size={48} weight="light" color="var(--mantine-color-dimmed)" />
        <Text c="dimmed" size="sm">No user stories to show</Text>
      </Stack>
    );
  }

  return (
    <ScrollArea h="calc(100vh - 80px)">
      <Stack maw={950} mx="auto" p="lg">
        <Group gap="xs" mb="xs">
          <Title order={4}>User Stories</Title>
          <Badge color="gray" size="sm">{filtered.length}</Badge>
        </Group>

        <Stack gap="xs" mb="sm" style={{ borderBottom: "1px solid var(--mantine-color-default-border)", paddingBottom: 8 }}>
          <FilterChips label="ctx" values={contexts} active={filterContext} onToggle={setFilterContext} />
          <FilterChips label="mod" values={modules} active={filterModule} onToggle={setFilterModule} />
          <FilterChips label="agg" values={aggregates} active={filterAggregate} onToggle={setFilterAggregate} />
        </Stack>

        {filtered.map((story) => (
          <UserStoryCard key={story.name} story={story} />
        ))}
      </Stack>
    </ScrollArea>
  );
}
