import type { BillDraft, ChargeDraft, ValidationIssue } from '../types/bill'
import { parseMoney, parseQuantity, parseRate } from './money'

const nameValid = (value: string) => typeof value === 'string' && value.trim().length > 0
const idValid = (value: unknown): value is string => typeof value === 'string' && value.length > 0

export function validateBill(draft: BillDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (String(draft.currency) !== 'HKD') issues.push({ path: 'currency', message: '目前只支援港幣 HKD。' })
  if (!Array.isArray(draft.participants) || draft.participants.length === 0) issues.push({ path: 'participants', message: '請至少新增一位參與者。' })
  if (!Array.isArray(draft.items) || draft.items.length === 0) issues.push({ path: 'items', message: '請至少新增一道菜品。' })
  const ids = new Set<string>()
  for (const [index, person] of (draft.participants ?? []).entries()) {
    if (!person || !idValid(person.id) || ids.has(person.id)) issues.push({ path: `participants.${index}.id`, message: '參與者識別資料無效或重複。' })
    else ids.add(person.id)
    if (!person || !nameValid(person.name)) issues.push({ path: `participants.${index}.name`, message: '請輸入參與者姓名。' })
  }
  const itemIds = new Set<string>()
  for (const [index, item] of (draft.items ?? []).entries()) {
    if (!item || !idValid(item.id) || itemIds.has(item.id)) issues.push({ path: `items.${index}.id`, message: '菜品識別資料無效或重複。' })
    else itemIds.add(item.id)
    if (!item || !nameValid(item.name)) issues.push({ path: `items.${index}.name`, message: '請輸入菜品名稱。' })
    if (!item) continue
    try { parseMoney(item.unitPrice, draft.currency) } catch (error) { issues.push({ path: `items.${index}.unitPrice`, message: (error as Error).message }) }
    try { parseQuantity(item.quantity) } catch (error) { issues.push({ path: `items.${index}.quantity`, message: (error as Error).message }) }
    const refs = item.participantIds ?? []
    if (!refs.length) issues.push({ path: `items.${index}.participants`, message: '請至少選擇一位分攤人員。' })
    if (new Set(refs).size !== refs.length || refs.some(id => !ids.has(id))) issues.push({ path: `items.${index}.participants`, message: '分攤人員資料無效，請重新選擇。' })
  }
  for (const [key, charge, isDiscount] of [
    ['discount', draft.discount, true], ['tax', draft.tax, false], ['serviceCharge', draft.serviceCharge, false],
  ] as Array<[string, ChargeDraft, boolean]>) {
    if (!charge || !['none', 'percent', 'fixed'].includes(charge.mode)) { issues.push({ path: key, message: '費用設定無效。' }); continue }
    if (charge.mode === 'none') continue
    try {
      if (charge.mode === 'percent') parseRate(charge.value, isDiscount)
      else parseMoney(charge.value, draft.currency)
    } catch (error) { issues.push({ path: key, message: (error as Error).message }) }
  }
  return issues
}

export function isBillDraft(value: unknown): value is BillDraft {
  if (!value || typeof value !== 'object') return false
  const bill = value as Partial<BillDraft>
  return typeof bill.title === 'string' && bill.currency === 'HKD' &&
    Array.isArray(bill.participants) && bill.participants.every(p => p && idValid(p.id) && typeof p.name === 'string') &&
    Array.isArray(bill.items) && bill.items.every(i => i && idValid(i.id) && typeof i.name === 'string' && typeof i.unitPrice === 'string' && typeof i.quantity === 'string' && Array.isArray(i.participantIds) && i.participantIds.every(idValid)) &&
    [bill.discount, bill.tax, bill.serviceCharge].every(c => c && ['none', 'percent', 'fixed'].includes(c.mode) && typeof c.value === 'string')
}

export function isPersistableBill(value: unknown): value is BillDraft {
  if (!isBillDraft(value)) return false
  const bill = value
  const participantIds = bill.participants.map(person => person.id)
  const itemIds = bill.items.map(item => item.id)
  const unique = (ids: string[]) => new Set(ids).size === ids.length
  return unique(participantIds) && unique(itemIds) &&
    bill.items.every(item => new Set(item.participantIds).size === item.participantIds.length && item.participantIds.every(id => participantIds.includes(id)))
}
