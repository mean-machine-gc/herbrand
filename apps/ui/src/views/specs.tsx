import { useState } from "react";
import {
  Stack, Group, Text, Paper, Badge, Title, ScrollArea, Box, Indicator,
} from "@mantine/core";
import {
  FileTs, Warning, XCircle, ArrowRight, Info,
} from "@phosphor-icons/react";
import type { HerbrandStore } from "@herbrand/signals";
import type { ParsedSpec, LintResult } from "@herbrand/core";

// Badge colors
const intentColor = "blue";
const outcomeColor = "orange";
const rejectColor = "red";
const infoColor = "green";
const tagColor = "gray";
const roleColor = "yellow";

function TypeBadge({ spec }: { spec: ParsedSpec }) {
  return spec.type === "outcome"
    ? <Badge size="xs" color={outcomeColor}>outcome decision</Badge>
    : <Badge size="xs" color={intentColor}>intent decision</Badge>;
}

function RoleBadge({ spec }: { spec: ParsedSpec }) {
  return <Badge size="xs" color={roleColor} variant="light">{spec.role ?? "machine"}</Badge>;
}

function TriggerBadge({ spec }: { spec: ParsedSpec }) {
  if (spec.type === "outcome") {
    return <Badge size="xs" color={intentColor}>{spec.trigger}</Badge>;
  }
  return (
    <Group gap={4}>
      <Badge size="xs" color={spec.triggerType === "reject" ? rejectColor : outcomeColor}>
        {spec.trigger}
      </Badge>
      <Text size="xs" c="dimmed">{spec.triggerType}</Text>
    </Group>
  );
}

function InfoBadges({ infos, label }: { infos: string[]; label: string }) {
  if (infos.length === 0) return null;
  return (
    <Group gap={4} mt={4}>
      <Text size="xs" c="dimmed">{label}:</Text>
      {infos.map((i) => <Badge key={i} size="xs" color={infoColor} variant="light">{i}</Badge>)}
    </Group>
  );
}

function ScenarioList({ scenarios }: { scenarios: string[] }) {
  if (scenarios.length === 0) return null;
  return (
    <Stack gap={2} mt={4}>
      {scenarios.map((s, i) => (
        <Text key={i} size="xs" c="dimmed" fs="italic" pl="md">scenario: {s}</Text>
      ))}
    </Stack>
  );
}

function SpecDetail({ name, spec }: { name: string; spec: ParsedSpec }) {
  const isOutcome = spec.type === "outcome";

  return (
    <Stack gap="md">
      {/* Header */}
      <div>
        <Title order={4}>{name}</Title>
        <Group gap="xs" mt={4}>
          <TypeBadge spec={spec} />
          <RoleBadge spec={spec} />
        </Group>
      </div>

      {/* Description */}
      {spec.description && <Text size="sm" c="dimmed">{spec.description}</Text>}

      {/* Context / Module / Aggregate */}
      {(spec.context || spec.module || spec.aggregate) && (
        <Group gap="xs">
          {spec.context && <Badge size="xs" variant="outline" color="gray">context: {spec.context}</Badge>}
          {spec.module && <Badge size="xs" variant="outline" color="gray">module: {spec.module}</Badge>}
          {spec.aggregate && <Badge size="xs" variant="outline" color="gray">aggregate: {spec.aggregate}</Badge>}
        </Group>
      )}

      {/* Trigger */}
      <div>
        <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={4}>Trigger</Text>
        <TriggerBadge spec={spec} />
      </div>

      {/* Preconditions / Should Fail With */}
      <div>
        <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={4}>
          {isOutcome ? "Should Fail With" : "Preconditions"}
        </Text>
        {spec.rejects.length === 0 ? (
          <Text size="xs" c="dimmed" fs="italic">None defined</Text>
        ) : (
          <Stack gap="xs">
            {spec.rejects.map((reject) => {
              const det = spec.rejectDetails[reject];
              return (
                <Paper key={reject} p="xs" withBorder>
                  <Badge size="xs" color={rejectColor}>{reject}</Badge>
                  {det?.description && <Text size="xs" mt={4}>{det.description}</Text>}
                  <InfoBadges infos={det?.requiredInfo ?? []} label="needs" />
                  <ScenarioList scenarios={det?.scenarios ?? []} />
                </Paper>
              );
            })}
          </Stack>
        )}
      </div>

      {/* Produces Intent / Should Succeed With */}
      <div>
        <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={4}>
          {isOutcome ? "Should Succeed With" : "Produces Intent"}
        </Text>
        {spec.choices.length === 0 ? (
          <Text size="xs" c="dimmed" fs="italic">None defined</Text>
        ) : (
          <Stack gap="xs">
            {spec.choices.map((choice) => {
              const det = spec.choiceDetails[choice];
              return (
                <Paper key={choice} p="xs" withBorder>
                  <Badge size="xs" color={isOutcome ? outcomeColor : intentColor}>{choice}</Badge>
                  {det?.description && <Text size="xs" mt={4}>{det.description}</Text>}
                  {det?.condition && (
                    <Group gap={4} mt={4}>
                      <Badge size="xs" color={tagColor}>condition</Badge>
                      <Text size="xs">{det.condition}</Text>
                    </Group>
                  )}
                  <InfoBadges infos={det?.requiredInfo ?? []} label="needs" />
                  <ScenarioList scenarios={det?.scenarios ?? []} />
                </Paper>
              );
            })}
          </Stack>
        )}
      </div>

      {/* Assertions (outcome only) */}
      {isOutcome && Object.keys(spec.assertionDetails).length > 0 && (
        <div>
          <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={4}>Assertions</Text>
          <Stack gap="xs">
            {spec.choices.map((choice) =>
              (spec.assertionDetails[choice] ?? []).map((a) => (
                <Paper key={a.tag} p="xs" withBorder>
                  <Badge size="xs" color={tagColor}>{a.tag}</Badge>
                  <Text size="xs" mt={4}>{a.description}</Text>
                  <InfoBadges infos={a.affectedInfo} label="affects" />
                </Paper>
              ))
            )}
          </Stack>
        </div>
      )}
    </Stack>
  );
}

function LintPanel({ results }: { results: LintResult[] }) {
  const errors = results.filter((r) => r.level === "error");
  const warnings = results.filter((r) => r.level === "warning");

  if (results.length === 0) {
    return (
      <Stack p="md">
        <Group gap="xs">
          <Title order={5}>Spec Lint</Title>
          <Badge color="green" size="xs">clean</Badge>
        </Group>
      </Stack>
    );
  }

  // Group by spec
  const bySpec: Record<string, LintResult[]> = {};
  const global: LintResult[] = [];
  for (const r of results) {
    if (r.spec) {
      if (!bySpec[r.spec]) bySpec[r.spec] = [];
      bySpec[r.spec].push(r);
    } else {
      global.push(r);
    }
  }

  return (
    <Stack p="md" gap="sm">
      <Group gap="xs">
        <Title order={5}>Spec Lint</Title>
        {errors.length > 0 && <Badge color="red" size="xs">{errors.length} errors</Badge>}
        {warnings.length > 0 && <Badge color="yellow" size="xs">{warnings.length} warnings</Badge>}
      </Group>

      {global.length > 0 && (
        <div>
          <Text size="xs" fw={600} c="dimmed" mb={4}>Global</Text>
          {global.map((r, i) => (
            <Group key={i} gap={4} mb={2}>
              {r.level === "error" ? <XCircle size={12} color="var(--mantine-color-red-6)" /> : <Warning size={12} color="var(--mantine-color-yellow-6)" />}
              <Text size="xs">{r.message}</Text>
            </Group>
          ))}
        </div>
      )}

      {Object.entries(bySpec).map(([spec, items]) => (
        <div key={spec}>
          <Text size="xs" fw={600} mb={4}>{spec}</Text>
          {items.map((r, i) => (
            <Group key={i} gap={4} mb={2}>
              {r.level === "error" ? <XCircle size={12} color="var(--mantine-color-red-6)" /> : <Warning size={12} color="var(--mantine-color-yellow-6)" />}
              <Text size="xs">{r.message}</Text>
            </Group>
          ))}
        </div>
      ))}
    </Stack>
  );
}

function FilterChips({
  label,
  values,
  active,
  onToggle,
}: {
  label: string;
  values: string[];
  active: string | null;
  onToggle: (value: string | null) => void;
}) {
  if (values.length <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
      <Text size="xs" c="dimmed" fw={500} style={{ flex: "0 0 10%", minWidth: 28 }}>{label}</Text>
      <div style={{ flex: "1 1 90%", display: "flex", flexWrap: "wrap", gap: 4 }}>
        {values.map((v) => (
          <Badge
            key={v}
            size="sm"
            variant={active === v ? "filled" : "outline"}
            color="gray"
            style={{ cursor: "pointer" }}
            onClick={() => onToggle(active === v ? null : v)}
          >
            {v}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function SpecsView({ store }: { store: HerbrandStore }) {
  const specs = store.parsedSpecs.specs;
  const lintResults = store.specLintResults;
  const specNames = Object.keys(specs).sort();
  const [selected, setSelected] = useState<string | null>(specNames[0] ?? null);

  const [filterContext, setFilterContext] = useState<string | null>(null);
  const [filterModule, setFilterModule] = useState<string | null>(null);
  const [filterAggregate, setFilterAggregate] = useState<string | null>(null);

  // Collect unique filter values
  const contexts = [...new Set(specNames.map((n) => specs[n].context).filter(Boolean))] as string[];
  const modules = [...new Set(specNames.map((n) => specs[n].module).filter(Boolean))] as string[];
  const aggregates = [...new Set(specNames.map((n) => specs[n].aggregate).filter(Boolean))] as string[];

  // Filter specs
  const filteredNames = specNames.filter((name) => {
    const spec = specs[name];
    if (filterContext && spec.context !== filterContext) return false;
    if (filterModule && spec.module !== filterModule) return false;
    if (filterAggregate && spec.aggregate !== filterAggregate) return false;
    return true;
  });

  // Lint issues per spec
  const lintBySpec: Record<string, { errors: number; warnings: number }> = {};
  for (const r of lintResults) {
    if (r.spec) {
      if (!lintBySpec[r.spec]) lintBySpec[r.spec] = { errors: 0, warnings: 0 };
      if (r.level === "error") lintBySpec[r.spec].errors++;
      else lintBySpec[r.spec].warnings++;
    }
  }

  if (specNames.length === 0) {
    return (
      <Stack align="center" justify="center" h="60vh" gap="md">
        <FileTs size={48} weight="light" color="var(--mantine-color-dimmed)" />
        <Text c="dimmed" size="sm">No specs found</Text>
      </Stack>
    );
  }

  return (
    <Group align="stretch" h="calc(100vh - 80px)" gap={0} wrap="nowrap">
      {/* Spec list */}
      <Box w={240} style={{ borderRight: "1px solid var(--mantine-color-default-border)", flexShrink: 0 }}>
        <ScrollArea h="100%">
          <Stack gap="xs" p="xs" pb="sm" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
            <FilterChips label="ctx" values={contexts} active={filterContext} onToggle={setFilterContext} />
            <FilterChips label="mod" values={modules} active={filterModule} onToggle={setFilterModule} />
            <FilterChips label="agg" values={aggregates} active={filterAggregate} onToggle={setFilterAggregate} />
          </Stack>
          <Stack gap={0}>
            {filteredNames.map((name) => {
              const spec = specs[name];
              const lint = lintBySpec[name];
              const isActive = name === selected;
              return (
                <Group
                  key={name}
                  px="sm"
                  py="xs"
                  gap="xs"
                  wrap="nowrap"
                  onClick={() => setSelected(name)}
                  style={{
                    cursor: "pointer",
                    background: isActive ? "var(--mantine-color-blue-light)" : undefined,
                    borderBottom: "1px solid var(--mantine-color-default-border)",
                  }}
                >
                  <Box
                    w={8} h={8}
                    style={{
                      borderRadius: "50%",
                      background: spec.type === "outcome"
                        ? "var(--mantine-color-orange-6)"
                        : "var(--mantine-color-blue-6)",
                      flexShrink: 0,
                    }}
                  />
                  <Text size="sm" truncate style={{ flex: 1 }}>{name}</Text>
                  {lint && lint.errors > 0 && (
                    <Badge size="xs" circle color="red">{lint.errors}</Badge>
                  )}
                  {lint && lint.errors === 0 && lint.warnings > 0 && (
                    <Badge size="xs" circle color="yellow">{lint.warnings}</Badge>
                  )}
                </Group>
              );
            })}
          </Stack>
        </ScrollArea>
      </Box>

      {/* Spec detail */}
      <Box style={{ flex: 1 }}>
        <ScrollArea h="100%">
          <Box p="lg" maw={700}>
            {selected && specs[selected] ? (
              <SpecDetail name={selected} spec={specs[selected]} />
            ) : (
              <Text c="dimmed" size="sm">Select a spec</Text>
            )}
          </Box>
        </ScrollArea>
      </Box>

      {/* Lint panel */}
      <Box w={500} style={{ borderLeft: "1px solid var(--mantine-color-default-border)", flexShrink: 0 }}>
        <ScrollArea h="100%">
          <LintPanel results={lintResults} />
        </ScrollArea>
      </Box>
    </Group>
  );
}
