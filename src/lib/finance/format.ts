const money = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const number = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

const shortDate = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
})

export function formatMoney(value: number) {
  return money.format(value)
}

export function formatNumber(value: number) {
  return number.format(value)
}

export function formatShortDate(date: Date) {
  return shortDate.format(date).replace('.', '')
}
