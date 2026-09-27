'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import field from '@/components/ui/field.module.css'
import { Modal } from '@/components/ui/modal'
import { MoneyInput } from '@/components/ui/money-input'
import { toISODate } from '@/lib/finance/calc'
import { formatMoney } from '@/lib/finance/format'
import type { ExpenseTarget } from '@/lib/finance/types'
import { newId, useFinance } from '../finance-provider'
import styles from './forms.module.css'

const NEW_CATEGORY = '__new'

interface AddExpenseModalProps {
  open: boolean
  initialTarget?: ExpenseTarget
  onClose: () => void
}

export function AddExpenseModal(props: AddExpenseModalProps) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      eyebrow="Nuevo movimiento"
      title="Registrar gasto"
    >
      {/* Se monta de cero en cada apertura: el form arranca limpio. */}
      <AddExpenseForm {...props} />
    </Modal>
  )
}

function AddExpenseForm({ initialTarget, onClose }: AddExpenseModalProps) {
  const { summary, data, addExpense, setCategories } = useFinance()
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(() => toISODate(new Date()))
  const [kind, setKind] = useState<ExpenseTarget['kind']>(
    initialTarget?.kind ?? 'category',
  )
  const [targetId, setTargetId] = useState(initialTarget?.id ?? '')
  const [newName, setNewName] = useState('')
  const [newBudget, setNewBudget] = useState(0)
  if (!summary || !data) return null

  const pendingFixed = summary.fixed.filter(f => !f.isPaid)
  const isNew = kind === 'category' && targetId === NEW_CATEGORY
  const valid =
    amount > 0 && (isNew ? newName.trim().length > 0 : targetId !== '')

  const pickFixed = (id: string) => {
    setTargetId(id)
    const status = summary.fixed.find(f => f.fixed.id === id)
    if (status && amount === 0) setAmount(status.pending)
    if (status && !description) setDescription(status.fixed.name)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    let id = targetId
    if (isNew) {
      id = newId()
      setCategories([
        ...data.categories,
        { id, name: newName.trim(), budget: newBudget },
      ])
    }
    addExpense({
      amount,
      description: description.trim(),
      date,
      target: { kind, id },
    })
    onClose()
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
            placeholder="Ej. Cena con ella"
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

      <div className={styles.segment} role="radiogroup" aria-label="Tipo">
        {(['category', 'fixed'] as const).map(k => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => {
              setKind(k)
              setTargetId('')
            }}
          >
            {k === 'category' ? 'Categoría' : 'Gasto fijo'}
          </button>
        ))}
      </div>

      {kind === 'category' ? (
        <div className={styles.options}>
          {data.categories.map(c => (
            <button
              key={c.id}
              type="button"
              className={styles.option}
              aria-pressed={targetId === c.id}
              onClick={() => setTargetId(c.id)}
            >
              {c.name}
            </button>
          ))}
          <button
            type="button"
            className={styles.option}
            aria-pressed={isNew}
            onClick={() => setTargetId(NEW_CATEGORY)}
          >
            + Nueva
          </button>
        </div>
      ) : (
        <div className={styles.options}>
          {pendingFixed.map(({ fixed, pending }) => (
            <button
              key={fixed.id}
              type="button"
              className={styles.option}
              aria-pressed={targetId === fixed.id}
              onClick={() => pickFixed(fixed.id)}
            >
              {fixed.name} <small>{formatMoney(pending)}</small>
            </button>
          ))}
          {pendingFixed.length === 0 && (
            <p className={styles.hint}>Todos los fijos están pagados.</p>
          )}
        </div>
      )}

      {isNew && (
        <div className={styles.row}>
          <label className={field.field}>
            <span className={field.label}>Nombre de la categoría</span>
            <input
              className={field.input}
              placeholder="Ej. Regalos"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
          </label>
          <MoneyInput
            label="Presupuesto (opcional)"
            value={newBudget}
            onChange={setNewBudget}
          />
        </div>
      )}

      <footer className={styles.footer}>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!valid}>
          Guardar gasto
        </Button>
      </footer>
    </form>
  )
}
