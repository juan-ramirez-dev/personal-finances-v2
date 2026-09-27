#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$SCRIPT_DIR/hooks.config.json"
LOG="/tmp/claude-hook-debug.log"
PAYLOAD=$(cat)

echo "$(date '+%H:%M:%S') [dangerous-commands] INVOKED" >> "$LOG"

ENABLED=$(python3 -c "import json; c=json.load(open('$CONFIG')); print(c.get('dangerousCommands',{}).get('enabled',False))" 2>/dev/null || echo "False")
if [ "$ENABLED" != "True" ]; then
  echo "$(date '+%H:%M:%S') [dangerous-commands] SKIPPED (disabled)" >> "$LOG"
  echo '{}'
  exit 0
fi

COMMAND=$(echo "$PAYLOAD" | python3 -c "import json,sys; print(json.load(sys.stdin).get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")
if [ -z "$COMMAND" ]; then
  echo "$(date '+%H:%M:%S') [dangerous-commands] SKIPPED (no command)" >> "$LOG"
  echo '{}'
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
CURRENT_BRANCH=$(git -C "$PROJECT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
echo "$(date '+%H:%M:%S') [dangerous-commands] CURRENT_BRANCH=$CURRENT_BRANCH" >> "$LOG"

export HOOK_CONFIG="$CONFIG"
export HOOK_PAYLOAD="$PAYLOAD"
export HOOK_CURRENT_BRANCH="$CURRENT_BRANCH"

RESULT=$(python3 << 'PYEOF' 2>> "$LOG"
import json, re, sys, os, shlex

try:
    config = json.load(open(os.environ['HOOK_CONFIG']))
    data = json.loads(os.environ['HOOK_PAYLOAD'])
except Exception as e:
    print(f"PARSE ERROR: {e}", file=sys.stderr)
    print('{}')
    sys.exit(0)

dc = config.get('dangerousCommands', {})
patterns = dc.get('blockedPatterns', [])
protected_branches = dc.get('protectedBranches', [])
command = data.get('tool_input', {}).get('command', '')
current_branch = os.environ.get('HOOK_CURRENT_BRANCH', '')

def deny(reason):
    print(json.dumps({
        'hookSpecificOutput': {
            'hookEventName': 'PreToolUse',
            'permissionDecision': 'deny',
            'permissionDecisionReason': reason
        }
    }))

# 1. Regex pattern checks — catches explicit refspecs like
#    `git push origin main`, `git push origin HEAD:staging`, `git push origin :feedback`.
for pattern in patterns:
    try:
        if re.search(pattern, command, re.IGNORECASE):
            deny(
                'HARD BLOCK: this command is classified as dangerous and is not '
                'allowed under any circumstances. Do NOT retry, do NOT rephrase, '
                'do NOT try to work around the block (e.g. by splitting the '
                'command, piping, or using a different tool). Stop the current '
                'operation and report to the user that this command is prohibited.\n'
                f'Pattern matched: {pattern}\nCommand: {command}'
            )
            sys.exit(0)
    except re.error as e:
        print(f"REGEX ERROR: {e}", file=sys.stderr)

# 2. Branch-state-aware push check — catches `git push` (no refspec) issued from
#    a checked-out protected branch, which would push that branch by default.
def is_implicit_push_from_protected(cmd, branch, protected):
    if not branch or branch not in protected:
        return False
    try:
        tokens = shlex.split(cmd)
    except ValueError:
        return False
    if len(tokens) < 2 or tokens[0] != 'git' or tokens[1] != 'push':
        return False
    # Approximate option-stripping: drop tokens starting with `-`. Git push
    # options that take a separate value are uncommon in agent usage.
    positional = [t for t in tokens[2:] if not t.startswith('-')]
    # 0 positional → bare `git push`, uses upstream tracking of current branch
    # 1 positional → remote only; current branch is pushed
    # 2 positional → remote + refspec; HEAD also resolves to current branch
    if len(positional) <= 1:
        return True
    refspec = positional[1]
    if refspec == 'HEAD' or refspec.startswith('HEAD:'):
        # HEAD alone pushes current branch under same name on remote.
        # HEAD:<dst> is an explicit refspec — if <dst> is protected the regex
        # caught it; otherwise it's a legitimate push to a non-protected branch.
        return refspec == 'HEAD'
    return False

if is_implicit_push_from_protected(command, current_branch, protected_branches):
    deny(
        f'HARD BLOCK: direct pushes from `{current_branch}` are prohibited because '
        f'`{current_branch}` is a protected branch ({", ".join(protected_branches)}). '
        'This `git push` has no explicit refspec, so it would push the current '
        'branch to its upstream. Do NOT retry, do NOT add `--force`, do NOT '
        'rephrase. Switch to a feature branch and open a PR instead.\n'
        f'Current branch: {current_branch}\nCommand: {command}'
    )
    sys.exit(0)

print("PASS: no rule matched", file=sys.stderr)
print('{}')
PYEOF
)
echo "$(date '+%H:%M:%S') [dangerous-commands] RESULT=$RESULT" >> "$LOG"
echo "$RESULT"
