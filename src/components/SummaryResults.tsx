import { Check, ChevronDown, Copy, ReceiptText, Share2 } from 'lucide-react'
import type { BillDraft, BillResult, ValidationIssue } from '../types/bill'
import { formatMoney } from '../utils/money'

export function SummaryResults({ draft, result, issues, labels, manualText, notice, saveMessage, onCopy, onShare, onCopyPerson, onManualCopy, onCloseNotice }: {
  draft: BillDraft; result: BillResult | null; issues: ValidationIssue[]; labels: Map<string, string>; manualText: string; notice: string; saveMessage: string;
  onCopy: () => void; onShare: () => void; onCopyPerson: (id: string) => void; onManualCopy: () => void; onCloseNotice: () => void;
}) {
  return <aside className="summary-column" aria-label="帳單摘要與結算"><section className="summary-panel">
    <div className="summary-header"><div><span className="summary-kicker">目前應收</span><h2>帳單摘要</h2></div><div className="summary-mark"><ReceiptText size={18} /></div></div>
    {result ? <>
      <div className="grand-total"><strong>{formatMoney(result.grandTotal, draft.currency)}</strong><span>共 {draft.participants.length} 位參與者</span></div>
      <dl className="totals-list"><div><dt>菜品總額</dt><dd>{formatMoney(result.subtotal, draft.currency)}</dd></div><div><dt>折扣</dt><dd className="deduction">−{formatMoney(result.discount, draft.currency)}</dd></div><div><dt>稅費</dt><dd>{formatMoney(result.tax, draft.currency)}</dd></div><div><dt>服務費</dt><dd>{formatMoney(result.serviceCharge, draft.currency)}</dd></div></dl>
      <div className="results-heading"><h3>每人應付</h3><span>明細可展開核對</span></div>
      <div className="results-list">{result.people.map(person => <details className="result-person" key={person.participantId}>
        <summary><span className="result-name">{labels.get(person.participantId) ?? '參與者'}</span><strong>{formatMoney(person.total, draft.currency)}</strong><ChevronDown size={16} className="chevron" /></summary>
        <div className="person-details"><div className="detail-items">{person.items.length ? person.items.map((item, index) => <div key={`${item.itemId}-${index}`}><span>{item.name}</span><span>{formatMoney(item.amount, draft.currency)}</span></div>) : <p>沒有分攤菜品</p>}</div>
          <Detail label="菜品小計" value={formatMoney(person.itemSubtotal, draft.currency)} /><Detail label="折扣" value={`−${formatMoney(person.discount, draft.currency)}`} /><Detail label="稅費" value={formatMoney(person.tax, draft.currency)} /><Detail label="服務費" value={formatMoney(person.serviceCharge, draft.currency)} />
          <button className="copy-person" onClick={event => { event.preventDefault(); onCopyPerson(person.participantId) }}><Copy size={14} />複製此人金額</button>
        </div>
      </details>)}</div>
      <div className="share-actions"><button className="button button-primary" onClick={onCopy}><Copy size={16} />複製摘要</button><button className="button button-outline" onClick={onShare}><Share2 size={16} />分享結算</button></div>
    </> : <div className="invalid-summary"><div className="invalid-icon"><ReceiptText size={20} /></div><strong>完成結算前，請先修正以下項目</strong><ul>{issues.map((issue, index) => <li key={`${issue.path}-${index}`}>{issueLabel(issue, draft)}</li>)}</ul></div>}
    {manualText && <div className="manual-copy"><label htmlFor="manual-summary">無法直接複製，請選取文字並手動複製</label><textarea id="manual-summary" readOnly value={manualText} onFocus={event => event.target.select()} /><button className="button button-small" onClick={onManualCopy}>選取文字</button></div>}
    {notice && <p className="feedback" role="status"><Check size={15} />{notice}<button aria-label="關閉提示" onClick={onCloseNotice}>×</button></p>}
  </section><p className="save-status" role="status">{saveMessage}</p></aside>
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="detail-line"><span>{label}</span><span>{value}</span></div> }

function issueLabel(issue: ValidationIssue, draft: BillDraft) {
  const match = issue.path.match(/^items\.(\d+)\.(.+)$/)
  if (match) {
    const index = Number(match[1])
    const field = ({ name: '菜品名稱', unitPrice: '單價', quantity: '數量', participants: '分攤人員' } as Record<string, string>)[match[2]] ?? '設定'
    return `菜品「${draft.items[index]?.name.trim() || `第 ${index + 1} 道`}」${field}：${issue.message}`
  }
  if (issue.path.startsWith('participants.')) return `參與者姓名：${issue.message}`
  const labels: Record<string, string> = { participants: '參與者', items: '菜品', discount: '折扣', tax: '稅費', serviceCharge: '服務費', calculation: '計算' }
  return `${labels[issue.path] ?? '帳單'}：${issue.message}`
}
