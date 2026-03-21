#!/bin/bash
# PostToolUse hook - Auto-format files after editing

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name')

if [[ "$TOOL" == "Write" || "$TOOL" == "Edit" ]]; then
    FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path')

    if [[ -z "$FILE" || "$FILE" == "null" ]]; then
        exit 0
    fi

    EXT="${FILE##*.}"

    case "$EXT" in
        js|jsx|ts|tsx)
            if command -v pnpm &> /dev/null; then
                pnpm exec eslint --fix "$FILE" 2>/dev/null
            fi
            ;;
        json)
            if command -v jq &> /dev/null; then
                TMP=$(mktemp)
                jq . "$FILE" > "$TMP" 2>/dev/null && mv "$TMP" "$FILE"
            fi
            ;;
    esac
fi

exit 0
