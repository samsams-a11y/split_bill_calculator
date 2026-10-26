import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import { emptyBill } from '../src/types/bill'
import { STORAGE_KEY } from '../src/utils/storage'

let root: Root | undefined
let host: HTMLDivElement | undefined

function seedBill() {
  const bill = emptyBill()
  bill.title = '測試晚餐'
  bill.participants = [{ id: 'person-1', name: 'Alex' }]
  bill.items = [{ id: 'meal-1', name: '披薩', unitPrice: '20.00', quantity: '1', participantIds: ['person-1'] }]
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, bill }))
}

async function mount() {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => { root!.render(<App />) })
  return host
}

function button(container: HTMLElement, label: string) {
  const match = [...container.querySelectorAll('button')].find(item => item.textContent?.includes(label))
  if (!match) throw new Error(`找不到按鈕：${label}`)
  return match
}

beforeEach(() => {
  window.localStorage.clear()
  vi.stubGlobal('confirm', vi.fn(() => false))
})

afterEach(async () => {
  if (root) await act(async () => root!.unmount())
  host?.remove()
  root = undefined
  host = undefined
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('主要復原互動', () => {
  it('新帳單確認取消時保留目前草稿', async () => {
    seedBill()
    const view = await mount()
    await act(async () => { button(view, '新帳單').click() })
    expect(window.confirm).toHaveBeenCalledOnce()
    expect((view.querySelector('#bill-title') as HTMLInputElement).value).toBe('測試晚餐')
    expect(view.textContent).toContain('披薩')
  })

  it('固定顯示港幣且不提供貨幣切換器', async () => {
    const view = await mount()
    expect(view.textContent).toContain('港幣 HKD')
    expect(view.querySelector('#currency')).toBeNull()
    expect(view.textContent).not.toContain('切換貨幣')
  })

  it('舊版非 HKD 帳單顯示說明並保留原始保存資料', async () => {
    const raw = JSON.stringify({ version: 1, bill: { ...emptyBill(), currency: 'MYR' } })
    window.localStorage.setItem(STORAGE_KEY, raw)
    const view = await mount()
    expect(view.textContent).toContain('舊帳單使用其他貨幣，目前僅支援港幣 HKD。')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(raw)
    expect([...view.querySelectorAll('button')].some(item => item.textContent?.includes('下載備份'))).toBe(true)
  })

  it('剪貼簿拒絕時顯示可手動複製的結算摘要', async () => {
    seedBill()
    vi.stubGlobal('navigator', Object.create(navigator, { clipboard: { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('permission denied')) } } }))
    const view = await mount()
    await act(async () => { button(view, '複製摘要').click() })
    const fallback = view.querySelector('#manual-summary') as HTMLTextAreaElement | null
    expect(fallback).not.toBeNull()
    expect(fallback?.value).toContain('Alex：HK$ 20.00 HKD')
    expect(view.textContent).toContain('無法直接複製')
  })

  it('編輯帳單後不顯示較早複製失敗的舊摘要', async () => {
    seedBill()
    let rejectClipboard!: (error: Error) => void
    const pending = new Promise<void>((_resolve, reject) => { rejectClipboard = reject })
    vi.stubGlobal('navigator', Object.create(navigator, { clipboard: { configurable: true, value: { writeText: vi.fn(() => pending) } } }))
    const view = await mount()
    await act(async () => { button(view, '複製摘要').click() })
    const title = view.querySelector('#bill-title') as HTMLInputElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(title, '新晚餐')
      title.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => { rejectClipboard(new Error('permission denied')); await Promise.resolve() })
    expect(view.querySelector('#manual-summary')).toBeNull()
    expect(view.textContent).not.toContain('無法直接複製')
  })
})
