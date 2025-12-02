# GitHub Automation Setup Guide

**Last Updated:** November 8, 2025  
**Purpose:** Automate GitHub workflows for safe multi-developer collaboration

---

## 🎯 Current Workflow

### Developer Workflow
```
1. Create feature branch
   git checkout -b feat/my-feature

2. Make changes & commit
   git add .
   git commit -m "feat: my feature"

3. Push to GitHub
   git push origin feat/my-feature

4. Create PR (auto-created link appears)

5. Add "automerge" label
   → GitHub Actions runs all checks
   → If passing, auto-merges to main
   → Deploys to production automatically
```

---

## 🤖 Recommended GitHub Apps

### 1. **Mergify** (Highly Recommended)
**Purpose:** Advanced auto-merge with conditions

**Install:** https://github.com/apps/mergify

**Benefits:**
- Auto-merge when CI passes
- Auto-update branches
- Auto-label PRs
- Conflict detection
- Queue management for multiple PRs

**Configuration:** `.mergify.yml`
```yaml
pull_request_rules:
  - name: Automatic merge on approval
    conditions:
      - "#approved-reviews-by>=1"
      - check-success=pr-checks
      - check-success=build-check
      - check-success=quick-tests
      - label=automerge
      - -draft
    actions:
      merge:
        method: squash
        
  - name: Auto-update branches
    conditions:
      - -conflict
      - -draft
    actions:
      update:
        
  - name: Auto-label by files changed
    conditions:
      - files~=^frontend/
    actions:
      label:
        add: ["frontend"]
```

### 2. **Kodiak** (Alternative to Mergify)
**Purpose:** Simpler auto-merge

**Install:** https://github.com/apps/kodiak

**Benefits:**
- Free for public repos
- Simple configuration
- Auto-merge queue
- Branch updates

**Configuration:** `.kodiak.toml`
```toml
version = 1

[merge]
automerge_label = "automerge"
method = "squash"
delete_branch_on_merge = true
optimistic_updates = true

[merge.message]
title = "pull_request_title"
body = "pull_request_body"

[update]
always = true
```

### 3. **Renovate** (Dependency Updates)
**Purpose:** Auto-update dependencies

**Install:** https://github.com/apps/renovate

**Benefits:**
- Auto-creates PRs for dependency updates
- Groups updates intelligently
- Auto-merges minor/patch updates
- Security vulnerability alerts

**Configuration:** `renovate.json`
```json
{
  "extends": ["config:base"],
  "schedule": ["before 5am on monday"],
  "automerge": true,
  "automergeType": "pr",
  "automergeStrategy": "squash",
  "packageRules": [
    {
      "matchUpdateTypes": ["minor", "patch"],
      "automerge": true
    },
    {
      "matchUpdateTypes": ["major"],
      "automerge": false,
      "labels": ["dependencies", "major-update"]
    }
  ]
}
```

### 4. **Dependabot** (Built-in Alternative)
**Purpose:** GitHub's native dependency updates

**Already enabled in GitHub Settings**

**Configuration:** `.github/dependabot.yml`
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    labels:
      - "dependencies"
      - "automerge"
    
  - package-ecosystem: "npm"
    directory: "/services/customer"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
      - "automerge"
```

### 5. **Semantic Pull Requests**
**Purpose:** Enforce conventional commit messages

**Install:** https://github.com/apps/semantic-pull-requests

**Benefits:**
- Enforces feat:, fix:, docs:, etc.
- Auto-generates changelogs
- Semantic versioning

### 6. **PR Size Labeler**
**Purpose:** Auto-label PRs by size

**Install:** https://github.com/apps/pull-request-size

**Benefits:**
- Labels: XS, S, M, L, XL
- Encourages smaller PRs
- Easier reviews

---

## 🔧 Enhanced Automation Workflows

### Auto-Deploy on Merge
Create `.github/workflows/auto-deploy.yml`:
```yaml
name: Auto-Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to DigitalOcean
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DO_HOST }}
          username: root
          key: ${{ secrets.DO_SSH_KEY }}
          script: |
            cd /opt/tailtown
            git pull origin main
            ./deploy.sh
```

### Auto-Label PRs
Create `.github/workflows/auto-label.yml`:
```yaml
name: Auto-Label PRs

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/labeler@v4
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
```

Create `.github/labeler.yml`:
```yaml
frontend:
  - frontend/**/*

backend:
  - services/**/*

docs:
  - docs/**/*
  - "*.md"

tests:
  - "**/*.test.ts"
  - "**/*.spec.ts"

dependencies:
  - package.json
  - package-lock.json
  - "**/package.json"
```

### Auto-Assign Reviewers
Create `.github/workflows/auto-assign.yml`:
```yaml
name: Auto-Assign Reviewers

on:
  pull_request:
    types: [opened, ready_for_review]

jobs:
  assign:
    runs-on: ubuntu-latest
    steps:
      - uses: kentaro-m/auto-assign-action@v1.2.1
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
```

Create `.github/auto-assign.yml`:
```yaml
addReviewers: true
addAssignees: false

reviewers:
  - robweinstein
  # Add other developers here

numberOfReviewers: 1
```

---

## 🛡️ Branch Protection Rules

### Configure in GitHub Settings → Branches → main

**Required:**
- ✅ Require pull request before merging
- ✅ Require approvals: 0 (for solo dev) or 1 (for team)
- ✅ Require status checks to pass:
  - `pr-checks`
  - `build-check`
  - `quick-tests`
- ✅ Require branches to be up to date
- ✅ Include administrators (optional)

**Optional:**
- ✅ Require conversation resolution
- ✅ Require signed commits
- ✅ Require linear history

---

## 👥 Multi-Developer Workflow

### For New Developers

1. **Clone repo**
   ```bash
   git clone https://github.com/moosecreates/tailtown.git
   cd tailtown
   ```

2. **Create feature branch**
   ```bash
   git checkout -b feat/your-feature
   ```

3. **Make changes & commit**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

4. **Push & create PR**
   ```bash
   git push origin feat/your-feature
   # Click the PR link that appears
   ```

5. **Add "automerge" label**
   - PR runs all checks automatically
   - If passing, merges automatically
   - Deploys to production

### Avoiding Conflicts

**Best Practices:**
1. **Pull main frequently**
   ```bash
   git checkout main
   git pull origin main
   git checkout feat/your-feature
   git rebase main
   ```

2. **Small, focused PRs**
   - One feature per PR
   - Easier to review
   - Less conflicts

3. **Use feature flags**
   - Deploy incomplete features behind flags
   - Enable when ready

4. **Communicate**
   - Comment on PRs
   - Use GitHub Discussions
   - Slack/Discord integration

---

## 🚀 Quick Setup Commands

### Install Mergify
```bash
# Visit: https://github.com/apps/mergify
# Click "Install"
# Select repository
```

### Create Mergify Config
```bash
cat > .mergify.yml << 'EOF'
pull_request_rules:
  - name: Auto-merge approved PRs
    conditions:
      - check-success=pr-checks
      - check-success=build-check
      - label=automerge
      - -draft
    actions:
      merge:
        method: squash
        
  - name: Auto-update branches
    conditions:
      - -conflict
    actions:
      update:
EOF

git add .mergify.yml
git commit -m "chore: add Mergify configuration"
git push origin main
```

### Create Dependabot Config
```bash
mkdir -p .github
cat > .github/dependabot.yml << 'EOF'
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
      - "automerge"
EOF

git add .github/dependabot.yml
git commit -m "chore: add Dependabot configuration"
git push origin main
```

---

## 📊 Monitoring & Notifications

### Slack Integration
1. Install GitHub app in Slack
2. Connect to repository
3. Get notifications for:
   - PR opened/merged
   - CI failures
   - Deployments

### Email Notifications
- Configure in GitHub Settings → Notifications
- Watch repository for all activity
- Custom routing rules

---

## 🎯 Recommended Setup Priority

### Phase 1: Essential (Do Now)
1. ✅ **Mergify** - Auto-merge with conditions
2. ✅ **Dependabot** - Dependency updates
3. ✅ **Auto-Label** - Organize PRs

### Phase 2: Nice to Have (Next Week)
4. **Semantic PR** - Enforce commit messages
5. **PR Size Labeler** - Encourage small PRs
6. **Slack Integration** - Team notifications

### Phase 3: Advanced (Future)
7. **Renovate** - Advanced dependency management
8. **CodeCov** - Test coverage tracking
9. **Snyk** - Security scanning

---

## 🔍 Testing the Workflow

### Test Auto-Merge
```bash
# Create test PR
git checkout -b test/auto-merge
echo "# Test" >> TEST.md
git add TEST.md
git commit -m "test: verify auto-merge"
git push origin test/auto-merge

# On GitHub:
# 1. Create PR
# 2. Add "automerge" label
# 3. Wait for checks to pass
# 4. Should auto-merge!
```

---

## 📝 Summary

**Current State:**
- ✅ Auto-merge working
- ✅ PR checks running
- ✅ Branch protection enabled

**Recommended Next Steps:**
1. Install **Mergify** for advanced auto-merge
2. Enable **Dependabot** for dependency updates
3. Add **auto-label** workflow
4. Configure **branch protection** rules
5. Set up **Slack notifications**

**Result:**
- Developers can work independently
- PRs auto-merge when ready
- Dependencies stay updated
- No stepping on toes! 🎉

---

**Questions?** Check the GitHub Actions tab for workflow runs and logs.
