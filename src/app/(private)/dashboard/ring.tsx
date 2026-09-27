import { formatMoney } from '@/lib/finance/format'
import styles from './ring.module.css'

const R = 88
const C = 2 * Math.PI * R
const TICKS = Array.from({ length: 72 }, (_, i) => i * 5)

interface RingProps {
  income: number
  spent: number
  committed: number
  available: number
}

export function Ring({ income, spent, committed, available }: RingProps) {
  const base = Math.max(income, 1)
  const spentLen = Math.min(spent / base, 1) * C
  const committedLen = Math.min(committed / base, 1 - spentLen / C) * C
  const negative = available < 0

  return (
    <div className={styles.ring}>
      <svg viewBox="0 0 220 220" className={styles.svg} aria-hidden>
        <g className={styles.ticks}>
          {TICKS.map(deg => (
            <line
              key={deg}
              x1="110"
              y1="4"
              x2="110"
              y2={deg % 45 === 0 ? 12 : 8}
              transform={`rotate(${deg} 110 110)`}
            />
          ))}
        </g>
        <g transform="rotate(-90 110 110)">
          <circle className={styles.track} cx="110" cy="110" r={R} />
          <circle
            className={styles.committed}
            cx="110"
            cy="110"
            r={R}
            strokeDasharray={`${committedLen} ${C}`}
            strokeDashoffset={-spentLen}
          />
          <circle
            className={styles.spent}
            cx="110"
            cy="110"
            r={R}
            strokeDasharray={`${spentLen} ${C}`}
          />
        </g>
      </svg>
      <div className={styles.center}>
        <p className={styles.label}>{negative ? 'Te pasaste' : 'Disponible'}</p>
        <p className={styles.amount} data-negative={negative || undefined}>
          {formatMoney(available)}
        </p>
        <p className={styles.sub}>de {formatMoney(income)}</p>
      </div>
    </div>
  )
}
