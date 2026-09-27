'use client'

import field from '@/components/ui/field.module.css'
import { MoneyInput } from '@/components/ui/money-input'
import type { FinanceProfile } from '@/lib/finance/types'
import styles from './editor.module.css'

interface ProfileEditorProps {
  value: FinanceProfile
  onChange: (value: FinanceProfile) => void
}

export function ProfileEditor({ value, onChange }: ProfileEditorProps) {
  return (
    <div className={styles.stack}>
      <MoneyInput
        label="Ingreso mensual neto"
        size="lg"
        autoFocus
        value={value.monthlyIncome}
        onChange={monthlyIncome => onChange({ ...value, monthlyIncome })}
      />
      <label className={field.field}>
        <span className={field.label}>Día en que te pagan</span>
        <input
          className={`${field.input} ${styles.day}`}
          type="number"
          min={1}
          max={31}
          value={value.payday}
          onChange={e =>
            onChange({
              ...value,
              payday: Math.min(31, Math.max(1, Number(e.target.value))),
            })
          }
        />
        <span className={styles.hint}>
          Tu mes va de pago a pago. Si el mes no tiene ese día, se toma el
          último.
        </span>
      </label>
    </div>
  )
}
