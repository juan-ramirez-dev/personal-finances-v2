'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { parseISODate } from '@/lib/finance/calc'
import { formatMoney, formatShortDate } from '@/lib/finance/format'
import { useFinance } from '../finance-provider'
import styles from './forms.module.css'

interface MovementsModalProps {
  open: boolean
  onClose: () => void
}

export function MovementsModal({ open, onClose }: MovementsModalProps) {
  const { summary, data, removeExpense, removeIncome } = useFinance()
  const [error, setError] = useState<string | null>(null)
  if (!summary || !data) return null

  const targetName = (kind: string, id: string) =>
    kind === 'fixed'
      ? `Fijo · ${data.fixed.find(f => f.id === id)?.name ?? '—'}`
      : (data.categories.find(c => c.id === id)?.name ?? '—')

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Este ciclo"
      title="Movimientos"
      wide
    >
      <ul className={styles.table}>
        {summary.cycleExpenses.map(e => (
          <li key={e.id} className={styles.item}>
            <span className={styles.date}>
              {formatShortDate(parseISODate(e.date))}
            </span>
            <span className={styles.desc}>
              {e.description || 'Sin descripción'}
              <small>{targetName(e.target.kind, e.target.id)}</small>
            </span>
            <span className={styles.money}>{formatMoney(e.amount)}</span>
            <button
              type="button"
              className={styles.remove}
              aria-label="Borrar gasto"
              onClick={async () => setError(await removeExpense(e.id))}
            >
              ×
            </button>
          </li>
        ))}
        {summary.cycleExpenses.length === 0 && (
          <li className={styles.hint}>Aún no hay movimientos.</li>
        )}
      </ul>
      {error && <p className={styles.error}>{error}</p>}
      <p className={styles.total}>
        Total gastado <strong>{formatMoney(summary.spent)}</strong>
      </p>

      {summary.cycleIncomes.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>Ingresos extra</h3>
          <ul className={styles.table}>
            {summary.cycleIncomes.map(i => (
              <li key={i.id} className={styles.item}>
                <span className={styles.date}>
                  {formatShortDate(parseISODate(i.date))}
                </span>
                <span className={styles.desc}>
                  {i.description || 'Sin descripción'}
                </span>
                <span className={styles.money}>+ {formatMoney(i.amount)}</span>
                <button
                  type="button"
                  className={styles.remove}
                  aria-label="Borrar ingreso"
                  onClick={async () => setError(await removeIncome(i.id))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <p className={styles.total}>
            Total extra <strong>+ {formatMoney(summary.extraIncome)}</strong>
          </p>
        </>
      )}
    </Modal>
  )
}
