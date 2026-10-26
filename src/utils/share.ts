import type { BillDraft, BillResult } from '../types/bill'
import { formatMoney } from './money'

export function participantLabels(people: BillDraft['participants']): Map<string, string> {
  const grouped = new Map<string, string[]>()
  for (const person of people) grouped.set(person.name.trim(), [...(grouped.get(person.name.trim()) ?? []), person.id])
  const labels = new Map<string, string>()
  for (const [name, ids] of grouped) {
    ids.sort((a, b) => a < b ? -1 : a > b ? 1 : 0)
    ids.forEach((id, i) => labels.set(id, ids.length > 1 ? `${name}（${i + 1}）` : name))
  }
  return labels
}

export function makeSummary(draft: BillDraft, result: BillResult): string {
  const labels = participantLabels(draft.participants)
  const lines = [`🍽️ ${draft.title.trim() || '聚餐分帳'}`, '']
  for (const person of result.people) {
    lines.push(`${labels.get(person.participantId) ?? '參與者'}：${formatMoney(person.total, result.currency)}`)
    for (const item of person.items) lines.push(`  ${item.name}：${formatMoney(item.amount, result.currency)}`)
  }
  lines.push('', `菜品總額：${formatMoney(result.subtotal, result.currency)}`, `折扣：−${formatMoney(result.discount, result.currency)}`, `稅費：${formatMoney(result.tax, result.currency)}`, `服務費：${formatMoney(result.serviceCharge, result.currency)}`, `應收總額：${formatMoney(result.grandTotal, result.currency)}`)
  return lines.join('\n')
}
