import type { BillDraft, BillResult, CalculateResult, PersonResult, ValidationIssue } from '../types/bill'
import { multiplySafe, parseMoney, parseQuantity, parseRate, percentAmount, toSafeNumber } from './money'
import { validateBill } from './validation'

export interface Weight { id: string; weight: number }

export function allocate(amount: number, weights: Weight[]): Record<string, number> {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('分配金額無效。')
  const totalWeight = weights.reduce((sum, entry) => sum + BigInt(entry.weight), 0n)
  if (weights.some(entry => !Number.isSafeInteger(entry.weight) || entry.weight < 0) || (amount > 0 && totalWeight === 0n)) throw new Error('分攤比例無效。')
  const result: Record<string, number> = Object.fromEntries(weights.map(entry => [entry.id, 0]))
  if (amount === 0) return result
  const amountBig = BigInt(amount)
  let assigned = 0n
  const remainders = weights.map(entry => {
    const product = amountBig * BigInt(entry.weight)
    const quotient = product / totalWeight
    const remainder = product % totalWeight
    result[entry.id] = Number(quotient)
    assigned += quotient
    return { id: entry.id, remainder }
  })
  const remaining = amountBig - assigned
  remainders.sort((a, b) => a.remainder === b.remainder ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : (a.remainder > b.remainder ? -1 : 1))
  for (let index = 0; BigInt(index) < remaining; index++) result[remainders[index].id]++
  return result
}

const add = (a: number, b: number): number => toSafeNumber(BigInt(a) + BigInt(b), '整單金額超出安全計算範圍。')

function chargeAmount(charge: BillDraft['discount'], base: number, currency: BillDraft['currency']): number {
  if (charge.mode === 'none') return 0
  return charge.mode === 'percent' ? percentAmount(base, parseRate(charge.value, false)) : parseMoney(charge.value, currency)
}

export function calculateBill(draft: BillDraft): CalculateResult {
  const issues: ValidationIssue[] = validateBill(draft)
  if (issues.length) return { ok: false, issues }
  try {
    const people = new Map<string, PersonResult>(draft.participants.map(person => [person.id, {
      participantId: person.id, itemSubtotal: 0, discount: 0, tax: 0, serviceCharge: 0, total: 0, items: [],
    } satisfies PersonResult]))
    const itemShares: BillResult['itemShares'] = {}
    let subtotal = 0
    for (const item of draft.items) {
      const lineTotal = multiplySafe(parseMoney(item.unitPrice, draft.currency), parseQuantity(item.quantity), '菜品小計超出安全計算範圍。')
      const shares = allocate(lineTotal, item.participantIds.map(id => ({ id, weight: 1 })))
      Object.defineProperty(itemShares, item.id, { value: shares, enumerable: true, configurable: true, writable: true })
      let shareTotal = 0
      for (const [id, amount] of Object.entries(shares)) {
        const person = people.get(id)!
        person.itemSubtotal = add(person.itemSubtotal, amount)
        person.items.push({ itemId: item.id, name: item.name.trim(), amount })
        shareTotal = add(shareTotal, amount)
      }
      if (shareTotal !== lineTotal) throw new Error('菜品分攤金額未能守恆。')
      subtotal = add(subtotal, lineTotal)
    }
    const discount = chargeAmount(draft.discount, subtotal, draft.currency)
    if (discount > subtotal) return { ok: false, issues: [{ path: 'discount', message: '折扣不可高於菜品總額。' }] }
    const peopleList = [...people.values()]
    const discounts = allocate(discount, peopleList.map(person => ({ id: person.participantId, weight: person.itemSubtotal })))
    for (const person of peopleList) {
      person.discount = discounts[person.participantId]
      if (person.discount > person.itemSubtotal) throw new Error('折扣分配造成個人折抵超額。')
    }
    const afterDiscount = subtotal - discount
    const tax = chargeAmount(draft.tax, afterDiscount, draft.currency)
    const serviceCharge = chargeAmount(draft.serviceCharge, afterDiscount, draft.currency)
    if (afterDiscount === 0 && (tax > 0 || serviceCharge > 0)) return { ok: false, issues: [{ path: 'tax', message: '折扣後金額為零，不能分配非零稅費或服務費。' }] }
    const postDiscountWeights = peopleList.map(person => ({ id: person.participantId, weight: person.itemSubtotal - person.discount }))
    const taxes = allocate(tax, postDiscountWeights)
    const services = allocate(serviceCharge, postDiscountWeights)
    for (const person of peopleList) {
      person.tax = taxes[person.participantId]
      person.serviceCharge = services[person.participantId]
      person.total = add(add(person.itemSubtotal - person.discount, person.tax), person.serviceCharge)
    }
    const grandTotal = add(add(afterDiscount, tax), serviceCharge)
    const exactSum = (field: 'itemSubtotal' | 'discount' | 'tax' | 'serviceCharge' | 'total') => peopleList.reduce((sum, person) => add(sum, person[field]), 0)
    if (exactSum('itemSubtotal') !== subtotal || exactSum('discount') !== discount || exactSum('tax') !== tax || exactSum('serviceCharge') !== serviceCharge || exactSum('total') !== grandTotal) throw new Error('整單金額驗算未通過。')
    return { ok: true, result: { currency: draft.currency, subtotal, discount, tax, serviceCharge, grandTotal, itemShares, people: peopleList } }
  } catch (error) {
    return { ok: false, issues: [{ path: 'calculation', message: (error as Error).message || '計算失敗，請檢查金額。' }] }
  }
}
