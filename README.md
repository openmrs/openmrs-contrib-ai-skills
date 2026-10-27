# OpenMRS AI Skills

Agent skills for working with OpenMRS. Each skill is a self-contained directory under [`skills/`](skills/) in the [Agent Skills](https://agentskills.io) format, so it works with Claude Code, Claude.ai, Codex, Cursor, Gemini CLI, GitHub Copilot and other agents that support `SKILL.md`.

A catalog of every skill is published at https://skills.openmrs.org/ (machine-readable at [`index.json`](https://skills.openmrs.org/index.json)).

## Skills

| Skill | Description |
| --- | --- |
| [`openmrs-create-ticket`](skills/openmrs-create-ticket/) | Draft and file a well-structured OpenMRS Jira ticket |
| [`openmrs-pr-review`](skills/openmrs-pr-review/) | Review a GitHub pull request with verified findings and concise inline comments |

## Installing a single skill

Pick whichever fits your tools. None of these require cloning the whole repository.

### Any agent, with the `skills` CLI

```sh
npx skills add openmrs/openmrs-contrib-ai-skills --skill openmrs-create-ticket
```

### Claude Code plugin marketplace

```
/plugin marketplace add openmrs/openmrs-contrib-ai-skills
/plugin install openmrs-create-ticket@openmrs
```

Each skill is its own plugin, so you only get the ones you install.

### Claude.ai or Claude Desktop

Download `https://skills.openmrs.org/<skill-name>.zip` and upload it under **Settings > Capabilities > Skills**.

### Copy the directory

```sh
npx degit openmrs/openmrs-contrib-ai-skills/skills/openmrs-create-ticket ~/.claude/skills/openmrs-create-ticket
```

Replace `~/.claude/skills` with your agent's skills directory (e.g. `~/.agents/skills` or a project's `.claude/skills`).

## Using skills in GitHub Actions

This repository is also a composite action that copies skills into the workspace, where an agent run later in the job (e.g. [`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action)) picks them up:

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: openmrs/openmrs-contrib-ai-skills@main
    with:
      skills: openmrs-create-ticket
      # path: .agents/skills  # defaults to .claude/skills
  - uses: anthropics/claude-code-action@v1
    with:
      # ...
```

Pin to a commit SHA instead of `@main` if you need a fixed version.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MPL 2.0 with the Healthcare Disclaimer](LICENSE).
