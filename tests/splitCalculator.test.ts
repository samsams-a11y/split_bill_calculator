import { describe, expect, it } from 'vitest'
import type { BillDraft, Currency } from '../src/types/bill'
import { calculateBill, allocate } from '../src/utils/splitCalculator'
import { parseMoney, parseQuantity } from '../src/utils/money'

const p = (id: string) => ({ id, name: id })
function bill(people: string[], items: BillDraft['items'], currency: Currency = 'HKD'): BillDraft {
  return { title: 'Dinner', currency, participants: people.map(p), items, discount: { mode: 'none', value: '' }, tax: { mode: 'none', value: '' }, serviceCharge: { mode: 'none', value: '' } }
}
const item = (id: string, unitPrice: string, participantIds: string[], quantity = '1') => ({ id, name: id, unitPrice, quantity, participantIds })
function expectSuccess(draft: BillDraft) {
  const result = calculateBill(draft)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  const { subtotal, discount, tax, serviceCharge, grandTotal, people } = result.result
  expect(people.reduce((sum, person) => sum + person.itemSubtotal, 0)).toBe(subtotal)
  expect(people.reduce((sum, person) => sum + person.discount, 0)).toBe(discount)
  expect(people.reduce((sum, person) => sum + person.tax, 0)).toBe(tax)
  expect(people.reduce((sum, person) => sum + person.serviceCharge, 0)).toBe(serviceCharge)
  expect(people.reduce((sum, person) => sum + person.total, 0)).toBe(grandTotal)
  for (const line of draft.items) expect(Object.values(result.result.itemShares[line.id]).reduce((sum, amount) => sum + amount, 0)).toBe(parseMoney(line.unitPrice, draft.currency) * parseQuantity(line.quantity))
  return result.result
}

describe('integer allocation and bill calculation', () => {
  it('splits evenly and distributes remainder by stable ID', () => {
    expect(allocate(10000, ['d', 'c', 'b', 'a'].map(id => ({ id, weight: 1 })))).toEqual({ d: 2500, c: 2500, b: 2500, a: 2500 })
    expect(allocate(10000, ['c', 'b', 'a'].map(id => ({ id, weight: 1 })))).toEqual({ c: 3333, b: 3333, a: 3334 })
    expect(allocate(1, ['c', 'b', 'a'].map(id => ({ id, weight: 1 })))).toEqual({ c: 0, b: 0, a: 1 })
    expect(allocate(100, ['c', 'b', 'a'].map(id => ({ id, weight: 1 })))).toEqual({ c: 33, b: 33, a: 34 })
  })
  it('calculates individual, shared, mixed and special-key IDs', () => {
    const mixed = bill(['a', 'b', 'c', 'd'], [item('rice', '40', ['a']), item('pizza', '80', ['a', 'b', 'c', 'd']), item('chicken', '60', ['b', 'c']), item('tea', '15', ['d']), item('cola', '10', ['a'])])
    expect(expectSuccess(mixed).people.map(person => person.itemSubtotal)).toEqual([7000, 5000, 5000, 3500])
    const special = bill(['__proto__'], [item('__proto__', '2', ['__proto__'])])
    expect(expectSuccess(special).itemShares['__proto__']['__proto__']).toBe(200)
    expect(expectSuccess(bill(['a'], [item('two portions', '20', ['a'], '2')])).grandTotal).toBe(4000)
  })
  it('honors HKD two-decimal precision', () => {
    expect(expectSuccess(bill(['a', 'b', 'c', 'd'], [item('meal', '100', ['a', 'b', 'c', 'd'])])).people.map(person => person.itemSubtotal)).toEqual([2500, 2500, 2500, 2500])
    expect(expectSuccess(bill(['a', 'b', 'c'], [item('meal', '100', ['a', 'b', 'c'])])).people.map(person => person.itemSubtotal)).toEqual([3334, 3333, 3333])
    expect(expectSuccess(bill(['a', 'b', 'c'], [item('meal', '0.01', ['a', 'b', 'c'])])).people.map(person => person.itemSubtotal)).toEqual([1, 0, 0])
  })
  it('applies discount before tax and service charge using the same base', () => {
    const draft = bill(['a', 'b'], [item('meal', '200', ['a', 'b'])])
    draft.discount = { mode: 'percent', value: '10' }
    draft.tax = { mode: 'percent', value: '6' }
    draft.serviceCharge = { mode: 'percent', value: '10' }
    const result = expectSuccess(draft)
    expect([result.subtotal, result.discount, result.tax, result.serviceCharge, result.grandTotal]).toEqual([20000, 2000, 1080, 1800, 20880])
  })
  it('supports fixed fees, full discount and zero-consumption participants', () => {
    expect(expectSuccess(bill(['a'], [item('meal', '50', ['a'])])).people[0].itemSubtotal).toBe(5000)
    expect(expectSuccess(bill(['a', 'b'], [item('meal', '60', ['a', 'b'])])).people.map(person => person.itemSubtotal)).toEqual([3000, 3000])
    const draft = bill(['a', 'b', 'idle'], [item('meal', '30', ['a', 'b'])])
    draft.discount = { mode: 'fixed', value: '5.00' }
    draft.tax = { mode: 'fixed', value: '1.01' }
    draft.serviceCharge = { mode: 'fixed', value: '2.00' }
    expect(expectSuccess(draft).grandTotal).toBe(2801)
    draft.discount = { mode: 'percent', value: '100' }
    draft.tax = { mode: 'none', value: '' }
    draft.serviceCharge = { mode: 'none', value: '' }
    expect(expectSuccess(draft).grandTotal).toBe(0)
    const noFood = expectSuccess(bill(['a', 'b'], [item('free', '0', ['a'])]))
    expect(noFood.people.find(person => person.participantId === 'b')?.total).toBe(0)
  })
  it('does not depend on participant or item display ordering', () => {
    const original = bill(['z', 'a', 'm'], [item('second', '0.01', ['m', 'a', 'z']), item('first', '0.02', ['m', 'z', 'a'])])
    const reverse = { ...original, participants: [...original.participants].reverse(), items: [...original.items].reverse() }
    const a = expectSuccess(original), b = expectSuccess(reverse)
    expect(Object.fromEntries(a.people.map(person => [person.participantId, person.total]))).toEqual(Object.fromEntries(b.people.map(person => [person.participantId, person.total])))
  })
  it('rejects bad shares, invalid references, discount over subtotal and overflow', () => {
    expect(calculateBill(bill([], [item('x', '1', [])])).ok).toBe(false)
    expect(calculateBill(bill(['a'], [])).ok).toBe(false)
    expect(calculateBill(bill(['a'], [item('x', '1', [])])).ok).toBe(false)
    expect(calculateBill(bill(['a'], [item('x', '1', ['missing'])])).ok).toBe(false)
    const tooMuch = bill(['a'], [item('x', '1', ['a'])]); tooMuch.discount = { mode: 'fixed', value: '2' }
    expect(calculateBill(tooMuch).ok).toBe(false)
    const overflow = bill(['a'], [item('x', '9007199254740991', ['a'], '2')])
    expect(calculateBill(overflow).ok).toBe(false)
    const aggregateOverflow = bill(['a'], [item('one', '50000000000000', ['a']), item('two', '50000000000000', ['a'])])
    expect(calculateBill(aggregateOverflow).ok).toBe(false)
    const badQuantity = bill(['a'], [item('x', '1', ['a'], '1.5')])
    expect(calculateBill(badQuantity).ok).toBe(false)
    const duplicate = bill(['a', 'a'], [item('x', '1', ['a'])]); duplicate.participants[1].id = 'a'
    expect(calculateBill(duplicate).ok).toBe(false)
    const duplicateItems = bill(['a'], [item('x', '1', ['a']), item('x', '2', ['a'])])
    expect(calculateBill(duplicateItems).ok).toBe(false)
    const invalidAddOn = bill(['a'], [item('x', '1', ['a'])]); invalidAddOn.discount = { mode: 'percent', value: '100' }; invalidAddOn.tax = { mode: 'fixed', value: '0.01' }
    expect(calculateBill(invalidAddOn).ok).toBe(false)
  })
})
