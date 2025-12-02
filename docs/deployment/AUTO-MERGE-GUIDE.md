# Auto-Merge Guide

## Overview

The Tailtown repository has automated PR merging configured to streamline the development workflow. PRs are automatically merged when certain conditions are met.

## How It Works

### ✨ Fully Automatic (Zero Manual Work!)

**ALL pull requests automatically merge** when checks pass. No labels needed!

This includes:
- `docs/*` - Documentation changes
- `chore/*` - Maintenance tasks
- `feat/*` - New features
- `fix/*` - Bug fixes
- `refactor/*` - Code refactoring
- `test/*` - Test changes
- Any other branch name

**Requirements:**
- ✅ All checks must pass
- ✅ No merge conflicts
- ✅ Not marked as draft
- ✅ No `do-not-merge` label

### Preventing Auto-Merge

1. Add the `do-not-merge` label
2. Or mark the PR as a **Draft**

## Workflow Triggers

The auto-merge workflow runs when:

- PR is opened
- PR is updated (new commits pushed)
- PR is labeled
- PR review is submitted
- Check suite completes

## Merge Settings

- **Method**: Squash merge (all commits squashed into one)
- **Commit Message**: Uses PR title
- **Branch Deletion**: Automatically deletes branch after merge
- **Retries**: 6 attempts with 10-second delays
- **Required Approvals**: 0 (fully automated)

## Examples

### Example 1: Documentation Update (Auto)

```bash
# Create branch
git checkout -b docs/update-api-docs

# Make changes
git add docs/api/
git commit -m "docs: update API documentation"

# Push
git push origin docs/update-api-docs

# Create PR (via GitHub UI or gh CLI)
gh pr create --title "docs: update API documentation" --body "Updated API docs"

# ✅ PR will automatically merge when checks pass (no action needed!)
```

### Example 2: Feature Branch (Also Auto!)

```bash
# Create branch
git checkout -b feat/new-widget

# Make changes
git add src/
git commit -m "feat: add new widget"

# Push
git push origin feat/new-widget

# Create PR
gh pr create --title "feat: add new widget" --body "Adds new widget component"

# ✅ PR will automatically merge when checks pass (no label needed!)
```

### Example 3: Prevent Auto-Merge

```bash
# For a docs branch that you DON'T want to auto-merge yet
git checkout -b docs/draft-architecture

# Create PR as draft
gh pr create --draft --title "docs: draft architecture" --body "WIP"

# ✅ Won't auto-merge because it's a draft

# Or add do-not-merge label
gh pr edit --add-label do-not-merge

# ✅ Won't auto-merge even when checks pass
```

## Branch Naming Conventions

To take advantage of auto-merge, use these prefixes:

- `docs/*` - Documentation changes
- `chore/*` - Maintenance and tooling
- `feat/*` - New features (requires `automerge` label)
- `fix/*` - Bug fixes (requires `automerge` label)
- `refactor/*` - Code refactoring (requires `automerge` label)
- `test/*` - Test additions/changes (requires `automerge` label)

## Troubleshooting

### PR Not Auto-Merging

Check:
1. ✅ All checks are passing
2. ✅ PR is not a draft
3. ✅ No `do-not-merge` label
4. ✅ Branch name matches pattern (docs/* or chore/*) OR has `automerge` label
5. ✅ No merge conflicts

### Force Manual Merge

If auto-merge isn't working and you need to merge manually:

```bash
# Via GitHub UI: Click "Merge pull request"

# Or via CLI:
gh pr merge <PR_NUMBER> --squash --delete-branch
```

## Benefits

- **Faster Merges**: No waiting for manual approval on docs/chore changes
- **Consistent Process**: All PRs merged the same way (squash)
- **Clean History**: Branches automatically deleted
- **Less Context Switching**: Focus on coding, not clicking merge buttons
- **Safe**: Still requires all checks to pass

## Configuration

The auto-merge workflow is defined in:
- `.github/workflows/auto-merge.yml`

To modify the behavior, edit that file and adjust:
- Branch patterns in the `if` condition
- Merge method (`MERGE_METHOD`)
- Required approvals (`MERGE_REQUIRED_APPROVALS`)
- Other settings

## Security Notes

- Auto-merge only works for branches in the same repository
- External contributors' PRs will NOT auto-merge
- Protected branch rules still apply
- Required status checks must pass

---

**Last Updated**: November 8, 2025
