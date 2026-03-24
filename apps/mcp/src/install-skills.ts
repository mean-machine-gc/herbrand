/**
 * Copy skills from the MCP server into the project's platform-specific skills directories.
 *
 * Targets: .claude/skills, .opencode/skills, .github/skills, .cursor/skills
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_SOURCE = join(__dirname, 'skills');

const SKILL_DIRS = [
  '.claude/skills',
  '.opencode/skills',
  '.github/skills',
  '.cursor/skills',
];

export function installSkills(projectDir: string, platform?: string): string[] {
  if (!existsSync(SKILLS_SOURCE)) {
    return ['Skills source directory not found'];
  }

  // If platform specified, only install to that one
  const targets = platform
    ? SKILL_DIRS.filter(d => d.startsWith(`.${platform}`))
    : SKILL_DIRS;

  const installed: string[] = [];

  for (const targetRel of targets) {
    const targetDir = join(projectDir, targetRel);

    // Read each skill .md file and create a skill directory with SKILL.md
    for (const entry of readdirSync(SKILLS_SOURCE)) {
      if (!entry.endsWith('.md')) continue;
      const skillName = `herbrand-${entry.replace('.md', '')}`;
      const skillDir = join(targetDir, skillName);
      mkdirSync(skillDir, { recursive: true });

      const content = readFileSync(join(SKILLS_SOURCE, entry), 'utf-8');
      writeFileSync(join(skillDir, 'SKILL.md'), content);
      installed.push(`${targetRel}/${skillName}/SKILL.md`);
    }
  }

  return installed;
}
