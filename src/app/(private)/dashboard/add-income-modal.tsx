'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import field from '@/components/ui/field.module.css'
import { Modal } from '@/components/ui/modal'
import { MoneyInput } from '@/components/ui/money-input'
import { toISODate } from '@/lib/finance/calc'
import { useFinance } from '../finance-provider'
import styles from './forms.module.css'

interface AddIncomeModalProps {
  open: boolean
  onClose: () => void
}

export function AddIncomeModal(props: AddIncomeModalProps) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      eyebrow="Plata extra"
      title="Registrar ingreso"
    >
      {/* Se monta de cero en cada apertura: el form arranca limpio. */}
      <AddIncomeForm {...props} />
    </Modal>
  )
}

function AddIncomeForm({ onClose }: AddIncomeModalProps) {
  const { addIncome } = useFinance()
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(() => toISODate(new Date()))
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (amount <= 0 || saving) return
    startSaving(async () => {
      const failed = await addIncome({
        amount,
        description: description.trim(),
        date,
      })
      if (failed) setError(failed)
      else onClose()
    })
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <MoneyInput
        label="Monto"
        size="lg"
        autoFocus
        value={amount}
        onChange={setAmount}
      />

      <div className={styles.row}>
        <label className={field.field}>
          <span className={field.label}>Descripción</span>
          <input
            className={field.input}
            placeholder="Ej. Bono, trabajo extra"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </label>
        <label className={`${field.field} ${styles.narrow}`}>
          <span className={field.label}>Fecha</span>
          <input
            className={field.input}
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </label>
      </div>

      <p className={styles.hint}>
        Solo suma al disponible del ciclo en que cae la fecha.
      </p>

      {error && <p className={styles.error}>{error}</p>}

      <footer className={styles.footer}>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={amount <= 0 || saving}>
          {saving ? 'Guardando…' : 'Guardar ingreso'}
        </Button>
      </footer>
    </form>
  )
}
