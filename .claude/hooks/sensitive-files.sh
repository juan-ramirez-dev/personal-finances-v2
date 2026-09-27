#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$SCRIPT_DIR/hooks.config.json"
LOG="/tmp/claude-hook-debug.log"
PAYLOAD=$(cat)

echo "$(date '+%H:%M:%S') [sensitive-files] INVOKED" >> "$LOG"
echo "$(date '+%H:%M:%S') [sensitive-files] PAYLOAD=$PAYLOAD" >> "$LOG"

ENABLED=$(python3 -c "import json; c=json.load(open('$CONFIG')); print(c.get('sensitiveFiles',{}).get('enabled',False))" 2>/dev/null || echo "False")
if [ "$ENABLED" != "True" ]; then
  echo '{}'
  exit 0
fi

export HOOK_CONFIG="$CONFIG"
export HOOK_PAYLOAD="$PAYLOAD"
export HOOK_LOG="$LOG"
python3 -c "
import json, re, sys, os

LOG = os.environ.get('HOOK_LOG', '/tmp/claude-hook-debug.log')
def log(msg):
    with open(LOG, 'a') as f:
        f.write(f'[sensitive-files] {msg}\n')

try:
    payload = json.loads(os.environ['HOOK_PAYLOAD'])
    config = json.load(open(os.environ['HOOK_CONFIG']))
except Exception as e:
    log(f'PARSE ERROR: {e}')
    print('{}')
    sys.exit(0)

patterns = config.get('sensitiveFiles', {}).get('protectedPatterns', [])
file_path = payload.get('tool_input', {}).get('file_path', '')

# Match patterns against both the full path and the basename
import os as _os
basename = _os.path.basename(file_path)
log(f'file_path={file_path}')
log(f'basename={basename}')
log(f'patterns={patterns}')

if not file_path:
    log('SKIPPED (no file_path)')
    print('{}')
    sys.exit(0)

for pattern in patterns:
    try:
        if re.search(pattern, file_path) or re.search(pattern, basename):
            log(f'DENY: pattern={pattern}')
            result = {
                'hookSpecificOutput': {
                    'hookEventName': 'PreToolUse',
                    'permissionDecision': 'deny',
                    'permissionDecisionReason': f'HARD BLOCK: this file is protected and must not be modified. Do NOT retry, do NOT attempt to work around the block (e.g. via Bash, shell redirection, or a different tool). Stop the current operation and report to the user that this file cannot be edited. If the user truly needs changes to this file, they must edit it manually.\nFile: {file_path}\nMatched protection rule: {pattern}'
                }
            }
            print(json.dumps(result))
            sys.exit(0)
    except re.error:
        pass

print('{}')
"
