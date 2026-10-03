'use client'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { Summary } from '@/lib/finance/calc'
import { formatMoney } from '@/lib/finance/format'
import styles from './panel.module.css'

interface BudgetPanelProps {
  summary: Summary
  onEdit: () => void
  onOver: () => void
  onAdd: (categoryId: string) => void
}

export function BudgetPanel({
  summary,
  onEdit,
  onOver,
  onAdd,
}: BudgetPanelProps) {
  const over = summary.overBudget
  const overTotal = over.reduce((sum, c) => sum + c.over, 0)
  const spent = summary.categories.reduce((sum, c) => sum + c.spent, 0)
  const budget = summary.categories.reduce(
    (sum, c) => sum + c.category.budget,
    0,
  )
  // Las más cerca de pasarse, arriba.
  const items = [...summary.categories].sort((a, b) => b.ratio - a.ratio)

  return (
    <section className={styles.panel}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>II · Presupuestos</p>
        <h2 className={styles.title}>
          {budget ? Math.round((spent / budget) * 100) : 0}
          <span>% usado</span>
        </h2>
        {over.length > 0 ? (
          <button type="button" className={styles.alert} onClick={onOver}>
            <strong>
              {over.length} {over.length === 1 ? 'excedido' : 'excedidos'}
            </strong>
            <span>+{formatMoney(overTotal)} sobre lo planeado →</span>
          </button>
        ) : (
          <p className={styles.ok}>Todo dentro del presupuesto.</p>
        )}
      </header>

      <ul className={styles.list}>
        {items.map(({ category, spent, ratio, over }) => {
          const noBudget = category.budget === 0
          return (
            <li key={category.id}>
              <button
                type="button"
                className={styles.budgetRow}
                data-over={(over > 0 && !noBudget) || undefined}
                onClick={() => onAdd(category.id)}
                title={`Registrar gasto en ${category.name}`}
              >
                <span className={styles.name}>
                  {category.name}
                  <small>
                    {noBudget
                      ? 'Sin presupuesto'
                      : over > 0
                        ? `+${formatMoney(over)}`
                        : `Quedan ${formatMoney(category.budget - spent)}`}
                  </small>
                </span>
                <span className={styles.amount}>
                  {formatMoney(spent)}
                  <small>/ {formatMoney(category.budget)}</small>
                </span>
                <Progress
                  className={styles.bar}
                  value={noBudget ? 0 : ratio}
                  tone={
                    over > 0 && !noBudget
                      ? 'warning'
                      : ratio >= 0.8
                        ? 'muted'
                        : 'ink'
                  }
                />
              </button>
            </li>
          )
        })}
        {items.length === 0 && (
          <li className={styles.empty}>Sin categorías. Agrégalas.</li>
        )}
      </ul>

      <footer className={styles.foot}>
        <span>
          {formatMoney(spent)} de <strong>{formatMoney(budget)}</strong>
        </span>
        <Button type="button" variant="link" onClick={onEdit}>
          Editar
        </Button>
      </footer>
    </section>
  )
}
