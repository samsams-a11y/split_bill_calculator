import { Plus, Trash2, Utensils } from 'lucide-react'
import type { Currency, FoodItem, Participant, ValidationIssue } from '../types/bill'
import { formatMoney, multiplySafe, parseMoney, parseQuantity } from '../utils/money'

export function FoodItems({ items, people, currency, labels, issues, onAdd, onChange, onRemove }: {
  items: FoodItem[]; people: Participant[]; currency: Currency; labels: Map<string, string>; issues: ValidationIssue[];
  onAdd: () => void; onChange: (id: string, patch: Partial<FoodItem>) => void; onRemove: (id: string) => void;
}) {
  return <section className="section" aria-labelledby="items-heading">
    <div className="section-heading"><div className="section-icon"><Utensils size={18} /></div><div><h2 id="items-heading">菜品</h2><p>每道菜都可以由不同的人分攤。</p></div><span className="count-pill">{items.length}</span></div>
    {!items.length && <p className="empty-line">{issues.find(issue => issue.path === 'items')?.message ?? '加入菜品和價格，分帳結果會即時更新。'}</p>}
    <div className="item-list">{items.map((item, index) => {
      let line = ''
      try { line = formatMoney(multiplySafe(parseMoney(item.unitPrice, currency), parseQuantity(item.quantity)), currency) } catch { /* 尚未完成的金額不顯示小計 */ }
      const pathIssue = (path: string) => issues.find(issue => issue.path === `items.${index}.${path}`)
      const unassigned = !item.participantIds.length
      const fields = [
        { key: 'name', label: '菜品名稱', value: item.name, placeholder: '例如：披薩' },
        { key: 'unitPrice', label: `單價（${currency}）`, value: item.unitPrice, placeholder: '0.00' },
        { key: 'quantity', label: '數量', value: item.quantity, placeholder: '1' },
      ] as const
      return <article className={`item-editor ${unassigned ? 'item-pending' : ''}`} key={item.id}>
        <div className="item-topline"><span className="item-number">菜品 {index + 1}</span>{unassigned && <span className="pending-tag">待分攤</span>}<button className="icon-button item-delete" aria-label={`刪除菜品 ${item.name || index + 1}`} onClick={() => onRemove(item.id)}><Trash2 size={17} /></button></div>
        <div className="item-fields">{fields.map(field => {
          const error = pathIssue(field.key)
          const inputId = `item-${item.id}-${field.key}`
          return <label className={`field ${field.key === 'name' ? 'field-name' : ''} ${field.key === 'quantity' ? 'field-quantity' : ''}`} key={field.key} htmlFor={inputId}>
            <span>{field.label}</span><input id={inputId} inputMode={field.key === 'name' ? undefined : field.key === 'quantity' ? 'numeric' : 'decimal'} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : undefined} value={field.value} onChange={event => onChange(item.id, { [field.key]: event.target.value })} placeholder={field.placeholder} />
            {error && <span className="field-error" id={`${inputId}-error`}>{error.message}</span>}
          </label>
        })}</div>
        <fieldset className="split-fieldset" aria-describedby={pathIssue('participants') ? `item-${item.id}-participants-error` : undefined}>
          <legend>分攤人員</legend>
          {people.length > 0 && <div className="quick-actions"><button type="button" onClick={() => onChange(item.id, { participantIds: people.map(person => person.id) })}>全選</button><span>·</span><button type="button" onClick={() => onChange(item.id, { participantIds: [] })}>清除</button><strong>{line && `小計 ${line}`}</strong></div>}
          {people.length === 0 ? <span className="hint">請先新增參與者。</span> : <div className="split-options">{people.map(person => <label className="check-option" key={person.id}><input type="checkbox" checked={item.participantIds.includes(person.id)} onChange={event => onChange(item.id, { participantIds: event.target.checked ? [...item.participantIds, person.id] : item.participantIds.filter(id => id !== person.id) })} /><span>{labels.get(person.id) ?? person.name}</span></label>)}</div>}
          {pathIssue('participants') && <span className="field-error" id={`item-${item.id}-participants-error`}>{pathIssue('participants')?.message}</span>}
        </fieldset>
      </article>
    })}</div>
    <button className="button button-outline add-button" onClick={onAdd}><Plus size={17} />新增菜品</button>
  </section>
}
