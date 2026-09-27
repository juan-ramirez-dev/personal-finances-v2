/**
 * Enforces the kebab-case file naming convention from AGENTS.md.
 *
 * Every dot-separated segment before the extension is checked, so
 * `my-component.test.tsx` passes and `myComponent.test.tsx` does not.
 * Next.js route segments (`[id]`, `[...slug]`, `(group)`) are left alone.
 */

import path from 'node:path'

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const NEXT_ROUTE_SEGMENT =
  /^(?:\[\[?\.{0,3}[A-Za-z0-9_-]+\]?\]|\([a-z0-9-]+\))$/
const VIRTUAL_FILENAME = /^<.*>$/

const toKebab = segment =>
  segment
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()

const kebabCaseFilename = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require kebab-case filenames (AGENTS.md file naming convention).',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignore: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      notKebab:
        "Filename '{{actual}}' is not kebab-case. Rename the file to '{{suggested}}' and update its imports. AGENTS.md: all files use kebab-case (`my-component.tsx`, `use-my-hook.ts`).",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename()
    if (!filename || VIRTUAL_FILENAME.test(filename)) return {}

    const ignore = (context.options[0]?.ignore ?? []).map(p => new RegExp(p))
    const normalised = filename.split(path.sep).join('/')
    if (ignore.some(pattern => pattern.test(normalised))) return {}

    const basename = path.basename(filename)
    // Last segment is the extension; everything before it must be kebab-case.
    const segments = basename.split('.')
    const nameSegments = segments.slice(0, -1)

    const offending = nameSegments.filter(
      segment =>
        segment.length > 0 &&
        !KEBAB.test(segment) &&
        !NEXT_ROUTE_SEGMENT.test(segment),
    )
    if (offending.length === 0) return {}

    const suggested = [
      ...nameSegments.map(segment =>
        NEXT_ROUTE_SEGMENT.test(segment) ? segment : toKebab(segment),
      ),
      segments.at(-1),
    ].join('.')

    return {
      Program(node) {
        context.report({
          node,
          loc: { line: 1, column: 0 },
          messageId: 'notKebab',
          data: { actual: basename, suggested },
        })
      },
    }
  },
}

export default kebabCaseFilename
