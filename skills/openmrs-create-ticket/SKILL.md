---
name: openmrs-create-ticket
description: Create a well-structured OpenMRS Jira ticket. Use when the user wants to file, create, open, or draft an OpenMRS issue/ticket (bug, task, story, enhancement) in the OpenMRS Jira. Drafts a concise background-change-acceptance-criteria description, prompts for project/type/priority/labels, and creates it via whatever Jira access is available (a Jira MCP server or the Jira REST API) after the user approves.
license: MPL-2.0 with Healthcare Disclaimer (https://github.com/openmrs/openmrs-contrib-ai-skills/blob/main/LICENSE)
metadata:
  version: "1.0.0"
---

# Create an OpenMRS Ticket

Draft a well-structured OpenMRS Jira ticket from the user's rough description, then create it **only after the user approves the full draft**.

OpenMRS Jira is Atlassian Cloud at `https://openmrs.atlassian.net`. Issue links have the form `https://openmrs.atlassian.net/browse/<KEY>`.

## Choosing how to talk to Jira

Use the first of these that is available:

1. **A Jira MCP server** that can reach `openmrs.atlassian.net`, such as Atlassian's Rovo MCP server or a community Jira MCP server. Tool names differ between servers (e.g. `createJiraIssue`, `getVisibleJiraProjects`, `atlassianUserInfo` or `getMyself`); pick the tools by what they do. Check the create tool's schema for the description format it expects: some accept Markdown and convert it, others want Jira wiki markup or ADF.
2. **The Jira REST API** when `JIRA_EMAIL` and `JIRA_API_TOKEN` are set in the environment. See [references/jira-rest-api.md](references/jira-rest-api.md) for the calls and the wiki markup conversion.

If neither is available, finish the draft anyway and give it to the user to paste into Jira themselves, along with a short note on how to set up one of the options above.

## Workflow

1. **Gather the intent.** Take whatever the user described. If the core *why* or *what* is unclear, ask one or two focused questions; don't interrogate. You are drafting on their behalf, so infer reasonable detail from the codebase and context rather than asking for everything.

2. **Draft the description** following the structure below. Keep it concise: enough context to act, no padding. Do **not** dump large code blocks, line numbers, or file-by-file breakdowns into the ticket. A short illustrative snippet is fine when it genuinely clarifies; a wall of code is not.

3. **Ask for metadata**, offering choices where your agent supports them:
   - **Project**: if not obvious from context, list the visible projects and let the user pick. Common ones: `TRUNK` (Core), `RESTWS` (REST web services), `RA` (Reference Application), `O3` (3.x frontend), `OCLOMRS`, `FM` (FHIR).
   - **Issue type**: Bug, Task, Story, Enhancement, New Feature. Default to Task for changes, Bug for defects.
   - **Priority**: always ask. OpenMRS Jira uses the **MoSCoW** scale; use one of these exact names: `Won't`, `Could`, `Should`, `Must` (roughly Trivial/Minor through Major/Blocker). Leave unset only if the user declines.
   - **Labels**: offer to add labels (e.g. `community-priority`); none unless the user wants them.
   - **Assignee**: leave **unassigned** by default. Only set an assignee if the user asks; to assign to the user, look up their own account id first.

4. **Show the complete draft** (project, type, priority, labels, summary, and the full description) and ask the user to confirm. Creating a ticket is outward-facing and hard to reverse, so never create without explicit approval.

5. **Create the issue** and report the created issue key and URL back to the user.

## Description structure

Use these sections. Omit a section only when it genuinely adds nothing.

```
## Background
Why this change is needed. Concise: the problem or gap and who it affects.
State the current behavior and why it is insufficient. A few sentences, not an essay.

## Requested change
What should change, stated clearly enough to implement. Describe the desired
behavior and any constraints (e.g. backwards compatibility, which representations,
which supported versions). Avoid prescribing internal implementation detail unless
it is part of the requirement.

## Acceptance criteria
- A minimal, checkable set of conditions that define "done".
- Each item is observable/verifiable, not a restatement of the change.
- ALWAYS include appropriate automated testing as an explicit criterion: name
  what the tests must cover (the new behavior, edge cases, and the regression
  being prevented), and where they live when known (e.g. unit tests under
  omod/src/test/).
```

Keep acceptance criteria minimal: cover the behavior and its key edge cases, plus the testing requirement. Don't enumerate every conceivable case.

## Style guidance

- **Concise but complete**, like [RESTWS-1029](https://openmrs.atlassian.net/browse/RESTWS-1029). Explain the *why* in a sentence or two, the *what* clearly, and the *acceptance criteria* tightly.
- **Too verbose** (avoid): [TRUNK-6646](https://openmrs.atlassian.net/browse/TRUNK-6646), with multiple code excerpts with line numbers and an exhaustive breakdown of internals.
- **Too sparse** (avoid): [TRUNK-6644](https://openmrs.atlassian.net/browse/TRUNK-6644), a one-line description with no acceptance criteria and no testing requirement.
- Summary line: a specific, action-oriented title (e.g. "Add shortName property to the Concept resource"), not a vague label.
