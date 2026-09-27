/**
 * Bans literal colour values in TS/JS/JSX. Colours live in the token layer:
 * `var(--token)` from src/app/globals.css for anything CSS can reach, and
 * `COLORS` / `CATEGORY_COLORS` from @/lib/constants/colors for the places it
 * can't (Stripe Elements, OG images, multi-colour SVG).
 *
 * Four shapes are caught:
 *   - raw hex                      `'#ff3c00'`
 *   - functional notation          `'rgba(0,0,0,.5)'`
 *   - Tailwind arbitrary values    `'bg-[#fff]'`
 *   - Tailwind palette utilities   `'text-red-500'`, `'bg-white'`
 *   - CSS named colours, but only in a colour-carrying position, so
 *     `<Button variant="white">` stays legal and `fill="white"` does not.
 *
 * `<clipPath>` / `<mask>` children are skipped: `fill="white"` there is mask
 * semantics from the Figma export, not a colour.
 */

import path from 'node:path'

const VALID_HEX_LENGTHS = new Set([3, 4, 6, 8])
const HEX = /#[0-9a-fA-F]+\b/g
const FUNCTIONAL = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*[\d.]/i
const TW_ARBITRARY = /-\[\s*(?:#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?|oklch)\()/i

const TW_PREFIX =
  'bg|text|border|ring|fill|stroke|from|via|to|decoration|outline|accent|caret|divide|placeholder|shadow'
const TW_PALETTE_NAME =
  'white|black|slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
const TW_PALETTE = new RegExp(
  `(?:^|\\s|:)(?:${TW_PREFIX})-(?:${TW_PALETTE_NAME})(?:-(?:50|950|[1-9]00))?(?:\\/\\d{1,3})?(?=$|\\s|"|')`,
)

const NAMED_COLORS = new Set([
  'white',
  'black',
  'red',
  'green',
  'blue',
  'yellow',
  'orange',
  'purple',
  'pink',
  'gray',
  'grey',
  'silver',
  'gold',
  'cyan',
  'magenta',
  'brown',
  'navy',
  'teal',
  'lime',
  'maroon',
  'olive',
  'aqua',
  'fuchsia',
  'crimson',
  'indigo',
  'violet',
  'salmon',
  'khaki',
  'plum',
  'orchid',
  'tan',
  'beige',
])

/**
 * Style keys and canvas properties whose value really is a colour.
 *
 * A bare word like `white` is only treated as a colour in a position that
 * genuinely paints. A prop on a React component is NOT such a position — a
 * union like `color?: 'black' | 'white'` is a variant discriminant that maps to
 * a CSS class, and flagging it would fight correct code. Hex and rgb() are
 * flagged wherever they appear, since those are never variant names.
 */
const COLOR_POSITIONS = new Set([
  'color',
  'fill',
  'stroke',
  'background',
  'backgroundColor',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'outlineColor',
  'textDecorationColor',
  'caretColor',
  'columnRuleColor',
  'stopColor',
  'floodColor',
  'lightingColor',
  'shadowColor',
  'fillStyle',
  'strokeStyle',
  'themeColor',
  'accentColor',
])

/** `<path fill="white">` paints; `<Overlay color="white">` may not. */
const isIntrinsicElement = name => /^[a-z]/.test(name ?? '')

const MASK_ELEMENTS = new Set(['clipPath', 'mask'])
const VIRTUAL_FILENAME = /^<.*>$/

const findLiteralColor = text => {
  if (typeof text !== 'string' || text.length === 0) return null

  for (const match of text.matchAll(HEX)) {
    if (VALID_HEX_LENGTHS.has(match[0].length - 1)) return match[0]
  }
  const functional = text.match(FUNCTIONAL)
  if (functional) return functional[0].replace(/\s*[\d.]$/, '')
  const arbitrary = text.match(TW_ARBITRARY)
  if (arbitrary) return arbitrary[0].trim()
  return null
}

const jsxElementName = node => {
  const name = node.openingElement?.name
  return name?.type === 'JSXIdentifier' ? name.name : null
}

/** True when the literal sits inside an SVG <clipPath> or <mask> subtree. */
const insideMask = node => {
  for (let current = node.parent; current; current = current.parent) {
    if (
      current.type === 'JSXElement' &&
      MASK_ELEMENTS.has(jsxElementName(current))
    ) {
      return true
    }
  }
  return false
}

/** The colour-carrying key this literal is the value of, if any. */
const colorPositionKey = node => {
  const parent = node.parent
  if (!parent) return null

  // <path fill="white" /> — intrinsic elements only, never a component prop.
  if (parent.type === 'JSXAttribute' && parent.value === node) {
    const element = parent.parent?.name
    if (!isIntrinsicElement(element?.name)) return null
    return parent.name?.name ?? null
  }
  // style={{ color: 'red' }} / { fill: 'white' }
  if (parent.type === 'Property' && parent.value === node) {
    const key = parent.key
    return key.type === 'Identifier' ? key.name : key.value
  }
  // ctx.fillStyle = 'red'
  if (parent.type === 'AssignmentExpression' && parent.right === node) {
    const left = parent.left
    if (left.type === 'MemberExpression' && !left.computed) {
      return left.property.type === 'Identifier' ? left.property.name : null
    }
  }
  return null
}

const noHardcodedColors = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow hardcoded colour values; use the design tokens instead.',
      url: 'docs/css.md',
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
      literal:
        "Hardcoded colour '{{color}}'. Use a design token: `var(--token)` from src/app/globals.css in CSS/className, or `COLORS` from '@/lib/constants/colors' where CSS variables can't reach (Stripe Elements, OG images, multi-colour SVG). See docs/css.md. If no token matches, ask which token to add — do not inline the value.",
      named:
        "Hardcoded colour '{{color}}' on `{{position}}`. Use a design token — `var(--token)` in CSS/className, or `COLORS` from '@/lib/constants/colors' in TS. See docs/css.md.",
      tailwindPalette:
        "'{{color}}' uses Tailwind's built-in palette, which bypasses the design tokens. Use a token-backed class or `var(--token)` instead. See docs/css.md.",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename()
    if (filename && !VIRTUAL_FILENAME.test(filename)) {
      const normalised = filename.split(path.sep).join('/')
      const ignore = (context.options[0]?.ignore ?? []).map(p => new RegExp(p))
      if (ignore.some(pattern => pattern.test(normalised))) return {}
    }

    const check = (node, text) => {
      const literal = findLiteralColor(text)
      if (literal) {
        context.report({
          node,
          messageId: 'literal',
          data: { color: literal },
        })
        return
      }

      const palette = text.match?.(TW_PALETTE)
      if (palette) {
        context.report({
          node,
          messageId: 'tailwindPalette',
          data: { color: palette[0].trim() },
        })
      }
    }

    return {
      Literal(node) {
        if (typeof node.value !== 'string') return

        const named = node.value.trim()
        if (NAMED_COLORS.has(named)) {
          const position = colorPositionKey(node)
          if (position && COLOR_POSITIONS.has(position) && !insideMask(node)) {
            context.report({
              node,
              messageId: 'named',
              data: { color: named, position },
            })
          }
          return
        }

        check(node, node.value)
      },
      TemplateElement(node) {
        check(node, node.value.cooked ?? node.value.raw)
      },
    }
  },
}

export default noHardcodedColors
