'use client'

import field from '@/components/ui/field.module.css'
import { MoneyInput } from '@/components/ui/money-input'
import { formatMoney } from '@/lib/finance/format'
import type { FixedExpense } from '@/lib/finance/types'
import { newId } from '../finance-provider'
import styles from './editor.module.css'

interface FixedEditorProps {
  items: FixedExpense[]
  onChange: (items: FixedExpense[]) => void
}

export function FixedEditor({ items, onChange }: FixedEditorProps) {
  const patch = (id: string, change: Partial<FixedExpense>) =>
    onChange(items.map(f => (f.id === id ? { ...f, ...change } : f)))

  return (
    <div className={styles.editor}>
      <div className={`${styles.row} ${styles.head} ${styles.fixedRow}`}>
        <span>Nombre</span>
        <span>Monto</span>
        <span>Día</span>
        <span />
      </div>
      <div className={styles.list}>
        {items.map(f => (
          <div key={f.id} className={`${styles.row} ${styles.fixedRow}`}>
            {f.isInvestment ? (
              <span className={styles.locked}>
                Inversión <small>desde inversiones</small>
              </span>
            ) : (
              <input
                className={field.input}
                placeholder="Ej. Arriendo"
                value={f.name}
                onChange={e => patch(f.id, { name: e.target.value })}
              />
            )}
            {f.isInvestment ? (
              <span className={styles.locked}>{formatMoney(f.amount)}</span>
            ) : (
              <MoneyInput
                value={f.amount}
                onChange={amount => patch(f.id, { amount })}
              />
            )}
            <input
              className={field.input}
              type="number"
              min={1}
              max={31}
              aria-label="Día de pago"
              value={f.dueDay}
              onChange={e =>
                patch(f.id, {
                  dueDay: Math.min(31, Math.max(1, Number(e.target.value))),
                })
              }
            />
            {f.isInvestment ? (
              <span />
            ) : (
              <button
                type="button"
                className={styles.remove}
                aria-label={`Quitar ${f.name}`}
                onClick={() => onChange(items.filter(x => x.id !== f.id))}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        className={styles.add}
        onClick={() =>
          onChange([...items, { id: newId(), name: '', amount: 0, dueDay: 1 }])
        }
      >
        + Agregar gasto fijo
      </button>
    </div>
  )
}
