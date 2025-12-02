# Documentation Guide - Quick Decision Tree

**Use this when creating new documentation.**

---

## 🤔 Quick Decision: Where Does This Doc Go?

### Ask Yourself: "What am I documenting?"

```
┌─────────────────────────────────────────────────────────────┐
│ What are you documenting?                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────┴───────────────────┐
        │                                       │
    "How to do X"                      "Why we did X"
    (Task/Recipe)                      (History/Context)
        │                                       │
        ▼                                       ▼
   /docs/human/                        /docs/ai-context/
   (1-2 pages)                         (as long as needed)
```

---

## 📋 Simple Rules

### Put in `/docs/human/` if:
- ✅ It's a "how to" guide
- ✅ Someone needs to DO something
- ✅ It's a quick reference
- ✅ You want humans to actually read it
- ✅ It can be 1-2 pages

**Examples:**
- "How to add a feature"
- "How to deploy"
- "How to run tests"
- "Quick start guide"
- "Common tasks"

### Put in `/docs/ai-context/` if:
- ✅ It explains WHY decisions were made
- ✅ It's complete implementation history
- ✅ It has detailed technical specs
- ✅ It's for AI to understand context
- ✅ It's longer than 2 pages

**Examples:**
- "Security implementation complete history"
- "Why we chose this architecture"
- "Complete test analysis"
- "Feature implementation details"
- "Migration history"

### Put in `/docs/reference/` if:
- ✅ It's factual reference material
- ✅ Both humans AND AI need it
- ✅ It's API documentation
- ✅ It's database schema
- ✅ It's configuration reference

**Examples:**
- API endpoint documentation
- Database schema reference
- Environment variables list
- Error code reference

---

## 🎯 Real Examples

### Example 1: You just implemented a new feature

**What you might write:**

1. **For Humans** → `/docs/human/COMMON-TASKS.md`
   ```markdown
   ## Add a Widget
   1. Create schema in /validators/
   2. Create controller in /controllers/
   3. Create route in /routes/
   ```
   (Add to existing file, 5 lines)

2. **For AI** → `/docs/ai-context/features/WIDGET-IMPLEMENTATION.md`
   ```markdown
   # Widget Feature Implementation
   
   ## Why We Built This
   [Complete context...]
   
   ## Implementation Details
   [All the details...]
   
   ## Decisions Made
   [Why we chose X over Y...]
   
   ## Code Examples
   [Complete examples...]
   ```
   (New file, 20+ pages)

### Example 2: You fixed a bug

**For Humans** → Update `/docs/human/TROUBLESHOOTING.md`
```markdown
## Widget Not Loading
**Problem:** Widget fails to load
**Solution:** Clear cache and restart
```
(2 lines)

**For AI** → Create `/docs/ai-context/bugs/WIDGET-LOADING-BUG.md`
```markdown
# Widget Loading Bug - Complete Analysis

## Bug Description
[Detailed description...]

## Root Cause
[Why it happened...]

## Investigation Process
[What we tried...]

## Solution
[How we fixed it...]

## Prevention
[How to prevent in future...]
```
(5+ pages)

### Example 3: You updated the database

**For Humans** → Already covered in `/docs/human/COMMON-TASKS.md`
```markdown
## Add a Database Field
1. Edit schema
2. Run migration
3. Update types
```
(Already exists, no new doc needed)

**For AI** → Create `/docs/ai-context/database/SCHEMA-EVOLUTION.md`
```markdown
# Database Schema Evolution

## 2025-11-07: Added Widget Fields
- Why: [context]
- What: [details]
- Impact: [what changed]
- Migration: [SQL]

## 2025-11-05: Added User Fields
[Same format...]
```
(Append to existing file)

---

## ⚡ Quick Checklist

Before writing documentation, check:

- [ ] **Is this a "how to" guide?** → `/docs/human/`
- [ ] **Is this implementation history?** → `/docs/ai-context/`
- [ ] **Is this API/schema reference?** → `/docs/reference/`
- [ ] **Can I add to existing doc?** → Update existing file
- [ ] **Is it > 2 pages?** → Probably AI context
- [ ] **Do I want humans to read it?** → Keep it short, put in human/

---

## 🚫 Common Mistakes

### ❌ Don't Do This:
```
/docs/COMPLETE-WIDGET-GUIDE.md (50 pages)
```
→ Too long for humans, not organized for AI

### ✅ Do This Instead:
```
/docs/human/WIDGETS.md (1 page - how to use)
/docs/ai-context/features/WIDGET-COMPLETE.md (50 pages - full context)
```

---

## 💡 Pro Tips

### 1. Start with Human Guide
When implementing a feature:
1. Write human guide first (forces you to keep it simple)
2. Then write AI context (all the details)

### 2. Update Existing Docs
Don't create new files if you can update existing ones:
- Add to `COMMON-TASKS.md` instead of creating `NEW-TASK.md`
- Append to `SCHEMA-EVOLUTION.md` instead of creating `NEW-SCHEMA.md`

### 3. Link Between Them
```markdown
# Human doc
See [complete details](/docs/ai-context/features/WIDGET.md)

# AI doc
Quick reference: [/docs/human/WIDGETS.md](/docs/human/WIDGETS.md)
```

### 4. Use Templates
- Human template: See DOCUMENTATION-STRATEGY.md
- AI template: See DOCUMENTATION-STRATEGY.md

---

## 🎓 When in Doubt

**Ask yourself:** "Would I want to read 20 pages about this?"

- **No** → It's for humans, keep it short
- **Yes, if I'm an AI** → It's for AI context

**Or:** "Is this a recipe or a story?"

- **Recipe** (do this, then this) → Human
- **Story** (why, how, what happened) → AI

---

## 📞 Still Not Sure?

Follow this simple rule:

**If you're writing it NOW (during implementation):**
- Short version → `/docs/human/`
- Long version → `/docs/ai-context/`

**If you're writing it LATER (documentation sprint):**
- Ask: "Who needs this?"
- Humans → `/docs/human/`
- AI → `/docs/ai-context/`

---

## 🔄 Workflow Example

### When You Implement a Feature:

1. **Write code** ✅
2. **Write tests** ✅
3. **Add 5 lines to `/docs/human/COMMON-TASKS.md`** ✅
   ```markdown
   ## Add a Widget
   1. Create validator
   2. Create controller
   3. Create route
   ```
4. **Create `/docs/ai-context/features/WIDGET.md`** ✅
   - Why we built it
   - How it works
   - Design decisions
   - Code examples
   - Edge cases
5. **Update README** (if major feature) ✅

**Total time:** 15 minutes for docs (5 min human + 10 min AI)

---

## ✅ Summary

**You decide where docs go, but it's easy:**

| Question | Answer | Location |
|----------|--------|----------|
| How to do X? | Recipe/Guide | `/docs/human/` |
| Why did we do X? | History/Context | `/docs/ai-context/` |
| What is X? | Reference | `/docs/reference/` |

**Keep it simple:**
- Humans → Short (1-2 pages)
- AI → Long (as needed)
- Both → Reference (factual)

---

**When in doubt, put it in `/docs/ai-context/` and create a 1-page summary in `/docs/human/`** ✅
