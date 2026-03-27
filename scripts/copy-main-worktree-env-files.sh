#!/bin/bash

# Make sure to check the root `package.json` file.
# There's a script to run this file using `pnpm`.
#
# Copies `.env` files from the main git worktree into the current linked
# worktree so agent-created worktrees can start the dev server and run local
# verification with the same environment configuration as the primary checkout.

set -euo pipefail

usage() {
    cat <<'EOF'
Usage: ./scripts/copy-main-worktree-env-files.sh [options]

If the current working directory is a linked git worktree, copy `.env` files
from the main worktree into the current worktree.

Options:
  --log-prefix <text>   Prefix for log output (default: [copy-main-worktree-env-files])
  -h, --help            Show this help

Examples:
  ./scripts/copy-main-worktree-env-files.sh
  ./scripts/copy-main-worktree-env-files.sh --log-prefix "[bootstrap-env]"
EOF
}

LOG_PREFIX="[copy-main-worktree-env-files]"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --log-prefix)
            if [[ $# -lt 2 ]]; then
                echo "missing value for --log-prefix" >&2
                exit 1
            fi
            LOG_PREFIX="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown argument: $1" >&2
            usage >&2
            exit 1
            ;;
    esac
done

copy_env_file() {
    local source_path="$1"
    local target_path="$2"
    local label="${3:-$(basename "$target_path")}"

    mkdir -p "$(dirname "$target_path")"
    echo "$LOG_PREFIX Copying env file: $label"
    echo "$LOG_PREFIX   from: $source_path"
    echo "$LOG_PREFIX   to:   $target_path"

    if cp -p "$source_path" "$target_path"; then
        echo "$LOG_PREFIX Copied env file: $label"
    else
        echo "$LOG_PREFIX Warning: failed copying env file: $label" >&2
        echo "$LOG_PREFIX   from: $source_path" >&2
        echo "$LOG_PREFIX   to:   $target_path" >&2
        return 1
    fi
}

copy_monorepo_env_files() {
    local repo_root_path="$1"
    local target_root_path="$2"
    local monorepo_dir=""
    local source_path=""
    local relative_path=""
    local target_path=""
    local found_any=0
    local copied_count=0

    for monorepo_dir in apps packages; do
        if [[ ! -d "$repo_root_path/$monorepo_dir" ]]; then
            echo "$LOG_PREFIX Monorepo directory not found: $monorepo_dir; skipping"
            continue
        fi

        echo "$LOG_PREFIX Scanning $monorepo_dir/ for .env files"

        while IFS= read -r source_path; do
            [[ -z "$source_path" ]] && continue
            relative_path="${source_path#"$repo_root_path"/}"
            target_path="$target_root_path/$relative_path"
            echo "$LOG_PREFIX Found monorepo env file: $relative_path"
            copy_env_file "$source_path" "$target_path" "$relative_path"
            found_any=1
            copied_count=$((copied_count + 1))
        done < <(find "$repo_root_path/$monorepo_dir" -type f -name ".env" 2>/dev/null)
    done

    if [[ $found_any -eq 0 ]]; then
        echo "$LOG_PREFIX No .env files found under apps/ or packages/; skipping"
    else
        echo "$LOG_PREFIX Finished copying monorepo .env files: $copied_count copied"
    fi
}

current_repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || {
    echo "$LOG_PREFIX Not inside a git repo." >&2
    exit 1
}

current_git_dir="$(git rev-parse --path-format=absolute --git-dir 2>/dev/null)" || {
    echo "$LOG_PREFIX Could not determine the current git dir." >&2
    exit 1
}

common_git_dir="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" || {
    echo "$LOG_PREFIX Could not determine the shared git dir." >&2
    exit 1
}

if [[ "$current_git_dir" == "$common_git_dir" ]]; then
    echo "$LOG_PREFIX Current repo is not a linked worktree; skipping"
    exit 0
fi

main_worktree_path="$(dirname "$common_git_dir")"
if [[ ! -d "$main_worktree_path" ]]; then
    echo "$LOG_PREFIX Could not determine the main worktree path from $common_git_dir" >&2
    exit 1
fi

echo "$LOG_PREFIX Linked worktree detected"
echo "$LOG_PREFIX Main worktree: $main_worktree_path"
echo "$LOG_PREFIX Target worktree: $current_repo_root"
echo "$LOG_PREFIX Copying .env files from main worktree"

source_root_env="$main_worktree_path/.env"
source_src_env="$main_worktree_path/src/environments/.env"
target_root_env="$current_repo_root/.env"
target_src_env="$current_repo_root/src/environments/.env"

if [[ -f "$source_root_env" ]]; then
    copy_env_file "$source_root_env" "$target_root_env" ".env"
else
    echo "$LOG_PREFIX No root .env found in main worktree; skipping"
fi

if [[ -f "$source_src_env" ]]; then
    copy_env_file "$source_src_env" "$target_src_env" "src/environments/.env"
else
    echo "$LOG_PREFIX No src/environments/.env found in main worktree; skipping"
fi

copy_monorepo_env_files "$main_worktree_path" "$current_repo_root"
