import type { BillDraft } from '../types/bill'
import { emptyBill } from '../types/bill'
import { isPersistableBill } from './validation'

export const STORAGE_KEY = 'split-bill-calculator:v1'
export type LoadState = { kind: 'ready' } | { kind: 'corrupt'; raw: string; reason: string } | { kind: 'unavailable'; reason: string }

export function loadBill(storage: Storage): { bill: BillDraft; state: LoadState } {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw === null) return { bill: emptyBill(), state: { kind: 'ready' } }
    try {
      const data: unknown = JSON.parse(raw)
      if (!data || typeof data !== 'object' || (data as { version?: unknown }).version !== 1) {
        return { bill: emptyBill(), state: { kind: 'corrupt', raw, reason: '保存資料格式不相容或已損壞。' } }
      }
      const storedBill = (data as { bill?: unknown }).bill
      if (storedBill && typeof storedBill === 'object' && typeof (storedBill as { currency?: unknown }).currency === 'string' && (storedBill as { currency: string }).currency !== 'HKD') {
        return { bill: emptyBill(), state: { kind: 'corrupt', raw, reason: '舊帳單使用其他貨幣，目前僅支援港幣 HKD。' } }
      }
      if (!isPersistableBill(storedBill)) return { bill: emptyBill(), state: { kind: 'corrupt', raw, reason: '保存資料格式不相容或已損壞。' } }
      return { bill: (data as { bill: BillDraft }).bill, state: { kind: 'ready' } }
    } catch {
      return { bill: emptyBill(), state: { kind: 'corrupt', raw, reason: '保存資料無法讀取，原始內容仍保留在瀏覽器。' } }
    }
  } catch {
    return { bill: emptyBill(), state: { kind: 'unavailable', reason: '瀏覽器不允許讀取本機保存資料。' } }
  }
}

export function saveBill(storage: Storage, bill: BillDraft): void {
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, bill }))
}
