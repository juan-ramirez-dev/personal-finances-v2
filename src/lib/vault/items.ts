import type {
  Category,
  Expense,
  FinanceData,
  FinanceProfile,
  FixedExpense,
  Income,
  Investment,
} from '@/lib/finance/types'
import { decryptItem, encryptItem } from './cipher'
import type { VaultKind, VaultRow } from './rows'

// Fijos y categorías no se borran: los gastos viejos siguen apuntando a ellos.
interface Archivable {
  archivedAt?: string
}

export interface SettingsValue {
  profile: FinanceProfile
  investment: Investment
}

// Un registro ya descifrado. `value` es lo que va dentro del blob (sin id).
export type VaultDoc =
  | { id: string; kind: 'settings'; value: SettingsValue }
  | { id: string; kind: 'fixed'; value: Omit<FixedExpense, 'id'> & Archivable }
  | { id: string; kind: 'category'; value: Omit<Category, 'id'> & Archivable }
  | { id: string; kind: 'expense'; value: Omit<Expense, 'id'> }
  | { id: string; kind: 'income'; value: Omit<Income, 'id'> }

export interface Diff {
  save: VaultDoc[]
  remove: string[]
  // Estado completo después del cambio (incluye archivados). Base del próximo diff.
  docs: VaultDoc[]
}

// null = falta el onboarding (no hay settings).
export function fromItems(docs: VaultDoc[]): FinanceData | null {
  const data: Omit<FinanceData, 'profile' | 'investment'> = {
    fixed: [],
    categories: [],
    expenses: [],
    incomes: [],
  }
  let settings: SettingsValue | null = null

  for (const doc of docs) {
    switch (doc.kind) {
      case 'settings':
        settings = doc.value
        break
      case 'fixed': {
        const { archivedAt, ...fixed } = doc.value
        if (!archivedAt) data.fixed.push({ id: doc.id, ...fixed })
        break
      }
      case 'category': {
        const { archivedAt, ...category } = doc.value
        if (!archivedAt) data.categories.push({ id: doc.id, ...category })
        break
      }
      case 'expense':
        data.expenses.push({ id: doc.id, ...doc.value })
        break
      case 'income':
        data.incomes.push({ id: doc.id, ...doc.value })
        break
    }
  }

  if (!settings) return null
  return {
    ...settings,
    ...data,
    // Mismo orden que mostraba el panel antes del cifrado.
    fixed: data.fixed.sort((a, b) => a.dueDay - b.dueDay),
  }
}

export function toItems(data: FinanceData, settingsId: string): VaultDoc[] {
  const { profile, investment } = data
  return [
    { id: settingsId, kind: 'settings', value: { profile, investment } },
    ...data.fixed.map(
      ({ id, ...value }): VaultDoc => ({
        id,
        kind: 'fixed',
        value,
      }),
    ),
    ...data.categories.map(
      ({ id, ...value }): VaultDoc => ({
        id,
        kind: 'category',
        value,
      }),
    ),
    ...data.expenses.map(
      ({ id, ...value }): VaultDoc => ({
        id,
        kind: 'expense',
        value,
      }),
    ),
    ...data.incomes.map(
      ({ id, ...value }): VaultDoc => ({
        id,
        kind: 'income',
        value,
      }),
    ),
  ]
}

// Solo sube lo que cambió. Fijo/categoría que desaparece se archiva; gasto/ingreso se borra.
export function diffItems(
  prev: VaultDoc[],
  next: FinanceData,
  now: Date,
): Diff {
  const settingsId =
    prev.find(d => d.kind === 'settings')?.id ?? crypto.randomUUID()
  const nextDocs = toItems(next, settingsId)
  const nextById = new Map(nextDocs.map(d => [d.id, d]))
  const prevById = new Map(prev.map(d => [d.id, d]))

  const save = nextDocs.filter(d => {
    const old = prevById.get(d.id)
    return !old || JSON.stringify(old.value) !== JSON.stringify(d.value)
  })
  const remove: string[] = []
  const docs: VaultDoc[] = [...nextDocs]

  for (const old of prev) {
    if (nextById.has(old.id)) continue
    if (old.kind === 'fixed' || old.kind === 'category') {
      if (old.value.archivedAt) {
        docs.push(old)
        continue
      }
      const archivedAt = now.toISOString()
      const archived: VaultDoc =
        old.kind === 'fixed'
          ? { ...old, value: { ...old.value, archivedAt } }
          : { ...old, value: { ...old.value, archivedAt } }
      save.push(archived)
      docs.push(archived)
    } else if (old.kind !== 'settings') {
      remove.push(old.id)
    }
  }

  return { save, remove, docs }
}

export async function encryptDocs(
  key: CryptoKey,
  userId: string,
  docs: VaultDoc[],
): Promise<VaultRow[]> {
  return Promise.all(
    docs.map(async ({ id, kind, value }) => ({
      id,
      kind,
      ...(await encryptItem(key, { userId, id, kind }, value)),
    })),
  )
}

export async function decryptRows(
  key: CryptoKey,
  userId: string,
  rows: VaultRow[],
): Promise<VaultDoc[]> {
  return Promise.all(
    rows.map(async row => {
      const ref: { userId: string; id: string; kind: VaultKind } = {
        userId,
        id: row.id,
        kind: row.kind,
      }
      const value = await decryptItem(key, ref, row)
      // AES-GCM autentica el blob: solo pudo escribirlo este usuario con esta forma.
      return { id: row.id, kind: row.kind, value } as VaultDoc
    }),
  )
}
