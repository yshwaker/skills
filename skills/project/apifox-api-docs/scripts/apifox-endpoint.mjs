#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

function printUsage() {
  console.log(`用法:
  node ~/.agents/skills/apifox-api-docs/scripts/apifox-endpoint.mjs find --path <接口路径> [--method GET] --project <project_id> [--branch main]
  node ~/.agents/skills/apifox-api-docs/scripts/apifox-endpoint.mjs get --path <接口路径> [--method GET] --project <project_id> [--branch main]

环境变量:
  APIFOX_PROJECT_ID=<project_id> 可代替 --project

说明:
  - 依赖本机已全局安装 apifox-cli，并能通过 apifox 命令访问。
  - 鉴权优先使用 APIFOX_ACCESS_TOKEN；如果未设置，则使用 apifox login 保存的本机登录态。
  - find 只输出命中的候选接口；get 会先精确匹配 path/method，再输出接口详情。
`);
}

function parseArgs(argv) {
  const args = {
    command: argv[2],
  };

  if (args.command === '--help' || args.command === '-h') {
    args.help = true;
  }

  for (let index = 3; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];

    if (key === '--help' || key === '-h') {
      args.help = true;
      continue;
    }

    if (!key.startsWith('--')) {
      continue;
    }

    if (value == null || value.startsWith('--')) {
      args[key.slice(2)] = true;
      continue;
    }

    args[key.slice(2)] = value;
    index += 1;
  }

  return args;
}

function normalizePath(path) {
  return String(path || '').replace(/^\/+/, '').trim();
}

function redactKnownSecrets(text) {
  let output = String(text || '');

  for (const secret of [process.env.APIFOX_ACCESS_TOKEN].filter(Boolean)) {
    output = output.split(secret).join('[REDACTED]');
  }

  return output;
}

function formatCommand(args) {
  return ['apifox', ...args]
    .map((arg, index, allArgs) => (allArgs[index - 1] === '--access-token' ? '[REDACTED]' : arg))
    .join(' ');
}

function runApifox(args) {
  const result = spawnSync('apifox', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.error?.code === 'ENOENT') {
    throw new Error('未找到全局 apifox 命令。请先运行：npm install -g apifox-cli');
  }

  if (result.status !== 0) {
    throw new Error(
      [
        `apifox 命令执行失败：${formatCommand(args)}`,
        redactKnownSecrets(result.stderr?.trim()),
        redactKnownSecrets(result.stdout?.trim()),
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  return result.stdout;
}

function extractJson(text) {
  const source = String(text || '').trim();
  const candidates = [source.indexOf('{'), source.indexOf('[')].filter((index) => index >= 0);
  const start = Math.min(...candidates);

  if (!Number.isFinite(start)) {
    throw new Error(`apifox 输出不是 JSON：${source.slice(0, 300)}`);
  }

  return JSON.parse(source.slice(start));
}

function toArray(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.items)) {
    return payload.data.items;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
}

function getEndpointId(endpoint) {
  return endpoint.entityId ?? endpoint.endpointId ?? endpoint.httpApiId ?? endpoint.apiDetailId ?? endpoint.id;
}

function simplifyEndpoint(endpoint) {
  return {
    id: getEndpointId(endpoint),
    name: endpoint.name,
    method: String(endpoint.method || '').toUpperCase(),
    path: normalizePath(endpoint.path),
    status: endpoint.status,
    folderId: endpoint.folderId,
    updatedAt: endpoint.updatedAt,
  };
}

function resolveProjectId(args) {
  const project = args.project ?? process.env.APIFOX_PROJECT_ID;

  if (typeof project !== 'string' || !project.trim()) {
    throw new Error(
      [
        '缺少 Apifox 项目 ID。',
        '请传入 --project <project_id>，或设置环境变量 APIFOX_PROJECT_ID。',
        '如果项目 ID 写在当前仓库的 AGENTS.md 中，请先读取它，再作为 --project 传给脚本。',
      ].join('\n'),
    );
  }

  return project.trim();
}

function buildCommonOptions(args) {
  const options = ['--project', resolveProjectId(args)];

  if (args.branch) {
    options.push('--branch', String(args.branch));
  }

  return options;
}

function listEndpoints(args) {
  const path = normalizePath(args.path);
  const command = ['endpoint', 'list', ...buildCommonOptions(args), '--path-contains', path];

  if (args.method) {
    command.push('--method', String(args.method).toUpperCase());
  }

  const payload = extractJson(runApifox(command));
  const method = args.method ? String(args.method).toUpperCase() : '';

  return toArray(payload)
    .map(simplifyEndpoint)
    .filter((endpoint) => endpoint.path === path)
    .filter((endpoint) => !method || endpoint.method === method);
}

function getEndpoint(args, endpointId) {
  const payload = extractJson(
    runApifox(['endpoint', 'get', String(endpointId), ...buildCommonOptions(args)]),
  );

  return payload?.data ?? payload;
}

function getSchema(args, schemaId) {
  const payload = extractJson(runApifox(['schema', 'get', String(schemaId), ...buildCommonOptions(args)]));

  return payload?.data ?? payload;
}

function getDefinitionId(ref) {
  const match = String(ref || '').match(/^#\/definitions\/(\d+)$/);
  return match?.[1] ?? null;
}

function collectDefinitionIds(input, target = new Set()) {
  if (!input || typeof input !== 'object') {
    return target;
  }

  if (Array.isArray(input)) {
    input.forEach((item) => collectDefinitionIds(item, target));
    return target;
  }

  const id = getDefinitionId(input.$ref);
  if (id) {
    target.add(id);
  }

  Object.values(input).forEach((value) => collectDefinitionIds(value, target));
  return target;
}

function collectEndpointSchemaRoots(detail) {
  const roots = [];
  const requestBody = detail?.requestBody;

  function pushRoot(schema) {
    if (schema) {
      roots.push(schema);
    }
  }

  for (const response of detail?.responses ?? []) {
    pushRoot(response?.jsonSchema);
    pushRoot(response?.itemSchema);
  }

  pushRoot(requestBody?.jsonSchema);
  pushRoot(requestBody?.schema);
  pushRoot(requestBody?.itemSchema);

  if (requestBody?.content && typeof requestBody.content === 'object') {
    for (const content of Object.values(requestBody.content)) {
      pushRoot(content?.jsonSchema);
      pushRoot(content?.schema);
      pushRoot(content?.itemSchema);
    }
  }

  const requestParameterSchemas = requestBody?.parameters
    ?.flatMap((parameter) => [parameter?.jsonSchema, parameter?.schema, parameter?.itemSchema])
    .filter(Boolean) ?? [];
  roots.push(...requestParameterSchemas);

  return roots;
}

function resolveDefinitions(args, detail) {
  const definitions = {};
  const queue = [...collectDefinitionIds(collectEndpointSchemaRoots(detail))];
  const visited = new Set();
  const errors = [];

  while (queue.length > 0) {
    const schemaId = queue.shift();
    if (!schemaId || visited.has(schemaId)) {
      continue;
    }
    visited.add(schemaId);

    try {
      const schema = getSchema(args, schemaId);
      definitions[schemaId] = {
        id: schema.id ?? Number(schemaId),
        name: schema.name,
        displayName: schema.displayName,
        jsonSchema: schema.jsonSchema,
      };

      for (const nextId of collectDefinitionIds(schema.jsonSchema)) {
        if (!visited.has(nextId)) {
          queue.push(nextId);
        }
      }
    } catch (error) {
      errors.push({
        id: schemaId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { definitions, definitionErrors: errors };
}

function main() {
  const args = parseArgs(process.argv);

  if (args.help || !args.command) {
    printUsage();
    return;
  }

  if (!['find', 'get'].includes(args.command)) {
    throw new Error(`未知命令：${args.command}`);
  }

  if (!args.path) {
    throw new Error('缺少参数：--path <接口路径>');
  }

  const endpoints = listEndpoints(args);

  if (args.command === 'find') {
    console.log(JSON.stringify({ count: endpoints.length, endpoints }, null, 2));
    return;
  }

  if (endpoints.length === 0) {
    throw new Error(`未找到接口：${args.method ? `${String(args.method).toUpperCase()} ` : ''}${normalizePath(args.path)}`);
  }

  if (endpoints.length > 1) {
    console.log(JSON.stringify({ error: 'MULTIPLE_ENDPOINTS', count: endpoints.length, endpoints }, null, 2));
    process.exitCode = 2;
    return;
  }

  const endpoint = endpoints[0];
  const detail = getEndpoint(args, endpoint.id);
  const { definitions, definitionErrors } = resolveDefinitions(args, detail);

  console.log(JSON.stringify({ endpoint, detail, definitions, definitionErrors }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
