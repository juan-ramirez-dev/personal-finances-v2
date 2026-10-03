import { ViewTransition } from 'react'
import styles from './wordmark.module.css'

type Size = 'sm' | 'md' | 'lg'

// El nombre "brand" deja el logo quieto mientras la página cambia.
export function Wordmark({
  size = 'md',
  className,
}: {
  size?: Size
  className?: string
}) {
  return (
    <ViewTransition name="brand">
      <span
        className={[styles.wordmark, styles[size], className]
          .filter(Boolean)
          .join(' ')}
      >
        Lucka
      </span>
    </ViewTransition>
  )
}
