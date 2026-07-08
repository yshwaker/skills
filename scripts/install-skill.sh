#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/install-skill.sh <skill-name> [--dest <path>] [--force]
  scripts/install-skill.sh <owner/repo> <skill-name> [--ref main] [--dest <path>] [--force]

Examples:
  ./scripts/install-skill.sh apifox-api-docs
  curl -fsSL https://raw.githubusercontent.com/OWNER/REPO/main/scripts/install-skill.sh \
    | bash -s -- OWNER/REPO apifox-api-docs
USAGE
}

DEST="$HOME/.agents/skills"
REF="main"
FORCE=0
POSITIONAL=()

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dest)
      [ "${2:-}" ] || { echo "error: --dest requires a path" >&2; exit 1; }
      DEST="$2"
      shift 2
      ;;
    --ref)
      [ "${2:-}" ] || { echo "error: --ref requires a branch or tag" >&2; exit 1; }
      REF="$2"
      shift 2
      ;;
    --force)
      FORCE=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      POSITIONAL+=("$1")
      shift
      ;;
  esac
done

REPO_ARG=""
SKILL_NAME=""
if [ "${#POSITIONAL[@]}" -eq 1 ]; then
  SKILL_NAME="${POSITIONAL[0]}"
elif [ "${#POSITIONAL[@]}" -eq 2 ]; then
  REPO_ARG="${POSITIONAL[0]}"
  SKILL_NAME="${POSITIONAL[1]}"
else
  usage >&2
  exit 1
fi

TMPDIR_CREATED=""
cleanup() {
  if [ -n "$TMPDIR_CREATED" ]; then
    rm -rf "$TMPDIR_CREATED"
  fi
}
trap cleanup EXIT

if [ -n "$REPO_ARG" ]; then
  case "$REPO_ARG" in
    */*) ;;
    *)
      echo "error: repo must be in owner/repo form" >&2
      exit 1
      ;;
  esac

  TMPDIR_CREATED="$(mktemp -d)"
  url="https://github.com/$REPO_ARG/archive/refs/heads/$REF.tar.gz"
  if ! curl -fsSL "$url" | tar -xz -C "$TMPDIR_CREATED"; then
    url="https://github.com/$REPO_ARG/archive/refs/tags/$REF.tar.gz"
    curl -fsSL "$url" | tar -xz -C "$TMPDIR_CREATED"
  fi
  SOURCE_ROOT="$(find "$TMPDIR_CREATED" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
else
  SOURCE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fi

matches=()
while IFS= read -r -d '' skill_md; do
  skill_dir="$(dirname "$skill_md")"
  if [ "$(basename "$skill_dir")" = "$SKILL_NAME" ]; then
    matches+=("$skill_dir")
  fi
done < <(find "$SOURCE_ROOT/skills" -name SKILL.md -not -path '*/node_modules/*' -not -path '*/deprecated/*' -print0)

if [ "${#matches[@]}" -eq 0 ]; then
  echo "error: skill not found: $SKILL_NAME" >&2
  exit 1
fi

if [ "${#matches[@]}" -gt 1 ]; then
  echo "error: multiple skills named $SKILL_NAME:" >&2
  printf '  %s\n' "${matches[@]}" >&2
  exit 1
fi

src="${matches[0]}"
target="$DEST/$SKILL_NAME"
mkdir -p "$DEST"

if [ -e "$target" ] || [ -L "$target" ]; then
  if [ "$FORCE" -ne 1 ]; then
    echo "error: $target already exists. Re-run with --force to replace it." >&2
    exit 1
  fi
  rm -rf "$target"
fi

cp -R "$src" "$target"
echo "installed $SKILL_NAME -> $target"
