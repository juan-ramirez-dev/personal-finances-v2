'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { Summary } from '@/lib/finance/calc'
import { formatMoney } from '@/lib/finance/format'
import { useFinance } from '../finance-provider'
import styles from './panel.module.css'

interface FixedPanelProps {
  summary: Summary
  onEdit: () => void
}

export function FixedPanel({ summary, onEdit }: FixedPanelProps) {
  const { toggleFixedPaid } = useFinance()
  const [error, setError] = useState<string | null>(null)
  const paidCount = summary.fixed.filter(f => f.isPaid).length
  const total = summary.fixed.length
  // Pendientes primero, ordenados por día de pago.
  const items = [...summary.fixed].sort(
    (a, b) =>
      Number(a.isPaid) - Number(b.isPaid) || a.fixed.dueDay - b.fixed.dueDay,
  )

  return (
    <section className={styles.panel}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>I · Gastos fijos</p>
        <h2 className={styles.title}>
          {paidCount}
          <span>/{total} pagados</span>
        </h2>
        <Progress value={total ? paidCount / total : 0} thin />
      </header>

      <ul className={styles.list}>
        {items.map(({ fixed, isPaid, paid, pending }) => (
          <li key={fixed.id}>
            <button
              type="button"
              className={styles.fixedRow}
              data-paid={isPaid || undefined}
              aria-pressed={isPaid}
              onClick={async () => setError(await toggleFixedPaid(fixed.id))}
            >
              <span className={styles.check} aria-hidden>
                {isPaid ? '✓' : ''}
              </span>
              <span className={styles.name}>
                {fixed.name}
                <small>
                  {isPaid
                    ? 'Pagado'
                    : paid > 0
                      ? `Abonado ${formatMoney(paid)}`
                      : `Día ${fixed.dueDay}`}
                </small>
              </span>
              <span className={styles.amount}>
                {formatMoney(isPaid ? fixed.amount : pending)}
              </span>
            </button>
          </li>
        ))}
        {total === 0 && (
          <li className={styles.empty}>Sin gastos fijos. Agrégalos.</li>
        )}
      </ul>

      {error && <p className={styles.error}>{error}</p>}

      <footer className={styles.foot}>
        <span>
          Pendiente <strong>{formatMoney(summary.committed)}</strong>
        </span>
        <Button type="button" variant="link" onClick={onEdit}>
          Editar
        </Button>
      </footer>
    </section>
  )
}
