import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, ReceiptText, RotateCcw } from 'lucide-react'
import { calculateBill } from './utils/splitCalculator'
import { formatMoney } from './utils/money'
import { makeSummary, participantLabels } from './utils/share'
import { useBill } from './hooks/useBill'
import { Participants } from './components/Participants'
import { FoodItems } from './components/FoodItems'
import { ChargesPanel } from './components/ChargesPanel'
import { SummaryResults } from './components/SummaryResults'

export default function App() {
  const { bill, update, editParticipant, addParticipant, removeParticipant, updateItem, addItem, removeItem, updateCharge, reset, saveMessage, loaded, unlockWithNewBill } = useBill()
  const [notice, setNotice] = useState('')
  const [manualFallback, setManualFallback] = useState<{ text: string; bill: typeof bill } | null>(null)
  const currentBill = useRef(bill)
  currentBill.current = bill
  const labels = useMemo(() => participantLabels(bill.participants), [bill.participants])
  const calculated = useMemo(() => calculateBill(bill), [bill])
  const result = calculated.ok ? calculated.result : null
  const summary = result ? makeSummary(bill, result) : ''
  const issues = calculated.ok ? [] : calculated.issues

  useEffect(() => { setManualFallback(null); setNotice('') }, [bill])

  function confirmReset() {
    if (window.confirm('新帳單會清除目前所有參與者、菜品及費用，確定要繼續嗎？')) reset()
  }
  function resetDamaged() {
    if (window.confirm('重設後會取代這份無法讀取的保存資料，且不能復原。要建立空白帳單嗎？')) unlockWithNewBill()
  }
  function saveCorruptBackup() {
    if (loaded.kind !== 'corrupt') return
    const url = URL.createObjectURL(new Blob([loaded.raw], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'split-bill-recovery.json'
    link.click()
    URL.revokeObjectURL(url)
  }
  async function copyText(text: string, success: string) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(text)
      if (currentBill.current === bill) { setManualFallback(null); setNotice(success) }
    } catch {
      if (currentBill.current === bill) {
        setManualFallback({ text, bill })
        setNotice('無法直接複製，請選取下方文字並手動複製。')
      }
    }
  }
  async function share() {
    if (!result) return
    const sourceBill = bill
    if (!navigator.share) {
      await copyText(summary, '此裝置不支援系統分享，已複製完整摘要。')
      return
    }
    try {
      await navigator.share({ title: bill.title.trim() || '聚餐分帳', text: summary })
      if (currentBill.current === sourceBill) setNotice('已開啟系統分享。')
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError' && currentBill.current === sourceBill) {
        setManualFallback({ text: summary, bill: sourceBill })
        setNotice('分享未完成，請複製下方文字或再試一次。')
      }
    }
  }
  function copyPerson(personId: string) {
    const person = result?.people.find(item => item.participantId === personId)
    if (person) void copyText(`${labels.get(personId) ?? '參與者'}：${formatMoney(person.total, bill.currency)}`, '已複製個人應付金額。')
  }
  function manualCopy() {
    const field = document.getElementById('manual-summary') as HTMLTextAreaElement | null
    field?.select()
    setNotice('文字已選取，請使用裝置的複製功能。')
  }

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><ReceiptText size={20} /></div><div><h1>Split Bill Calculator</h1><p>把每一道菜，算得清清楚楚</p></div></div>
      <div className="top-actions">
        <span className="currency-pill" aria-label="目前貨幣：港幣 HKD">港幣 HKD</span>
        <button className="button button-quiet" onClick={confirmReset}><RotateCcw size={16} />新帳單</button>
      </div>
    </header>

    {loaded.kind === 'corrupt' && <div className="alert alert-warning" role="alert"><div><strong>{loaded.reason}</strong><span>原始資料仍留在瀏覽器，請先下載備份再重設。這段期間的修改不會覆蓋舊資料。</span></div><button className="button button-small" onClick={saveCorruptBackup}><Download size={15} />下載備份</button><button className="button button-danger button-small" onClick={resetDamaged}>確認重設</button></div>}
    {loaded.kind === 'unavailable' && <div className="alert alert-warning" role="status"><div><strong>本機保存目前無法使用</strong><span>{loaded.reason}目前資料仍可在此頁編輯，但離開頁面後不會保留。</span></div><button className="button button-small" onClick={resetDamaged}>重新開始</button></div>}

    <div className="workspace">
      <div className="editor-column">
        <section className="section bill-heading">
          <label htmlFor="bill-title">帳單名稱</label>
          <input id="bill-title" className="title-input" value={bill.title} onChange={event => update({ title: event.target.value })} placeholder="例如：週末晚餐" />
          <p className="hint">最多輸入兩位小數。</p>
        </section>
        <Participants people={bill.participants} labels={labels} issues={issues} onAdd={addParticipant} onChange={editParticipant} onRemove={removeParticipant} />
        <FoodItems items={bill.items} people={bill.participants} currency={bill.currency} labels={labels} issues={issues} onAdd={addItem} onChange={updateItem} onRemove={removeItem} />
        <ChargesPanel currency={bill.currency} discount={bill.discount} tax={bill.tax} serviceCharge={bill.serviceCharge} issues={issues} onChange={updateCharge} />
      </div>
      <SummaryResults draft={bill} result={result} issues={issues} labels={labels} manualText={manualFallback?.bill === bill ? manualFallback.text : ''} notice={notice} saveMessage={saveMessage} onCopy={() => void copyText(summary, '已複製完整結算摘要。')} onShare={() => void share()} onCopyPerson={copyPerson} onManualCopy={manualCopy} onCloseNotice={() => setNotice('')} />
    </div>
  </main>
}
