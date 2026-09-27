'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import type { FinanceData } from '@/lib/finance/types'
import { CategoryEditor } from '../editors/category-editor'
import { FixedEditor } from '../editors/fixed-editor'
import { InvestmentEditor } from '../editors/investment-editor'
import { ProfileEditor } from '../editors/profile-editor'
import { useFinance } from '../finance-provider'
import styles from './forms.module.css'

export type EditKind = 'fixed' | 'categories' | 'profile'

const TITLES: Record<EditKind, [string, string]> = {
  fixed: ['Ajustes', 'Gastos fijos'],
  categories: ['Ajustes', 'Categorías y presupuestos'],
  profile: ['Ajustes', 'Ingreso e inversiones'],
}

interface EditModalProps {
  edit: EditKind | null
  onClose: () => void
}

export function EditModal({ edit, onClose }: EditModalProps) {
  const { data } = useFinance()
  const [eyebrow, title] = TITLES[edit ?? 'fixed']
  return (
    <Modal
      open={edit !== null}
      onClose={onClose}
      eyebrow={eyebrow}
      title={title}
      wide
    >
      {edit && data && <EditForm edit={edit} data={data} onClose={onClose} />}
    </Modal>
  )
}

// Borrador local: nada cambia en el panel hasta "Guardar".
function EditForm({
  edit,
  data,
  onClose,
}: {
  edit: EditKind
  data: FinanceData
  onClose: () => void
}) {
  const { setFixed, setCategories, setProfile, setInvestment } = useFinance()
  const [fixed, setFixedDraft] = useState(data.fixed)
  const [categories, setCategoriesDraft] = useState(data.categories)
  const [profile, setProfileDraft] = useState(data.profile)
  const [investment, setInvestmentDraft] = useState(data.investment)

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (edit === 'fixed') {
      setFixed(
        fixed.filter(f => f.isInvestment || (f.name.trim() && f.amount > 0)),
      )
    }
    if (edit === 'categories') {
      setCategories(categories.filter(c => c.name.trim()))
    }
    if (edit === 'profile') {
      setProfile(profile)
      setInvestment(investment)
    }
    onClose()
  }

  return (
    <form className={styles.form} onSubmit={save}>
      {edit === 'fixed' && (
        <FixedEditor items={fixed} onChange={setFixedDraft} />
      )}
      {edit === 'categories' && (
        <CategoryEditor items={categories} onChange={setCategoriesDraft} />
      )}
      {edit === 'profile' && (
        <>
          <ProfileEditor value={profile} onChange={setProfileDraft} />
          <InvestmentEditor value={investment} onChange={setInvestmentDraft} />
        </>
      )}
      <footer className={styles.footer}>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={edit === 'profile' && profile.monthlyIncome <= 0}
        >
          Guardar
        </Button>
      </footer>
    </form>
  )
}
