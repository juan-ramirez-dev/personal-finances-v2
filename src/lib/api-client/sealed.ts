import { openField, sealField, type Sealed } from '@/lib/vault/cipher'

export type SealedTable =
  | 'finance_settings'
  | 'investments'
  | 'fixed_expenses'
  | 'categories'
  | 'expenses'
  | 'incomes'

// Cifra y descifra celdas de un usuario. `column` es el nombre real en la DB.
// Settings e investments usan el userId como id de fila.
export function createSealer(key: CryptoKey, userId: string) {
  const ref = (table: SealedTable, id: string, column: string) => ({
    userId,
    table,
    id,
    column,
  })

  return {
    seal(
      table: SealedTable,
      id: string,
      column: string,
      value: number | string,
    ): Promise<Sealed> {
      return sealField(key, ref(table, id, column), value)
    },

    async number(
      table: SealedTable,
      id: string,
      column: string,
      sealed: Sealed,
    ): Promise<number> {
      const value = await openField(key, ref(table, id, column), sealed)
      if (typeof value !== 'number') throw new Error('Valor cifrado inesperado')
      return value
    },

    async text(
      table: SealedTable,
      id: string,
      column: string,
      sealed: Sealed,
    ): Promise<string> {
      const value = await openField(key, ref(table, id, column), sealed)
      if (typeof value !== 'string') throw new Error('Valor cifrado inesperado')
      return value
    },
  }
}
