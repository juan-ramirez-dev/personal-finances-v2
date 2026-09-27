'use client'

import { Modal } from '@/components/ui/modal'
import { formatMoney } from '@/lib/finance/format'
import { useFinance } from '../finance-provider'
import styles from './forms.module.css'

interface OverBudgetModalProps {
  open: boolean
  onClose: () => void
}

export function OverBudgetModal({ open, onClose }: OverBudgetModalProps) {
  const { summary } = useFinance()
  if (!summary) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Alerta"
      title="Presupuestos excedidos"
    >
      <ul className={styles.table}>
        {summary.overBudget.map(({ category, spent, over }) => (
          <li key={category.id} className={styles.overItem}>
            <span className={styles.overName}>{category.name}</span>
            <span className={styles.overAmount}>+{formatMoney(over)}</span>
            <span className={styles.overBar} aria-hidden>
              <span style={{ width: `${(over / spent) * 100}%` }} />
            </span>
            <span className={styles.overMeta}>
              Gastado {formatMoney(spent)} · presupuesto{' '}
              {formatMoney(category.budget)}
            </span>
          </li>
        ))}
        {summary.overBudget.length === 0 && (
          <li className={styles.hint}>Nada excedido. Bien ahí.</li>
        )}
      </ul>
    </Modal>
  )
}
