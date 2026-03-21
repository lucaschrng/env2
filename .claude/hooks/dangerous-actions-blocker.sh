#!/bin/bash
# PreToolUse hook - Block dangerous actions
# Exit 0 = allow, Exit 2 = block

set -e

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input // empty')

# === BASH: Dangerous commands ===
if [[ "$TOOL_NAME" == "Bash" ]]; then
    COMMAND=$(echo "$TOOL_INPUT" | jq -r '.command // empty')

    DANGEROUS_PATTERNS=(
        "rm -rf /"
        "rm -rf ~"
        "rm -rf \$HOME"
        "dd if="
        "mkfs"
        ":(){:|:&};:"
        "> /dev/sda"
        "chmod -R 777 /"
        "sudo rm"
        "DROP DATABASE"
        "DROP TABLE"
        "--no-preserve-root"
    )

    for pattern in "${DANGEROUS_PATTERNS[@]}"; do
        if [[ "$COMMAND" == *"$pattern"* ]]; then
            echo "BLOCKED: Dangerous command detected: '$pattern'" >&2
            exit 2
        fi
    done

    # Block force push to main/master
    if echo "$COMMAND" | grep -qE "git push.*(-f|--force).*(main|master)"; then
        echo "BLOCKED: Force push to main/master is forbidden" >&2
        exit 2
    fi

    # Block npm/pnpm publish without confirmation
    if echo "$COMMAND" | grep -qE "npm publish|pnpm publish"; then
        echo "BLOCKED: Package publication requires manual confirmation" >&2
        exit 2
    fi

    # Block direct git push (should use /pr workflow)
    if echo "$COMMAND" | grep -qE "^git push"; then
        echo "BLOCKED: Use /pr workflow instead of direct git push" >&2
        exit 2
    fi

    # Block git commit --no-verify
    if echo "$COMMAND" | grep -qE "git commit.*--no-verify"; then
        echo "BLOCKED: Cannot bypass commit hooks with --no-verify" >&2
        exit 2
    fi

    # Block direct drizzle-kit commands (use pnpm db:* scripts)
    if echo "$COMMAND" | grep -qE "drizzle-kit generate|drizzle-kit migrate|drizzle-kit push"; then
        echo "BLOCKED: Use 'pnpm db:generate', 'pnpm db:migrate', or 'pnpm db:push' instead" >&2
        exit 2
    fi
fi

# === EDIT/WRITE: Sensitive files ===
if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" ]]; then
    FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty')

    PROTECTED_FILES=(
        ".env"
        ".env.local"
        ".env.production"
        ".env.development"
        "credentials.json"
        "serviceAccountKey.json"
        "id_rsa"
        "id_ed25519"
        ".npmrc"
    )

    FILENAME=$(basename "$FILE_PATH")
    for protected in "${PROTECTED_FILES[@]}"; do
        if [[ "$FILENAME" == "$protected" ]]; then
            echo "BLOCKED: Editing sensitive file '$FILENAME' is forbidden" >&2
            exit 2
        fi
    done

    # Warn if editing migration files
    if [[ "$FILE_PATH" == *"/db/migrations/"* ]]; then
        echo "WARNING: Editing existing migrations is discouraged. Create a new migration instead." >&2
    fi

    # Block editing outside project
    PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
    CLAUDE_HOME="${HOME}/.claude"

    is_allowed=false
    [[ "$FILE_PATH" == "$PROJECT_DIR"* ]] && is_allowed=true
    [[ "$FILE_PATH" == "$CLAUDE_HOME"* ]] && is_allowed=true
    [[ "$FILE_PATH" == "/tmp"* ]] && is_allowed=true

    if [[ "$is_allowed" == "false" ]]; then
        echo "BLOCKED: Editing outside project is forbidden: $FILE_PATH" >&2
        exit 2
    fi
fi

# === DELETE: Warn ===
if [[ "$TOOL_NAME" == "Bash" ]]; then
    COMMAND=$(echo "$TOOL_INPUT" | jq -r '.command // empty')
    if echo "$COMMAND" | grep -qE "rm -r|rmdir|unlink"; then
        echo '{"systemMessage": "Warning: File deletion detected. Verify this is intentional."}'
    fi
fi

exit 0
