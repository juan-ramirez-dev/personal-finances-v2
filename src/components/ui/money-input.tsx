'use client'

import { formatNumber } from '@/lib/finance/format'
import styles from './money-input.module.css'

interface MoneyInputProps {
  value: number
  onChange: (value: number) => void
  label?: string
  size?: 'md' | 'lg'
  autoFocus?: boolean
  name?: string
}

// Muestra miles con punto (es-CO) mientras se escribe. Guarda solo el número.
export function MoneyInput({
  value,
  onChange,
  label,
  size = 'md',
  autoFocus,
  name,
}: MoneyInputProps) {
  return (
    <label className={`${styles.field} ${styles[size]}`}>
      {label && <span className={styles.label}>{label}</span>}
      <span className={styles.control}>
        <span className={styles.prefix}>$</span>
        <input
          name={name}
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="0"
          value={value ? formatNumber(value) : ''}
          onChange={e => onChange(Number(e.target.value.replace(/\D/g, '')))}
        />
      </span>
    </label>
  )
}
