#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$SCRIPT_DIR/hooks.config.json"
LOG="/tmp/claude-hook-debug.log"
PAYLOAD=$(cat)

echo "$(date '+%H:%M:%S') [eslint-lint] INVOKED" >> "$LOG"

FILE_PATH=$(echo "$PAYLOAD" | python3 -c "import json,sys; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null || echo "")
echo "$(date '+%H:%M:%S') [eslint-lint] FILE_PATH=$FILE_PATH" >> "$LOG"
if [ -z "$FILE_PATH" ]; then
  echo '{}'
  exit 0
fi

export HOOK_CONFIG="$CONFIG"
export HOOK_FILE_PATH="$FILE_PATH"

SHOULD_RUN=$(python3 -c "
import json, os, sys

config = json.load(open(os.environ['HOOK_CONFIG']))
lint = config.get('eslintLint', {})
if not lint.get('enabled', False):
    print('no')
    sys.exit(0)

extensions = lint.get('extensions', ['.ts', '.tsx', '.js', '.jsx'])
_, ext = os.path.splitext(os.environ['HOOK_FILE_PATH'])
print('yes' if ext in extensions else 'no')
" 2>/dev/null || echo "no")

echo "$(date '+%H:%M:%S') [eslint-lint] SHOULD_RUN=$SHOULD_RUN" >> "$LOG"
if [ "$SHOULD_RUN" != "yes" ]; then
  echo '{}'
  exit 0
fi

if [ ! -s "$FILE_PATH" ]; then
  echo "$(date '+%H:%M:%S') [eslint-lint] SKIPPED (file empty or missing)" >> "$LOG"
  echo '{}'
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR"

# Auto-fix what eslint can, then report what remains
LINT_OUTPUT=$(pnpm exec eslint --fix "$FILE_PATH" 2>&1) && LINT_EXIT=0 || LINT_EXIT=$?

echo "$(date '+%H:%M:%S') [eslint-lint] LINT_EXIT=$LINT_EXIT" >> "$LOG"
echo "$(date '+%H:%M:%S') [eslint-lint] LINT_OUTPUT_LEN=${#LINT_OUTPUT}" >> "$LOG"

# Treat "ignored" / "no files matching" as a pass
if echo "$LINT_OUTPUT" | grep -qE "ignored by an? \.eslintignore|File ignored|No files matching|ignored because"; then
  echo "$(date '+%H:%M:%S') [eslint-lint] SKIPPED (file ignored by eslint config)" >> "$LOG"
  echo '{}'
  exit 0
fi

if [ $LINT_EXIT -ne 0 ] && [ -n "$LINT_OUTPUT" ]; then
  TRUNCATED=$(echo "$LINT_OUTPUT" | tail -c 1500)
  export HOOK_LINT_REASON="ESLint violations were found in $FILE_PATH (auto-fix was already applied; these are the remaining errors). Fix them now without asking the user — edit the file to resolve every violation below, then continue with the original task. Do not ask for confirmation; the user has pre-approved automatic lint fixes.

$TRUNCATED"
  echo "$(date '+%H:%M:%S') [eslint-lint] BLOCKING with lint errors" >> "$LOG"
  python3 -c "
import json, os
result = {
    'decision': 'block',
    'reason': os.environ['HOOK_LINT_REASON'],
    'hookSpecificOutput': {
        'hookEventName': 'PostToolUse'
    }
}
print(json.dumps(result))
"
  exit 0
fi

echo "$(date '+%H:%M:%S') [eslint-lint] PASS" >> "$LOG"
echo '{}'
