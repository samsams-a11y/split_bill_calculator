import { currencyDigits, type Currency } from '../types/bill'

export const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER)

export function parseMoney(input: string, currency: Currency): number {
  const value = input.trim()
  const digits = currencyDigits(currency)
  const pattern = /^\d+(?:\.\d{1,2})?$/
  if (!pattern.test(value)) throw new Error('請輸入非負港幣金額，最多兩位小數。')
  const [whole, fraction = ''] = value.split('.')
  const scale = 10n ** BigInt(digits)
  const minor = BigInt(whole) * scale + BigInt((fraction + '0'.repeat(digits)).slice(0, digits) || '0')
  return toSafeNumber(minor, '金額超出可計算範圍。')
}

export function parseQuantity(input: string): number {
  const value = input.trim()
  if (!/^\d+$/.test(value)) throw new Error('數量必須是正整數。')
  const parsed = BigInt(value)
  if (parsed < 1n || parsed > MAX_SAFE) throw new Error('數量必須是安全範圍內的正整數。')
  return Number(parsed)
}

export function parseRate(input: string, discount = false): number {
  const value = input.trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('百分比最多可輸入兩位小數。')
  const [whole, fraction = ''] = value.split('.')
  const basisPoints = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2))
  if (discount && basisPoints > 10000n) throw new Error('折扣百分比不可超過 100%。')
  if (basisPoints > MAX_SAFE) throw new Error('百分比超出可計算範圍。')
  return Number(basisPoints)
}

export function toSafeNumber(value: bigint, message = '金額超出可計算範圍。'): number {
  if (value < 0n || value > MAX_SAFE) throw new Error(message)
  return Number(value)
}

export function multiplySafe(a: number, b: number, message?: string): number {
  return toSafeNumber(BigInt(a) * BigInt(b), message)
}

export function percentAmount(base: number, basisPoints: number): number {
  const numerator = BigInt(base) * BigInt(basisPoints)
  const quotient = numerator / 10000n
  const remainder = numerator % 10000n
  return toSafeNumber(quotient + (remainder * 2n >= 10000n ? 1n : 0n))
}

export function formatMoney(amount: number, currency: Currency): string {
  const digits = currencyDigits(currency)
  const unit = 10n ** BigInt(digits)
  const value = BigInt(amount)
  const whole = value / unit
  const fraction = digits ? `.${String(value % unit).padStart(digits, '0')}` : ''
  return `HK$ ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(whole)}${fraction} ${currency}`
}
