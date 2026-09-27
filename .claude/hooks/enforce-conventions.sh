#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$SCRIPT_DIR/hooks.config.json"
LOG="/tmp/claude-hook-debug.log"
PAYLOAD=$(cat)

echo "$(date '+%H:%M:%S') [enforce-conventions] INVOKED" >> "$LOG"

export HOOK_CONFIG="$CONFIG"
export HOOK_PAYLOAD="$PAYLOAD"
export HOOK_LOG="$LOG"
export HOOK_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

python3 <<'PY'
import json, os, re, sys

LOG = os.environ.get('HOOK_LOG', '/tmp/claude-hook-debug.log')

def log(msg):
    with open(LOG, 'a') as f:
        f.write(f'[enforce-conventions] {msg}\n')

def allow():
    print('{}')
    sys.exit(0)

def deny(reason):
    print(json.dumps({
        'hookSpecificOutput': {
            'hookEventName': 'PreToolUse',
            'permissionDecision': 'deny',
            'permissionDecisionReason': reason,
        }
    }))
    sys.exit(0)

try:
    payload = json.loads(os.environ['HOOK_PAYLOAD'])
    config = json.load(open(os.environ['HOOK_CONFIG']))
except Exception as e:
    log(f'PARSE ERROR: {e}')
    allow()

conventions = config.get('enforceConventions', {})
if not conventions.get('enabled', False):
    allow()

tool_input = payload.get('tool_input', {})
file_path = tool_input.get('file_path', '')
if not file_path:
    allow()

project_dir = os.environ['HOOK_PROJECT_DIR']
rel_path = os.path.relpath(file_path, project_dir).replace(os.sep, '/')
if rel_path.startswith('..'):
    rel_path = file_path.replace(os.sep, '/')
basename = os.path.basename(file_path)
log(f'rel_path={rel_path}')

def matches_any(patterns, value):
    for pattern in patterns:
        try:
            if re.search(pattern, value):
                return pattern
        except re.error:
            continue
    return None


# ---------------------------------------------------------------- file naming
naming = conventions.get('fileNaming', {})
if naming.get('enabled', False):
    extensions = tuple(naming.get('extensions', []))
    exempt = naming.get('exempt', [])
    if rel_path.endswith(extensions) and not matches_any(exempt, rel_path):
        kebab = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
        next_segment = re.compile(r'^(?:\[\[?\.{0,3}[A-Za-z0-9_-]+\]?\]|\([a-z0-9-]+\))$')

        def to_kebab(segment):
            s = re.sub(r'([a-z0-9])([A-Z])', r'\1-\2', segment)
            s = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1-\2', s)
            s = re.sub(r'[\s_]+', '-', s)
            return re.sub(r'-+', '-', s).lower()

        segments = basename.split('.')
        name_segments = segments[:-1]
        bad = [s for s in name_segments if s and not kebab.match(s) and not next_segment.match(s)]
        if bad:
            suggested = '.'.join(
                [s if next_segment.match(s) else to_kebab(s) for s in name_segments]
                + [segments[-1]]
            )
            log(f'DENY naming: {basename}')
            deny(
                f'BLOCKED — file naming convention.\n'
                f'`{basename}` is not kebab-case. Write it as `{suggested}` instead.\n\n'
                f'AGENTS.md: all files use kebab-case (`my-component.tsx`, `use-my-hook.ts`), '
                f'including every dot segment (`my-component.test.tsx`, `my-component.schema.ts`).\n'
                f'Re-run this tool call with the corrected path. If you are renaming an existing '
                f'file, use `git mv` and update its imports.'
            )


# ------------------------------------------------------------- hardcoded colors
colors = conventions.get('colors', {})
if colors.get('enabled', False):
    extensions = tuple(colors.get('extensions', []))
    exempt = colors.get('exempt', [])
    if rel_path.endswith(extensions) and not matches_any(exempt, rel_path):
        # Only inspect what this call actually writes, so pre-existing colors
        # elsewhere in the file never block an unrelated edit.
        candidates = []
        for key in ('content', 'new_string'):
            value = tool_input.get(key)
            if isinstance(value, str):
                candidates.append(value)
        for edit in tool_input.get('edits', []) or []:
            value = edit.get('new_string')
            if isinstance(value, str):
                candidates.append(value)
        written = '\n'.join(candidates)

        # Figma provenance notes carry hex on purpose (`/* accent #ff3c00 */`).
        # Strip comments so documentation never trips the rule.
        written = re.sub(r'/\*.*?\*/', ' ', written, flags=re.S)
        written = re.sub(r'(?m)^\s*(?://|\*)\s.*$', ' ', written)
        written = re.sub(r'<!--.*?-->', ' ', written, flags=re.S)

        valid_hex_lengths = {3, 4, 6, 8}
        found = None
        for match in re.finditer(r'#[0-9a-fA-F]+\b', written):
            if len(match.group(0)) - 1 in valid_hex_lengths:
                found = match.group(0)
                break
        if not found:
            m = re.search(r'\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*[\d.]', written, re.I)
            if m:
                found = m.group(0).rstrip('0123456789. ')
        if not found:
            m = re.search(r'-\[\s*(?:#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?|oklch)\()', written, re.I)
            if m:
                found = m.group(0)

        if found:
            log(f'DENY color: {found} in {rel_path}')
            deny(
                f'BLOCKED — hardcoded colour `{found}` in {rel_path}.\n\n'
                f'Colours come from the token layer, never from a literal:\n'
                f'  - CSS / className: `var(--token)` defined in src/app/globals.css\n'
                f"  - TS where CSS variables cannot reach (OG images, "
                f"multi-colour SVG): `COLORS` from '@/lib/constants/colors'\n\n"
                f'Pick the matching existing token and re-run this tool call. If no token matches, '
                f'STOP and ask the user which token to use or add — do not inline the value and do '
                f'not invent a new token name on your own.'
            )


# ------------------------------------------------------------- forbidden code
# Escape hatches that hide problems instead of fixing them.
forbidden = conventions.get('forbiddenCode', {})
if forbidden.get('enabled', False):
    extensions = tuple(forbidden.get('extensions', []))
    exempt = forbidden.get('exempt', [])
    if rel_path.endswith(extensions) and not matches_any(exempt, rel_path):
        candidates = []
        for key in ('content', 'new_string'):
            value = tool_input.get(key)
            if isinstance(value, str):
                candidates.append(value)
        for edit in tool_input.get('edits', []) or []:
            value = edit.get('new_string')
            if isinstance(value, str):
                candidates.append(value)
        written = '\n'.join(candidates)

        # Comment-based escapes: checked on the raw text.
        comment_rules = [
            (r'eslint-disable', '`eslint-disable` comment'),
            (r'@ts-(?:ignore|expect-error|nocheck)\b', '`@ts-ignore` / `@ts-expect-error` / `@ts-nocheck`'),
        ]
        # Code rules: comments stripped so prose like "if any user" never trips them.
        code = re.sub(r'/\*.*?\*/', ' ', written, flags=re.S)
        code = re.sub(r'(?m)//.*$', ' ', code)
        code_rules = [
            (r'(?::|\bas|<|,)\s*any\b(?!\w)', '`any` type'),
            (r'\bany\[\]', '`any[]` type'),
            (r'''(?:from|import|require\()\s*['"](?:tailwindcss|@tailwindcss/[\w-]+)['"]''', 'Tailwind import'),
            (r'@tailwind\s|@import\s+["\']tailwindcss', 'Tailwind directive'),
        ]
        hit = None
        for pattern, label in comment_rules:
            if re.search(pattern, written):
                hit = label
                break
        if not hit:
            for pattern, label in code_rules:
                if re.search(pattern, code):
                    hit = label
                    break

        if hit:
            log(f'DENY forbidden: {hit} in {rel_path}')
            deny(
                f'BLOCKED — {hit} in {rel_path}.\n\n'
                f'AGENTS.md prohibits it. Fix the real cause:\n'
                f'  - `any` → write the real type, or `unknown` + a type guard.\n'
                f'  - eslint-disable / @ts-ignore → fix the lint or type error.\n'
                f'  - Tailwind → CSS Modules + `var(--token)` from src/app/globals.css.\n'
                f'If you truly cannot fix it, STOP and ask the user. Do not work around this block.'
            )

allow()
PY
