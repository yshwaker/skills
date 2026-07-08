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

## 技能

### `apifox-api-docs`

通过内置的 Apifox CLI 辅助脚本，按 Apifox projectId 和接口路径读取接口文档。

适用于让 agent：

- 按接口路径和可选 HTTP 方法查找接口。
- 总结请求参数、响应 schema、标签、状态和更新时间。
- 展开请求体和响应体中引用的 Apifox schema。
- 基于后端接口契约实现前端或客户端代码。

Apifox projectId 可以直接在 prompt 中提供，也可以通过 `APIFOX_PROJECT_ID` 设置，或记录在使用该技能的项目 `AGENTS.md` 中：

```markdown
Apifox projectId: <project_id>
```

## 安装

安装这个仓库中的所有技能：

```bash
npx skills@latest add yshwaker/skills
```

或只把 `apifox-api-docs` 安装到 `~/.agents/skills`：

```bash
curl -fsSL https://raw.githubusercontent.com/yshwaker/skills/main/scripts/install-skill.sh \
  | bash -s -- yshwaker/skills apifox-api-docs
```

安装到其他技能目录：

```bash
curl -fsSL https://raw.githubusercontent.com/yshwaker/skills/main/scripts/install-skill.sh \
  | bash -s -- yshwaker/skills apifox-api-docs --dest "$HOME/.claude/skills"
```

## 配置

安装 Apifox CLI：

```bash
npm install -g apifox-cli
```

登录 Apifox：

```bash
apifox login --access-token <access_token>
```

或使用环境变量：

```bash
export APIFOX_ACCESS_TOKEN=<access_token>
export APIFOX_PROJECT_ID=<project_id>
```
