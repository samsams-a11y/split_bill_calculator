export type Currency = 'HKD'
export type ChargeMode = 'none' | 'percent' | 'fixed'

export interface Participant { id: string; name: string }
export interface FoodItem {
  id: string
  name: string
  unitPrice: string
  quantity: string
  participantIds: string[]
}
export interface ChargeDraft { mode: ChargeMode; value: string }
export interface BillDraft {
  title: string
  currency: Currency
  participants: Participant[]
  items: FoodItem[]
  discount: ChargeDraft
  tax: ChargeDraft
  serviceCharge: ChargeDraft
}
export interface PersonResult {
  participantId: string
  itemSubtotal: number
  discount: number
  tax: number
  serviceCharge: number
  total: number
  items: Array<{ itemId: string; name: string; amount: number }>
}
export interface BillResult {
  currency: Currency
  subtotal: number
  discount: number
  tax: number
  serviceCharge: number
  grandTotal: number
  itemShares: Record<string, Record<string, number>>
  people: PersonResult[]
}
export interface ValidationIssue { path: string; message: string }
export type CalculateResult = { ok: true; result: BillResult } | { ok: false; issues: ValidationIssue[] }

export const currencyDigits = (_currency: Currency): 2 => 2

export const emptyBill = (): BillDraft => ({
  title: '', currency: 'HKD', participants: [], items: [],
  discount: { mode: 'none', value: '' },
  tax: { mode: 'none', value: '' },
  serviceCharge: { mode: 'none', value: '' },
})
