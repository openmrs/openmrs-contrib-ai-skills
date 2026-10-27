# Contributing a skill

## Layout

```
skills/
  openmrs-<skill-name>/
    SKILL.md          # required
    references/       # optional: docs the agent reads on demand
    scripts/          # optional: code the agent can run
    assets/           # optional: templates and other static files
```

Follow the [Agent Skills specification](https://agentskills.io/specification). On top of that, this repository requires:

- **Names start with `openmrs-`** and match the directory name. Skills from many sources end up in one folder on a user's machine, so the prefix avoids collisions.
- **Skills are self-contained.** People download one skill directory at a time, so a skill must not reference files outside its own directory or use symlinks. If two skills need the same reference material, copy it into both.
- **Skills are agent-neutral.** Write instructions that any agent can follow. Don't name tools specific to one agent or one MCP server (e.g. `AskUserQuestion`, `mcp__jira__createJiraIssue`); describe what to do and let the agent pick its own tools. Avoid agent-specific frontmatter such as `allowed-tools`.
- **Licensing.** Everything here is licensed under the [MPL 2.0 with the Healthcare Disclaimer](LICENSE). Each skill states this in its `license` field because skills are often downloaded without the rest of the repository.
- **`metadata.version`** is a quoted semver string. Bump it whenever you change the skill.
- **Outward-facing actions need approval.** A skill that creates tickets, posts comments, pushes code, etc. must have the agent show the user what it will do and wait for confirmation.

Minimal frontmatter:

```yaml
---
name: openmrs-example
description: What the skill does and when an agent should use it. Agents decide whether to load the skill from this text alone, so name the situations that should trigger it.
license: MPL-2.0 with Healthcare Disclaimer (https://github.com/openmrs/openmrs-contrib-ai-skills/blob/main/LICENSE)
metadata:
  version: "1.0.0"
---
```

## Adding a skill

1. Create `skills/openmrs-<name>/SKILL.md`.
2. Add an entry to [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json):
   ```json
   {
     "name": "openmrs-<name>",
     "description": "One-line summary",
     "source": "./skills/openmrs-<name>"
   }
   ```
3. Add yourself as an owner of the skill in [`.github/CODEOWNERS`](.github/CODEOWNERS).
4. Add a row to the table in the [README](README.md).
5. Run `npm ci && npm run validate`.
