import { useCallback, useEffect, useState } from 'react'
import type { BillDraft, ChargeDraft, FoodItem } from '../types/bill'
import { emptyBill } from '../types/bill'
import { loadBill, saveBill, type LoadState } from '../utils/storage'

function getStorage(): Storage | null {
  try { return window.localStorage } catch { return null }
}

export function useBill() {
  const [storage] = useState(getStorage)
  const [loaded, setLoaded] = useState(() => storage ? loadBill(storage) : { bill: emptyBill(), state: { kind: 'unavailable' as const, reason: '無法使用瀏覽器本機保存。' } })
  const [bill, setBill] = useState<BillDraft>(loaded.bill)
  const [saveMessage, setSaveMessage] = useState('')
  const locked = loaded.state.kind !== 'ready'

  useEffect(() => {
    if (locked || !storage) return
    try { saveBill(storage, bill); setSaveMessage('已保存在這部裝置') }
    catch { setSaveMessage('這次修改未能保存，請先複製或下載結算內容。') }
  }, [bill, locked, storage])

  const update = useCallback((patch: Partial<BillDraft>) => setBill(current => ({ ...current, ...patch })), [])
  const editParticipant = useCallback((id: string, name: string) => setBill(current => ({ ...current, participants: current.participants.map(person => person.id === id ? { ...person, name } : person) })), [])
  const addParticipant = useCallback(() => setBill(current => ({ ...current, participants: [...current.participants, { id: crypto.randomUUID(), name: '' }] })), [])
  const removeParticipant = useCallback((id: string) => setBill(current => ({ ...current, participants: current.participants.filter(person => person.id !== id), items: current.items.map(item => ({ ...item, participantIds: item.participantIds.filter(personId => personId !== id) })) })), [])
  const updateItem = useCallback((id: string, patch: Partial<FoodItem>) => setBill(current => ({ ...current, items: current.items.map(item => item.id === id ? { ...item, ...patch } : item) })), [])
  const addItem = useCallback(() => setBill(current => ({ ...current, items: [...current.items, { id: crypto.randomUUID(), name: '', unitPrice: '', quantity: '1', participantIds: current.participants.map(person => person.id) }] })), [])
  const removeItem = useCallback((id: string) => setBill(current => ({ ...current, items: current.items.filter(item => item.id !== id) })), [])
  const updateCharge = useCallback((key: 'discount' | 'tax' | 'serviceCharge', value: ChargeDraft) => setBill(current => ({ ...current, [key]: value })), [])
  const unlockWithNewBill = useCallback(() => {
    const fresh = emptyBill()
    setBill(fresh)
    if (!storage) { setLoaded({ bill: fresh, state: { kind: 'unavailable', reason: '無法使用瀏覽器本機保存。' } }); setSaveMessage('目前只能在此頁編輯，離開後資料不會保留。'); return }
    try { saveBill(storage, fresh); setLoaded({ bill: fresh, state: { kind: 'ready' } }); setSaveMessage('已建立新帳單') }
    catch { setLoaded({ bill: fresh, state: { kind: 'unavailable', reason: '無法寫入瀏覽器本機保存。' } }); setSaveMessage('無法保存新帳單，請檢查瀏覽器儲存空間。') }
  }, [storage])
  const reset = useCallback(() => {
    const fresh = emptyBill()
    setBill(fresh)
    if (storage) {
      try { saveBill(storage, fresh); setSaveMessage('已建立新帳單'); setLoaded({ bill: fresh, state: { kind: 'ready' } }) }
      catch { setSaveMessage('無法保存新帳單，請檢查瀏覽器儲存空間。') }
    }
  }, [storage])
  return { bill, update, editParticipant, addParticipant, removeParticipant, updateItem, addItem, removeItem, updateCharge, reset, saveMessage, loaded: loaded.state as LoadState, unlockWithNewBill }
}
