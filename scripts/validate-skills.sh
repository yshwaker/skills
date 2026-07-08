#!/usr/bin/env bash
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"

cd "$REPO"

if [ ! -f ".claude-plugin/plugin.json" ]; then
  echo "error: missing .claude-plugin/plugin.json" >&2
  exit 1
fi

node <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

function fail(message) {
  console.error(`error: ${message}`);
  process.exitCode = 1;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`${file} is not valid JSON: ${error.message}`);
    return {};
  }
}

const plugin = readJson(".claude-plugin/plugin.json");
if (!plugin.name || typeof plugin.name !== "string") {
  fail(".claude-plugin/plugin.json must include a string name");
}

if (!Array.isArray(plugin.skills)) {
  fail(".claude-plugin/plugin.json must include a skills array");
} else {
  for (const skillPath of plugin.skills) {
    const normalized = skillPath.replace(/^\.\//, "");
    const skillMd = path.join(normalized, "SKILL.md");
    if (!fs.existsSync(skillMd)) {
      fail(`plugin skill path is missing SKILL.md: ${skillPath}`);
    }
  }
}

const skillFiles = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "deprecated") walk(full);
    } else if (entry.name === "SKILL.md") {
      skillFiles.push(full);
    }
  }
}
walk("skills");

const declared = new Set((plugin.skills || []).map((p) => p.replace(/^\.\//, "")));
for (const skillFile of skillFiles) {
  const skillDir = path.dirname(skillFile);
  const text = fs.readFileSync(skillFile, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    fail(`${skillFile} is missing YAML frontmatter`);
    continue;
  }

  const name = match[1].match(/^name:\s*["']?([^"'\n]+)["']?\s*$/m)?.[1]?.trim();
  const description = match[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();
  const dirname = path.basename(skillDir);

  if (!name) fail(`${skillFile} frontmatter is missing name`);
  if (!description) fail(`${skillFile} frontmatter is missing description`);
  if (name && name !== dirname) fail(`${skillFile} name "${name}" must match directory "${dirname}"`);
  if (!declared.has(skillDir)) fail(`${skillDir} is not listed in .claude-plugin/plugin.json`);
}

NODE

if [ "${PIPESTATUS[0]}" -ne 0 ]; then
  exit 1
fi

echo "validated skills metadata"
