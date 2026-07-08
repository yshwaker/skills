# Shihaoy Skills

Personal agent skills packaged as a GitHub repo.

This repo follows the layout used by `mattpocock/skills`: skills live under `skills/<category>/<skill-name>`, and install metadata is declared in `.claude-plugin/plugin.json`.

## Skills

- `apifox-api-docs` - Read and summarize Apifox API docs by project ID and endpoint path through the bundled Apifox CLI helper.

For repeat use in a project, record the project ID in that project's `AGENTS.md`:

```markdown
Apifox projectId: <project_id>
```

The skill also accepts project IDs directly from the user or through `APIFOX_PROJECT_ID`.

## Install From GitHub

After pushing this directory to GitHub, install it with the skills installer:

```bash
npx skills@latest add <github-owner>/<repo-name>
```

For a direct install into Agent Skills compatible locations:

```bash
curl -fsSL https://raw.githubusercontent.com/<github-owner>/<repo-name>/main/scripts/install-skill.sh \
  | bash -s -- <github-owner>/<repo-name> apifox-api-docs
```

By default the direct installer writes to `~/.agents/skills`. Override with `--dest`:

```bash
./scripts/install-skill.sh apifox-api-docs --dest "$HOME/.claude/skills"
```

## Local Development

List all skills:

```bash
./scripts/list-skills.sh
```

Symlink skills into local agent directories while developing:

```bash
./scripts/link-skills.sh
```

Validate repo metadata before committing:

```bash
./scripts/validate-skills.sh
```

## Add A Skill

1. Create `skills/<category>/<skill-name>/SKILL.md`.
2. Add optional `agents/openai.yaml`, `scripts/`, `references/`, or `assets/`.
3. Add the skill path to `.claude-plugin/plugin.json`.
4. Run `./scripts/validate-skills.sh`.

Keep each skill self-contained. Do not depend on the original project path after copying a skill into this repository.
