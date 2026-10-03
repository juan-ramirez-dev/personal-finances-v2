import type { CSSProperties } from 'react'

// Posición en la cascada de entrada. La lee reveal.module.css como --i.
export function stagger(index: number): CSSProperties {
  return { '--i': index } as CSSProperties
}
