'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { syncInvestmentFixed, unassigned } from '@/lib/finance/calc'
import { formatMoney } from '@/lib/finance/format'
import type {
  Category,
  FinanceProfile,
  FixedExpense,
  Investment,
} from '@/lib/finance/types'
import { CategoryEditor } from '../editors/category-editor'
import { FixedEditor } from '../editors/fixed-editor'
import { InvestmentEditor } from '../editors/investment-editor'
import { ProfileEditor } from '../editors/profile-editor'
import { useFinance } from '../finance-provider'
import styles from './onboarding.module.css'

const STEPS = [
  {
    label: 'Ingreso',
    title: '¿Cuánto entra cada mes?',
    hint: 'Lo que llega a tu cuenta, ya sin descuentos.',
  },
  {
    label: 'Fijos',
    title: 'Tus gastos fijos',
    hint: 'Lo que pagas sí o sí cada mes: arriendo, servicios, planes.',
  },
  {
    label: 'Categorías',
    title: 'Presupuesto por categoría',
    hint: 'Lo variable. Te avisamos cuando te pases.',
  },
  {
    label: 'Inversiones',
    title: '¿Tienes inversiones?',
    hint: 'Sin metas por ahora. Solo para tenerlas en cuenta.',
  },
  {
    label: 'Resumen',
    title: 'Así queda tu mes',
    hint: 'Puedes cambiar todo después desde el panel.',
  },
]

const cleanFixed = (items: FixedExpense[]) =>
  items.filter(f => f.isInvestment || (f.name.trim() && f.amount > 0))
const cleanCategories = (items: Category[]) => items.filter(c => c.name.trim())

export function Onboarding({ userName }: { userName: string }) {
  const finance = useFinance()
  const saved = finance.draft
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()
  // Arranca con lo ya guardado: si recargas a mitad, retomas donde ibas.
  const [profile, setProfile] = useState<FinanceProfile>(
    saved?.profile ?? { monthlyIncome: 0, payday: 30 },
  )
  const [fixed, setFixed] = useState<FixedExpense[]>(saved?.fixed ?? [])
  const [categories, setCategories] = useState<Category[]>(
    saved?.categories ?? [],
  )
  const [investment, setInvestment] = useState<Investment>(
    saved?.investment ?? {
      hasInvestments: false,
      monthlyContribution: 0,
      totalBalance: 0,
    },
  )

  // Cada paso se guarda al avanzar. El último cierra el onboarding.
  const saveStep = () => {
    if (step === 0) return finance.setProfile(profile)
    if (step === 1) return finance.setFixed(cleanFixed(fixed))
    if (step === 2) return finance.setCategories(cleanCategories(categories))
    if (step === 3) return finance.setInvestment(investment)
    return finance.complete()
  }

  const draft = {
    profile,
    fixed: syncInvestmentFixed(cleanFixed(fixed), investment),
    categories: cleanCategories(categories),
    investment,
  }
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const canContinue = step !== 0 || profile.monthlyIncome > 0

  return (
    <main className={styles.page}>
      <aside className={styles.side}>
        <p className={styles.issue}>Hola, {userName}</p>
        <p key={step} className={styles.number}>
          {String(step + 1).padStart(2, '0')}
        </p>
        <ol className={styles.steps}>
          {STEPS.map((s, i) => (
            <li
              key={s.label}
              className={styles.step}
              data-state={i === step ? 'current' : i < step ? 'done' : 'next'}
            >
              <span>{String(i + 1).padStart(2, '0')}</span> {s.label}
            </li>
          ))}
        </ol>
      </aside>

      <section className={styles.content}>
        <Progress
          className={styles.progress}
          value={(step + 1) / STEPS.length}
          tone="primary"
        />

        <form
          key={step}
          className={styles.form}
          onSubmit={e => {
            e.preventDefault()
            if (!canContinue || saving) return
            startSaving(async () => {
              const failed = await saveStep()
              setError(failed)
              if (!failed && !isLast) setStep(step + 1)
            })
          }}
        >
          <div className={styles.heading}>
            <p className={styles.eyebrow}>
              Paso {step + 1} de {STEPS.length} · {current.label}
            </p>
            <h1 className={styles.title}>{current.title}</h1>
            <p className={styles.hint}>{current.hint}</p>
          </div>

          <div className={styles.body}>
            {step === 0 && (
              <ProfileEditor value={profile} onChange={setProfile} />
            )}
            {step === 1 && <FixedEditor items={fixed} onChange={setFixed} />}
            {step === 2 && (
              <CategoryEditor items={categories} onChange={setCategories} />
            )}
            {step === 3 && (
              <InvestmentEditor value={investment} onChange={setInvestment} />
            )}
            {step === 4 && <Recap draft={draft} />}
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <footer className={styles.footer}>
            <Button
              type="button"
              variant="outline"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
            >
              Atrás
            </Button>
            <Button type="submit" disabled={!canContinue || saving}>
              {saving ? 'Guardando…' : isLast ? 'Entrar' : 'Siguiente'}
            </Button>
          </footer>
        </form>
      </section>
    </main>
  )
}

function Recap({ draft }: { draft: Parameters<typeof unassigned>[0] }) {
  const fixedTotal = draft.fixed.reduce((sum, f) => sum + f.amount, 0)
  const budgetTotal = draft.categories.reduce((sum, c) => sum + c.budget, 0)
  const free = unassigned(draft)
  const rows = [
    [
      'Ingreso',
      draft.profile.monthlyIncome,
      `Pago el día ${draft.profile.payday}`,
    ],
    ['Gastos fijos', -fixedTotal, `${draft.fixed.length} fijos`],
    ['Presupuestos', -budgetTotal, `${draft.categories.length} categorías`],
  ] as const

  return (
    <div className={styles.recap}>
      {rows.map(([label, amount, note]) => (
        <div key={label} className={styles.recapRow}>
          <span className={styles.recapLabel}>
            {label}
            <small>{note}</small>
          </span>
          <span className={styles.recapAmount}>{formatMoney(amount)}</span>
        </div>
      ))}
      <div className={`${styles.recapRow} ${styles.recapTotal}`}>
        <span className={styles.recapLabel}>
          Sin asignar
          <small>
            {free < 0
              ? 'Tus planes superan tu ingreso'
              : 'Margen libre cada mes'}
          </small>
        </span>
        <span
          className={styles.recapAmount}
          data-negative={free < 0 || undefined}
        >
          {formatMoney(free)}
        </span>
      </div>
      {draft.investment.hasInvestments && (
        <p className={styles.hint}>
          Inversiones: {formatMoney(draft.investment.totalBalance)} acumulado.
        </p>
      )}
    </div>
  )
}
