---
name: apifox-api-docs
description: 读取并总结任意 Apifox 项目的接口文档；查询接口时使用本 skill 的 Apifox CLI 固定脚本按路径定位并读取接口定义。适用于用户提供 Apifox projectId、当前仓库 AGENTS.md 记录 Apifox projectId，或需要查询、检查、总结接口路径、请求参数、响应 schema、后端契约并据此实现代码。
---

# Apifox API Docs

## 项目信息

- Apifox 项目 ID 不写死在 skill 中。每次查询前先解析目标项目 ID。
- 默认使用主分支，除非用户明确指定其他分支。
- 查询接口定义时，只使用本 skill 内的固定脚本 `scripts/apifox-endpoint.mjs`，避免把全量接口列表塞进上下文。
- 运行脚本时先定位当前 skill 目录。常见安装位置包括 `~/.agents/skills/apifox-api-docs`、`~/.claude/skills/apifox-api-docs`，或仓库内 `skills/project/apifox-api-docs`。

## 环境要求

本 skill 的查询路径依赖本机全局安装的 Apifox CLI：

```bash
npm install -g apifox-cli
```

鉴权任选其一：

```bash
apifox login --access-token <access_token>
```

或设置环境变量：

```bash
export APIFOX_ACCESS_TOKEN=<access_token>
```

可选地设置默认项目 ID：

```bash
export APIFOX_PROJECT_ID=<project_id>
```

不要编造 token。如果脚本提示未登录或没有权限，要求用户补充 `APIFOX_ACCESS_TOKEN` 或先执行 `apifox login`。

## 解析项目 ID

查询前按顺序确定 Apifox 项目 ID：

1. 如果用户直接说明 projectId 或 project ID，使用用户给出的值。
2. 如果当前仓库的 `AGENTS.md`、上级目录 `AGENTS.md` 或同类项目说明中记录了 Apifox projectId，读取后使用该值。
3. 如果环境变量 `APIFOX_PROJECT_ID` 已设置，可以省略 `--project`。
4. 如果仍无法确定，先询问用户要查询哪个 Apifox projectId；不要使用猜测值。

推荐在使用该 skill 的项目 `AGENTS.md` 中记录：

```markdown
Apifox projectId: <project_id>
```

## 查询接口定义

收到接口路径查询请求时，按以下流程执行。

1. 确定 Apifox 项目 ID，并记为 `<project_id>`。
2. 规范化目标路径。
   - 去掉开头 `/`，例如 `/uic/user/guides/v1/get` 视为 `uic/user/guides/v1/get`。
   - 如果用户给了方法，转成大写，如 `GET`。
   - 如果用户没有给方法，先按路径查询；如果命中多个方法，列出候选项并要求用户指定方法。
3. 调用项目脚本定位并读取接口。

```bash
node ~/.agents/skills/apifox-api-docs/scripts/apifox-endpoint.mjs get --project <project_id> --path uic/user/guides/v1/get --method GET
```

脚本行为：

- 调用全局 `apifox endpoint list --project <project_id> --path-contains <path> --method <method>`。
- 在本地精确过滤 `path` 和 `method`。
- 唯一命中后调用 `apifox endpoint get <endpointId> --project <project_id>`。
- 自动扫描接口请求与响应中的 `#/definitions/<schemaId>` 引用，并递归调用 `apifox schema get <schemaId> --project <project_id>` 补全数据模型。
- 只输出命中接口和接口详情，避免输出全量接口列表。
- `get` 输出结构包含：
  - `endpoint`：命中的接口摘要。
  - `detail`：接口详情。
  - `definitions`：递归补全的数据模型，key 为 schema id，value 包含 `name`、`displayName`、`jsonSchema`。
  - `definitionErrors`：个别 schema 拉取失败时的错误列表；为空表示当前可追踪引用都已补全。

4. 如果不确定方法，先用 `find`。

```bash
node ~/.agents/skills/apifox-api-docs/scripts/apifox-endpoint.mjs find --project <project_id> --path uic/user/guides/v1/get
```

5. 如果用户指定分支，将分支透传给脚本。

```bash
node ~/.agents/skills/apifox-api-docs/scripts/apifox-endpoint.mjs get --project <project_id> --path uic/user/guides/v1/get --method GET --branch main
```

6. 从脚本输出中总结接口定义。
   - 包含方法、路径、名称或 summary、标签、状态、更新时间。
   - 请求参数列出名称、位置、是否必填、类型、说明。
   - 响应 schema 使用脚本输出的 `detail.responses`、`jsonSchema`、`definitions` 等字段展开本地 `$ref`。
   - 遇到 `#/definitions/<id>` 时，先在脚本输出的 `definitions[id].jsonSchema` 中查找；不要只停留在 endpoint 里的 `$ref`。
   - 如果 `definitionErrors` 非空，或某个 `$ref` 在 `definitions` 中缺失，明确说明缺失信息和缺失的 schema id。
   - TypeScript 形状中不要使用 `any`；不确定结构使用 `unknown` 或 `Record<string, unknown>`。

## 输出格式

快速查询时保持紧凑：

````text
GET /path

名称：...
标签：...
状态：...
更新时间：...

请求参数：
| 参数 | 位置 | 必填 | 类型 | 说明 |

200 响应：
```ts
interface Response {
  ...
}
```
````

如果用户要求实现代码，按项目现有请求模式转换，优先贴近已有 `useQuery` 或 `useMutation` 写法，并让 TypeScript 类型与 Apifox 响应保持一致。

## 更新文档

只有用户明确要求创建、更新或删除 Apifox 文档时才修改文档。

修改前先读取当前完整接口定义，再基于完整结构修改后提交。不要凭经验构造 payload；如果使用 Apifox CLI 写入命令，先按 CLI 提示运行 `apifox cli-schema get ...` 和 `apifox cli-schema validate ...`。
