# 📜 VERSION CONTROL PROTOCOL
*Every Change Must Be Reversible — This Is Law*

**Version:** 1.0.0
**Created:** 2026-01-25
**Status:** ACTIVE

---

## ⚖️ THE LAW

> **No change to any project shall be made without a path to revert.**

This applies to:
- Code files
- Configuration
- Memory/documentation
- Database schemas
- Deployed services

---

## 🔄 GIT PROTOCOL

### Before Major Changes
```bash
# 1. Check status
git status

# 2. Commit current state
git add -A
git commit -m "checkpoint: before [description]"

# 3. Make changes
# ...

# 4. Commit changes
git commit -m "feat/fix/refactor: [description]"
```

### Commit Message Format
```
<type>: <short description>

Types:
- feat: New feature
- fix: Bug fix
- refactor: Code restructure
- docs: Documentation
- checkpoint: Pre-change snapshot
- wip: Work in progress (don't deploy)
```

### When to Commit (Auto-triggers)
- Before multi-file refactors
- Before database migrations
- Before deployment
- After feature completion
- Before switching to AG
- End of work session

---

## 📁 FILE CHANGES

### Safe Patterns
```bash
# Move to trash instead of delete
trash <file>          # Windows: Move to Recycle Bin
# OR
mv <file> ~/.trash/   # Manual trash folder

# Copy before overwrite
cp <file> <file>.bak
```

### Pip Will:
1. **Checkpoint** before destructive operations
2. **Ask permission** before deleting files
3. **Use trash** instead of rm when possible
4. **Log changes** in daily memory file

---

## 🗄️ DATABASE CHANGES

### Before Schema Changes
```bash
# 1. Backup database
cp database.db database.db.bak

# 2. Document the migration
# migrations/YYYY-MM-DD_description.sql

# 3. Apply migration
# ...

# 4. Verify data integrity
```

### Rollback Plan
Every migration must have:
- Forward migration SQL
- Rollback migration SQL
- Data verification query

---

## 🔧 CONFIGURATION CHANGES

### Before Config Changes
1. Copy current config: `config.json` → `config.json.bak`
2. Document what's changing and why
3. Make change
4. Test
5. If fail → restore backup

### Clawdbot Config
- Stored in `~/.clawdbot/clawdbot.json`
- Use `gateway config.patch` for safe partial updates
- Full replacement requires explicit approval

---

## 🚀 DEPLOYMENT PROTOCOL

### Before Deploy
1. Commit all changes
2. Tag the release: `git tag v1.x.x`
3. Document current production state
4. Have rollback plan ready

### Rollback Plan
```bash
# If deploy fails:
git checkout <previous-tag>
# Redeploy previous version
```

---

## 📝 AUTO-SYNC TRIGGERS

Pip will automatically sync memory at these milestones:

| Milestone | Memory Update | Git Commit |
|-----------|---------------|------------|
| Feature complete | ✅ Daily log | ✅ feat: commit |
| Major decision | ✅ MEMORY.md | Optional |
| Error recovery | ✅ Daily log + lessons | ✅ fix: commit |
| Session end | ✅ Daily log | Batch commit |
| Before AG handoff | ✅ Full sync | Optional |
| Config change | ✅ Daily log | ✅ Checkpoint |

---

## 🚨 EMERGENCY RECOVERY

### If Something Breaks

1. **Don't panic**
2. **Stop further changes**
3. **Check git log:**
   ```bash
   git log --oneline -10
   ```
4. **Revert if needed:**
   ```bash
   git revert <commit>
   # OR
   git checkout <commit> -- <file>
   ```
5. **Document what happened**

### If Database Corrupted
1. Stop services
2. Restore from `.bak` file
3. Replay only verified operations
4. Document incident

---

## 📊 AUDIT TRAIL

### What Gets Logged
- All file changes (in git)
- All commits (in git log)
- All decisions (in memory files)
- All errors (in daily log + lessons learned)

### Where to Find History
| What | Where |
|------|-------|
| Code history | `git log` |
| Decision history | `memory/*.md`, `MEMORY.md` |
| Session history | `memory/YYYY-MM-DD.md` |
| Error history | `Pip_Vault/Lessons_Learned.md` |
| Config history | `~/.clawdbot/` backup files |

---

## ✅ CHECKLIST

Before any significant change, Pip will:
- [ ] Check current git status
- [ ] Commit checkpoint if needed
- [ ] Backup files being modified
- [ ] Make the change
- [ ] Verify change worked
- [ ] Commit the change
- [ ] Update memory if milestone

---

*This protocol is non-negotiable. Safety enables speed.*
