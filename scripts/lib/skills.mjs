import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const skillsDir = join(repoRoot, 'skills');

/**
 * Reads every directory under `skills/` and parses its `SKILL.md` frontmatter.
 *
 * Never throws for a malformed skill: problems are reported in each entry's `errors` array so
 * callers can report every broken skill at once.
 *
 * @returns One entry per skill directory, sorted by directory name
 */
export function loadSkills() {
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((dirName) => {
      const dir = join(skillsDir, dirName);
      const skillFile = join(dir, 'SKILL.md');
      const skill = { dirName, dir, frontmatter: {}, body: '', errors: [] };

      if (!existsSync(skillFile)) {
        skill.errors.push('missing SKILL.md');
        return skill;
      }

      const match = readFileSync(skillFile, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
      if (!match) {
        skill.errors.push('SKILL.md must start with YAML frontmatter delimited by ---');
        return skill;
      }

      try {
        skill.frontmatter = parse(match[1]) ?? {};
      } catch (e) {
        skill.errors.push(`invalid frontmatter YAML: ${e.message}`);
      }
      skill.body = match[2];
      return skill;
    });
}
