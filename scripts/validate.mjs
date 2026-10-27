/**
 * Checks every skill against the Agent Skills spec (https://agentskills.io/specification) plus this
 * repo's conventions, and checks that the Claude Code marketplace lists exactly the skills on disk.
 * Exits non-zero if anything fails.
 */
import { readFileSync, readdirSync, lstatSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { loadSkills, repoRoot } from './lib/skills.mjs';

const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PREFIX = 'openmrs-';
// Skills are often downloaded without the rest of the repo, so each one names its license
const LICENSE =
  'MPL-2.0 with Healthcare Disclaimer (https://github.com/openmrs/openmrs-contrib-ai-skills/blob/main/LICENSE)';

const skills = loadSkills();
const failures = [];

for (const skill of skills) {
  const errors = [...skill.errors];
  const { name, description, license, metadata } = skill.frontmatter;

  if (typeof name !== 'string' || !name) {
    errors.push('frontmatter `name` is required');
  } else {
    if (name.length > 64) errors.push('`name` must be at most 64 characters');
    if (!NAME_PATTERN.test(name)) errors.push('`name` must be lowercase letters, digits and single hyphens');
    if (!name.startsWith(PREFIX)) errors.push(`\`name\` must start with "${PREFIX}"`);
    if (name !== skill.dirName) errors.push(`\`name\` "${name}" must match its directory name`);
  }

  if (typeof description !== 'string' || !description.trim()) {
    errors.push('frontmatter `description` is required');
  } else if (description.length > 1024) {
    errors.push('`description` must be at most 1024 characters');
  }

  if (license !== LICENSE) {
    errors.push(`\`license\` must be "${LICENSE}"`);
  }

  if (typeof metadata?.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(metadata.version)) {
    errors.push('`metadata.version` must be a quoted semver string, e.g. "1.0.0"');
  }

  errors.push(...checkSelfContained(skill));

  if (errors.length) failures.push(`${skill.dirName}:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
}

failures.push(...checkMarketplace(skills.map((s) => s.dirName)));

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`${skills.length} skill(s) valid`);

/**
 * Skills are downloaded one directory at a time, so nothing in a skill may point outside it:
 * no symlinks, and no relative Markdown links that escape the directory or point at missing files.
 */
function checkSelfContained(skill) {
  const errors = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) errors.push(`symlinks are not allowed: ${relative(skill.dir, path)}`);
      else if (stat.isDirectory()) walk(path);
    }
  };
  walk(skill.dir);

  for (const [, target] of skill.body.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^[a-z]+:/i.test(target) || target.startsWith('#')) continue;
    const resolved = resolve(skill.dir, target.split('#')[0]);
    if (relative(skill.dir, resolved).startsWith('..')) {
      errors.push(`link escapes the skill directory: ${target}`);
    } else if (!existsSync(resolved)) {
      errors.push(`link target does not exist: ${target}`);
    }
  }
  return errors;
}

function checkMarketplace(skillNames) {
  const file = join(repoRoot, '.claude-plugin', 'marketplace.json');
  const marketplace = JSON.parse(readFileSync(file, 'utf8'));
  const errors = [];
  const listed = new Set();

  for (const plugin of marketplace.plugins ?? []) {
    listed.add(plugin.name);
    const expected = `./skills/${plugin.name}`;
    if (!skillNames.includes(plugin.name)) {
      errors.push(`marketplace.json lists "${plugin.name}" but skills/${plugin.name} does not exist`);
    } else if (plugin.source !== expected) {
      // Pointing the source at the skill directory keeps each install to just that skill
      errors.push(`marketplace.json entry "${plugin.name}" must have "source": "${expected}"`);
    }
  }
  for (const name of skillNames) {
    if (!listed.has(name)) errors.push(`skills/${name} is missing from .claude-plugin/marketplace.json`);
  }
  return errors;
}
