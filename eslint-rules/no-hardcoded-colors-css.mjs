/**
 * The CSS half of the colour policy — the TS/JSX half lives in
 * ./no-hardcoded-colors.mjs. Every colour in a stylesheet must come from a
 * `var(--token)` defined in src/app/globals.css.
 *
 * Runs on the CSS AST rather than raw text, so hex inside a comment (the Figma
 * provenance notes this codebase uses heavily) is never flagged.
 *
 * Allowed: `var(--token)`, `hsl(var(--token))`, and the keywords that carry no
 * colour of their own (`transparent`, `currentColor`, `inherit`, ...).
 */

const COLOR_FUNCTIONS = new Set([
  'rgb',
  'rgba',
  'hsl',
  'hsla',
  'hwb',
  'lab',
  'lch',
  'oklab',
  'oklch',
])

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

const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch)\(/

/** `hsl(var(--border))` is a token reference wearing a colour function. */
const referencesToken = node =>
  (node.children ?? []).some(
    child =>
      (child.type === 'Function' && child.name.toLowerCase() === 'var') ||
      (child.type === 'Function' && referencesToken(child)),
  )

const noHardcodedColorsCss = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow hardcoded colour values in CSS; use the design tokens.',
      url: 'docs/css.md',
    },
    messages: {
      hex: "Hardcoded colour '#{{color}}'. Use a `var(--token)` from src/app/globals.css. See docs/css.md — if no token matches, ask which token to add rather than inlining the value.",
      fn: "Hardcoded colour '{{color}}(...)'. Use a `var(--token)` from src/app/globals.css. See docs/css.md.",
      named:
        "Hardcoded colour '{{color}}'. Use a `var(--token)` from src/app/globals.css (`--color-text`, `--color-text-inverse`). See docs/css.md.",
      fallback:
        "Colour literal in a `var()` fallback: '{{color}}'. The fallback is what actually renders whenever the token is undefined, so this is a hardcoded colour. Point at a token that exists in src/app/globals.css and drop the fallback.",
    },
  },

  create(context) {
    return {
      Hash(node) {
        context.report({ node, messageId: 'hex', data: { color: node.value } })
      },

      Function(node) {
        const name = node.name.toLowerCase()
        if (!COLOR_FUNCTIONS.has(name)) return
        if (referencesToken(node)) return
        context.report({ node, messageId: 'fn', data: { color: name } })
      },

      Identifier(node) {
        if (!NAMED_COLORS.has(node.name.toLowerCase())) return
        context.report({
          node,
          messageId: 'named',
          data: { color: node.name },
        })
      },

      // `var(--Token, #a39a91)` parses its fallback as an unstructured Raw.
      Raw(node) {
        const match = node.value.match(RAW_COLOR)
        if (!match) return
        context.report({
          node,
          messageId: 'fallback',
          data: { color: node.value.trim() },
        })
      },
    }
  },
}

export default noHardcodedColorsCss
