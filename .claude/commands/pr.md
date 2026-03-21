---
name: pr
description: "Analyze changes, detect scope issues, and create a well-structured PR"
---

# Create Pull Request

Analyze changes, detect scope issues, and create a well-structured PR following project conventions.

## Process

1. **Analyze Changes**: Calculate complexity from files, commits, and packages touched
2. **Detect Scope Issues**: Warn if PR mixes unrelated packages
3. **Suggest Split**: If needed, group commits by package and propose separate PRs
4. **Generate Content**: Create TLDR + description + checklist
5. **Create PR**: Execute `gh pr create` with proper formatting

## PR Title Format

```
<type>(<scope>): <description>
```

Scopes match monorepo packages: `web`, `cli`, `db`, `crypto`, `types`, `docs`, `auth`, `api`, `config`

Examples:
- `feat(cli): add env2 pull with .env.example merge`
- `fix(db): correct migration for environments table`

## PR Body Template

```markdown
## TLDR
<!-- 2 lines max -->

---

## Type
{Feature | Fix | Tech | Docs}

## Description
{Context and changes}

## Technical Changes
{List of main modifications}

## Checklist
- [ ] Types pass (`pnpm typecheck`)
- [ ] Lint passes (`pnpm lint`)
- [ ] DB migrations idempotent (if applicable)
- [ ] No hardcoded secrets

---

🤖 Generated with Claude Code
```

## Scope Coherence

| Pattern | Verdict |
|---------|---------|
| Single package | OK |
| Related packages (db + web) | OK |
| Unrelated packages (cli + docs) | Split recommended |
| feat + fix same package | OK |

## Commands to Execute

```bash
BASE_BRANCH="main"

# Complexity check
git diff --name-only $BASE_BRANCH..HEAD
git log --oneline $BASE_BRANCH..HEAD

# Create PR
gh pr create \
  --title "<type>(<scope>): <description>" \
  --body "$BODY" \
  --base $BASE_BRANCH
```

## Post-PR Output

After PR creation, display the PR URL and remind to check CI.

## Usage

```
/pr
/pr --base main
/pr --draft
```

$ARGUMENTS
