'use client'

import { useState } from 'react'
import { logout } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import type { ExpenseTarget } from '@/lib/finance/types'
import { formatMoney, formatShortDate } from '@/lib/finance/format'
import { useFinance } from '../finance-provider'
import { AddExpenseModal } from './add-expense-modal'
import { BudgetPanel } from './budget-panel'
import styles from './dashboard.module.css'
import { EditModal, type EditKind } from './edit-modal'
import { FixedPanel } from './fixed-panel'
import { MovementsModal } from './movements-modal'
import { OverBudgetModal } from './over-budget-modal'
import { Ring } from './ring'

type Open =
  | { kind: 'add'; target?: ExpenseTarget }
  | { kind: 'movements' | 'over' }
  | { kind: 'edit'; edit: EditKind }
  | null

export function Dashboard({ userName }: { userName: string }) {
  const { summary, reset } = useFinance()
  const [open, setOpen] = useState<Open>(null)
  if (!summary) return null

  const close = () => setOpen(null)
  const { cycle } = summary
  const lastDay = new Date(cycle.end)
  lastDay.setDate(lastDay.getDate() - 1)
  const free = Math.max(summary.available, 0)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.brand}>
          <em>Finanzas</em>
        </p>
        <p className={styles.cycle}>
          {formatShortDate(cycle.start)} — {formatShortDate(lastDay)}
          <span>
            {summary.daysToPayday === 1
              ? 'Mañana te pagan'
              : `${summary.daysToPayday} días para tu pago`}
          </span>
        </p>
        <nav className={styles.nav}>
          <span className={styles.user}>{userName}</span>
          <button
            type="button"
            onClick={() => setOpen({ kind: 'edit', edit: 'profile' })}
          >
            Ingreso
          </button>
          <button type="button" onClick={reset}>
            Reiniciar
          </button>
          <form action={logout}>
            <button type="submit">Salir</button>
          </form>
        </nav>
      </header>

      <main className={styles.grid}>
        <FixedPanel
          summary={summary}
          onEdit={() => setOpen({ kind: 'edit', edit: 'fixed' })}
        />

        <section className={styles.center}>
          <Ring
            income={summary.income}
            spent={summary.spent}
            committed={summary.committed}
            available={summary.available}
          />
          <dl className={styles.stats}>
            <div>
              <dt>
                <i className={styles.dotSpent} /> Gastado
              </dt>
              <dd>{formatMoney(summary.spent)}</dd>
            </div>
            <div>
              <dt>
                <i className={styles.dotCommitted} /> Comprometido
              </dt>
              <dd>{formatMoney(summary.committed)}</dd>
            </div>
            <div>
              <dt>
                <i className={styles.dotFree} /> Libre
              </dt>
              <dd>{formatMoney(free)}</dd>
            </div>
          </dl>
          <div className={styles.actions}>
            <Button type="button" onClick={() => setOpen({ kind: 'add' })}>
              + Registrar gasto
            </Button>
            <Button
              type="button"
              variant="link"
              onClick={() => setOpen({ kind: 'movements' })}
            >
              Movimientos ({summary.cycleExpenses.length})
            </Button>
          </div>
        </section>

        <BudgetPanel
          summary={summary}
          onEdit={() => setOpen({ kind: 'edit', edit: 'categories' })}
          onOver={() => setOpen({ kind: 'over' })}
          onAdd={id =>
            setOpen({ kind: 'add', target: { kind: 'category', id } })
          }
        />
      </main>

      <footer className={styles.ticker}>
        <span className={styles.tickerLabel}>Últimos</span>
        <ul>
          {summary.cycleExpenses.slice(0, 5).map(e => (
            <li key={e.id}>
              {e.description || 'Sin descripción'}{' '}
              <strong>{formatMoney(e.amount)}</strong>
            </li>
          ))}
          {summary.cycleExpenses.length === 0 && (
            <li>Aún no registras gastos este ciclo.</li>
          )}
        </ul>
      </footer>

      <button
        type="button"
        className={styles.fab}
        aria-label="Registrar gasto"
        onClick={() => setOpen({ kind: 'add' })}
      >
        +
      </button>

      <AddExpenseModal
        open={open?.kind === 'add'}
        initialTarget={open?.kind === 'add' ? open.target : undefined}
        onClose={close}
      />
      <MovementsModal open={open?.kind === 'movements'} onClose={close} />
      <OverBudgetModal open={open?.kind === 'over'} onClose={close} />
      <EditModal
        edit={open?.kind === 'edit' ? open.edit : null}
        onClose={close}
      />
    </div>
  )
}
