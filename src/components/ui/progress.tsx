import styles from './progress.module.css'

type Tone = 'ink' | 'primary' | 'warning' | 'muted'

interface ProgressProps {
  // Entre 0 y 1. Lo que pase de 1 se corta.
  value: number
  tone?: Tone
  thin?: boolean
  className?: string
}

export function Progress({
  value,
  tone = 'ink',
  thin,
  className,
}: ProgressProps) {
  const pct = Math.min(Math.max(value, 0), 1) * 100
  return (
    <span
      className={[styles.track, thin && styles.thin, className]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    >
      <span
        className={`${styles.fill} ${styles[tone]}`}
        style={{ width: `${pct}%` }}
      />
    </span>
  )
}
