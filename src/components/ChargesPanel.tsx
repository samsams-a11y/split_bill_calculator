import { ReceiptText } from 'lucide-react'
import type { ChargeDraft, Currency, ValidationIssue } from '../types/bill'

export function ChargesPanel({ currency, discount, tax, serviceCharge, issues, onChange }: {
  currency: Currency; discount: ChargeDraft; tax: ChargeDraft; serviceCharge: ChargeDraft; issues: ValidationIssue[];
  onChange: (key: 'discount' | 'tax' | 'serviceCharge', value: ChargeDraft) => void;
}) {
  return <section className="section charges-section" aria-labelledby="charges-heading">
    <div className="section-heading"><div className="section-icon"><ReceiptText size={18} /></div><div><h2 id="charges-heading">折扣與費用</h2><p>Discounts and Fees</p></div></div>
    <p className="charge-rule">稅費與服務費皆依折扣後菜品金額計算，兩者互不疊加。</p>
    <ChargeEditor title="折扣" id="discount" value={discount} currency={currency} issue={issues.find(issue => issue.path === 'discount')} onChange={value => onChange('discount', value)} />
    <ChargeEditor title="稅費" id="tax" value={tax} currency={currency} issue={issues.find(issue => issue.path === 'tax')} onChange={value => onChange('tax', value)} />
    <ChargeEditor title="服務費" id="service-charge" value={serviceCharge} currency={currency} issue={issues.find(issue => issue.path === 'serviceCharge')} onChange={value => onChange('serviceCharge', value)} />
  </section>
}

function ChargeEditor({ title, id, value, currency, issue, onChange }: { title: string; id: string; value: ChargeDraft; currency: Currency; issue?: ValidationIssue; onChange: (value: ChargeDraft) => void }) {
  const fieldLabel = value.mode === 'percent' ? '百分比' : '固定金額'
  return <div className="charge-wrap"><div className="charge-row"><div className="charge-title">{title}</div><select aria-label={`${title}方式`} value={value.mode} onChange={event => onChange({ ...value, mode: event.target.value as ChargeDraft['mode'] })}><option value="none">不收取</option><option value="percent">百分比</option><option value="fixed">固定金額</option></select>{value.mode !== 'none' && <label className="charge-input" htmlFor={`${id}-value`}><span className="sr-only">{fieldLabel}</span><input id={`${id}-value`} aria-invalid={Boolean(issue)} aria-describedby={issue ? `${id}-error` : undefined} inputMode="decimal" value={value.value} onChange={event => onChange({ ...value, value: event.target.value })} placeholder={value.mode === 'percent' ? '0' : '0.00'} /><span>{value.mode === 'percent' ? '%' : currency}</span></label>}</div>{issue && <p className="field-error charge-error" id={`${id}-error`}>{issue.message}</p>}</div>
}
