// dataKey abierta en IndexedDB. Sobrevive a F5, no a la sesión.
// Es un CryptoKey no exportable: JS puede usarla pero no leer sus bytes.

const DB_NAME = 'finanzas-vault'
const STORE = 'keys'
const SLOT = 'current'

interface StoredKey {
  key: CryptoKey
  userId: string
  expiresAt: number // ms, igual que la cookie
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

export async function saveDataKey(value: StoredKey): Promise<void> {
  await run('readwrite', store => store.put(value, SLOT))
}

// null si no hay, venció o es de otro usuario.
export async function loadDataKey(userId: string): Promise<CryptoKey | null> {
  const stored: unknown = await run('readonly', store => store.get(SLOT))
  if (!isStoredKey(stored)) return null
  if (stored.userId !== userId || stored.expiresAt <= Date.now()) return null
  return stored.key
}

// Nunca lanza: se llama justo antes de salir y no debe bloquear la salida.
export async function clearDataKey(): Promise<void> {
  try {
    await run('readwrite', store => store.delete(SLOT))
  } catch (error) {
    console.error('No se pudo borrar la llave', error)
  }
}

function isStoredKey(value: unknown): value is StoredKey {
  return (
    typeof value === 'object' &&
    value !== null &&
    Reflect.get(value, 'key') instanceof CryptoKey &&
    typeof Reflect.get(value, 'userId') === 'string' &&
    typeof Reflect.get(value, 'expiresAt') === 'number'
  )
}
