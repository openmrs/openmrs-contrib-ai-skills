# Creating OpenMRS tickets with the Jira REST API

Use this when no Jira MCP server is available. It needs two environment variables:

- `JIRA_EMAIL`: the Atlassian account email of the person filing the ticket
- `JIRA_API_TOKEN`: an API token created at https://id.atlassian.com/manage-profile/security/api-tokens

Never print the token or write it to a file.

These examples use the v2 API because it accepts the description as a plain wiki markup string. The v3 API requires Atlassian Document Format (ADF) JSON instead.

## Useful lookups

```sh
# Projects the user can see
curl -sf -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "https://openmrs.atlassian.net/rest/api/2/project" | jq -r '.[] | "\(.key)\t\(.name)"'

# Issue types valid for a project
curl -sf -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "https://openmrs.atlassian.net/rest/api/2/project/TRUNK" | jq -r '.issueTypes[].name'

# The user's own account id (only needed to self-assign)
curl -sf -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "https://openmrs.atlassian.net/rest/api/2/myself" | jq -r .accountId
```

## Creating the issue

Build the body with `jq` so the description is escaped correctly:

```sh
jq -n \
  --arg project "TRUNK" \
  --arg type "Task" \
  --arg summary "Add shortName property to the Concept resource" \
  --arg priority "Should" \
  --arg description "$DESCRIPTION_WIKI" \
  '{fields: {
     project: {key: $project},
     issuetype: {name: $type},
     summary: $summary,
     priority: {name: $priority},
     labels: [],
     description: $description
   }}' \
| curl -sf -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
    -H "Content-Type: application/json" \
    -X POST --data @- \
    "https://openmrs.atlassian.net/rest/api/2/issue" | jq -r .key
```

Omit `priority` if the user declined to set one. To assign, add `assignee: {id: "<accountId>"}`.

The issue URL is `https://openmrs.atlassian.net/browse/<KEY>`.

## Markdown to wiki markup

The description must be Jira wiki markup for the v2 API. Convert the draft:

| Markdown | Wiki markup |
| --- | --- |
| `## Heading` | `h2. Heading` |
| `- item` | `* item` |
| `1. item` | `# item` |
| `` `code` `` | `{{code}}` |
| fenced code block | `{code:java}` ... `{code}` (or `{noformat}` ... `{noformat}`) |
| `**bold**` | `*bold*` |
| `[text](url)` | `[text\|url]` |
