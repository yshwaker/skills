## Skills

### `apifox-api-docs`

Reads Apifox API documentation by project ID and endpoint path through the bundled Apifox CLI helper.

Use it when you need an agent to:

- Find an endpoint by path and optional method.
- Summarize request parameters, response schema, tags, status, and update time.
- Expand referenced Apifox schemas used by request and response bodies.
- Implement frontend or client code against the documented backend contract.

The Apifox project ID can be provided directly in the prompt, through `APIFOX_PROJECT_ID`, or recorded in the consuming project's `AGENTS.md`:

```markdown
Apifox projectId: <project_id>
```

## Install

Install all skills from this repo:

```bash
npx skills@latest add yshwaker/skills
```

Or install only `apifox-api-docs` directly into `~/.agents/skills`:

```bash
curl -fsSL https://raw.githubusercontent.com/yshwaker/skills/main/scripts/install-skill.sh \
  | bash -s -- yshwaker/skills apifox-api-docs
```

To install into another skills directory:

```bash
curl -fsSL https://raw.githubusercontent.com/yshwaker/skills/main/scripts/install-skill.sh \
  | bash -s -- yshwaker/skills apifox-api-docs --dest "$HOME/.claude/skills"
```

## Setup

Install the Apifox CLI:

```bash
npm install -g apifox-cli
```

Authenticate with Apifox:

```bash
apifox login --access-token <access_token>
```

Or use environment variables:

```bash
export APIFOX_ACCESS_TOKEN=<access_token>
export APIFOX_PROJECT_ID=<project_id>
```
