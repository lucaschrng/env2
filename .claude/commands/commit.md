---
name: commit
description: "Generate a conventional commit message for staged changes"
---

# Conventional Commit

Generate a conventional commit message for staged changes following project conventions.

## Instructions

1. Run `git diff --cached` to see staged changes
2. Analyze the nature of changes
3. Generate a commit message following the format below

## Commit Format

```
<type>(<scope>): <subject>

[optional body]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes nor adds feature
- `perf`: Performance improvement
- `test`: Adding missing tests
- `chore`: Maintenance tasks

### Scopes (Project-Specific)

Based on monorepo structure:
- `web` - Dashboard app (apps/web)
- `cli` - CLI package (packages/cli)
- `db` - Database schema/migrations (packages/db)
- `crypto` - Encryption package (packages/crypto)
- `types` - Shared types (packages/types)
- `docs` - Documentation site (apps/docs)
- `auth` - Authentication (Better Auth)
- `api` - tRPC API routes
- `ui` - UI components
- `config` - Configuration / turborepo / docker

### Rules
- Subject: imperative mood, no period, max 50 chars
- Body: explain WHAT and WHY, not HOW
- **No** `Co-Authored-By`, `Generated with`, or any AI attribution in commits
- **No** `Closes #`, `Fixes #`, or any issue reference footers
- **Never commit to main directly** (create branch first)

## Pre-Commit Checks

Before committing, verify:
- [ ] No `console.log` statements (unless intentional debugging)
- [ ] No hardcoded credentials or API keys
- [ ] Types are correct (`pnpm typecheck`)
- [ ] If DB schema changed, migration is generated
- [ ] If env vars added, they're validated in the env config

## Examples

```
feat(cli): add env2 pull with .env.example merge
```

```
fix(crypto): handle empty string encryption edge case
```

```
refactor(db): extract environment queries to separate module
```

```
chore(config): add turbo pipeline for packages/crypto
```

## Execution

After analyzing staged changes:
1. Suggest a commit message
2. Ask for confirmation
3. Execute `git commit -m "..."`

## Usage

```
/commit
```

$ARGUMENTS
