#!/bin/bash
# PreToolUse hook - Block commands containing secrets

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name')

if [[ "$TOOL" == "Bash" ]]; then
    COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

    PATTERNS=(
        "password="
        "PASSWORD="
        "secret="
        "SECRET="
        "api_key="
        "API_KEY="
        "token="
        "TOKEN="
        "aws_access_key"
        "AWS_ACCESS_KEY"
        "private_key"
        "PRIVATE_KEY"
        "DATABASE_URL="
        "BETTER_AUTH_SECRET="
        "ENCRYPTION_KEY="
    )

    for PATTERN in "${PATTERNS[@]}"; do
        if echo "$COMMAND" | grep -qi "$PATTERN"; then
            echo "BLOCKED: Potential secret detected in command: $PATTERN" >&2
            exit 2
        fi
    done

    # API keys (long alphanumeric strings)
    if echo "$COMMAND" | grep -qE "(sk-[a-zA-Z0-9]{20,}|pk_[a-zA-Z0-9]{20,}|ek_[a-zA-Z0-9]{20,})"; then
        echo "BLOCKED: Potential API key detected in command" >&2
        exit 2
    fi

    # JWT tokens
    if echo "$COMMAND" | grep -qE "eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*"; then
        echo "BLOCKED: Potential JWT token detected in command" >&2
        exit 2
    fi
fi

# Check for secrets in file writes
if [[ "$TOOL" == "Write" || "$TOOL" == "Edit" ]]; then
    CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')
    FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

    # Skip .env files (they're meant to have secrets)
    if [[ "$FILE_PATH" == *".env"* ]]; then
        exit 0
    fi

    # Hardcoded API keys in code
    if echo "$CONTENT" | grep -qE "(sk-[a-zA-Z0-9]{20,}|pk_[a-zA-Z0-9]{20,}|ek_[a-zA-Z0-9]{20,})"; then
        echo "BLOCKED: Potential API key detected in file content" >&2
        exit 2
    fi

    # AWS credentials
    if echo "$CONTENT" | grep -qE "AKIA[A-Z0-9]{16}"; then
        echo "BLOCKED: AWS access key detected in file content" >&2
        exit 2
    fi

    # Common secret variable names with values
    if echo "$CONTENT" | grep -qiE "(apiKey|api_key|secret|password|token)\s*[:=]\s*['\"][a-zA-Z0-9_-]{20,}['\"]"; then
        echo "WARNING: Potential hardcoded secret in file content. Verify this is not a real credential." >&2
    fi
fi

exit 0
