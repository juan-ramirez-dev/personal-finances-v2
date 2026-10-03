import type { ReactNode } from 'react'
import styles from './stat.module.css'

type Tone = 'default' | 'positive' | 'warning'

interface StatProps {
  label: ReactNode
  value: string
  note?: string
  tone?: Tone
}

// Va dentro de un <dl>: etiqueta en versalitas, monto en Bodoni.
export function Stat({ label, value, note, tone = 'default' }: StatProps) {
  return (
    <div className={`${styles.stat} ${styles[tone]}`}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.value}>{value}</dd>
      {note && <dd className={styles.note}>{note}</dd>}
    </div>
  )
}
