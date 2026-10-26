import { describe, expect, it, vi } from 'vitest'
import { emptyBill } from '../src/types/bill'
import { loadBill, saveBill, STORAGE_KEY } from '../src/utils/storage'

function memoryStorage(initial: string | null = null): Storage {
  let value = initial
  return {
    get length() { return value === null ? 0 : 1 }, clear() { value = null }, key() { return value === null ? null : STORAGE_KEY },
    getItem: vi.fn(() => value), removeItem: vi.fn(() => { value = null }), setItem: vi.fn((_key: string, next: string) => { value = next }),
  } as unknown as Storage
}

describe('versioned local storage', () => {
  it('starts clean, saves and restores editable unfinished drafts', () => {
    const storage = memoryStorage()
    const draft = emptyBill()
    draft.participants = [{ id: 'a', name: 'Alex' }]
    draft.items = [{ id: 'x', name: 'Meal', unitPrice: '1.', quantity: '1', participantIds: ['a'] }]
    saveBill(storage, draft)
    expect(JSON.parse((storage.setItem as ReturnType<typeof vi.fn>).mock.calls[0][1])).toEqual({ version: 1, bill: draft })
    expect(loadBill(storage)).toEqual({ bill: draft, state: { kind: 'ready' } })
  })
  it('preserves corrupt, incompatible, duplicate-ID and dangling-reference records', () => {
    for (const raw of ['{', JSON.stringify({ version: 2, bill: emptyBill() }), JSON.stringify({ version: 1, bill: { ...emptyBill(), participants: [{ id: 'a', name: 'A' }, { id: 'a', name: 'B' }] } }), JSON.stringify({ version: 1, bill: { ...emptyBill(), participants: [{ id: 'a', name: 'A' }], items: [{ id: 'x', name: 'Meal', unitPrice: '', quantity: '1', participantIds: ['gone'] }] } })]) {
      const storage = memoryStorage(raw)
      const loaded = loadBill(storage)
      expect(loaded.state.kind).toBe('corrupt')
      if (loaded.state.kind === 'corrupt') expect(loaded.state.raw).toBe(raw)
      expect(storage.setItem).not.toHaveBeenCalled()
    }
  })
  it('preserves old non-HKD bills and explains that they need an explicit reset', () => {
    const oldBill = { ...emptyBill(), currency: 'MYR' }
    const raw = JSON.stringify({ version: 1, bill: oldBill })
    const storage = memoryStorage(raw)
    const loaded = loadBill(storage)
    expect(loaded.state).toEqual({ kind: 'corrupt', raw, reason: '舊帳單使用其他貨幣，目前僅支援港幣 HKD。' })
    expect(storage.setItem).not.toHaveBeenCalled()
  })
  it('reports read and write failures without throwing into the app', () => {
    const unavailable = { getItem: () => { throw new Error('blocked') } } as unknown as Storage
    expect(loadBill(unavailable).state.kind).toBe('unavailable')
    const failure = { setItem: () => { throw new Error('quota') } } as unknown as Storage
    expect(() => saveBill(failure, emptyBill())).toThrow('quota')
  })
})
