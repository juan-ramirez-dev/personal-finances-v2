'use client'

import { MoneyInput } from '@/components/ui/money-input'
import type { Investment } from '@/lib/finance/types'
import styles from './editor.module.css'

interface InvestmentEditorProps {
  value: Investment
  onChange: (value: Investment) => void
}

export function InvestmentEditor({ value, onChange }: InvestmentEditorProps) {
  return (
    <div className={styles.stack}>
      <div className={styles.toggle} role="radiogroup" aria-label="Inversiones">
        {[true, false].map(option => (
          <button
            key={String(option)}
            type="button"
            role="radio"
            aria-checked={value.hasInvestments === option}
            className={styles.toggleOption}
            onClick={() => onChange({ ...value, hasInvestments: option })}
          >
            {option ? 'Sí, invierto' : 'Todavía no'}
          </button>
        ))}
      </div>
      {value.hasInvestments && (
        <div className={styles.pair}>
          <MoneyInput
            label="Aporte mensual"
            value={value.monthlyContribution}
            onChange={monthlyContribution =>
              onChange({ ...value, monthlyContribution })
            }
          />
          <MoneyInput
            label="Saldo total invertido"
            value={value.totalBalance}
            onChange={totalBalance => onChange({ ...value, totalBalance })}
          />
          <p className={styles.hint}>
            El aporte mensual se vuelve un gasto fijo. El saldo es solo
            informativo.
          </p>
        </div>
      )}
    </div>
  )
}
