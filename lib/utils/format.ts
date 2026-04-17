export function formatCalories(val: number): string {
  return `${Math.round(val)} kcal`
}

export function formatMacro(val: number, unit = 'g'): string {
  return `${Math.round(val)}${unit}`
}

export function formatCurrency(val: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(val)
}

export function formatWeight(val: number): string {
  return `${val.toFixed(1)} kg`
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function truncate(str: string, max = 60): string {
  return str.length > max ? str.slice(0, max) + '…' : str
}
