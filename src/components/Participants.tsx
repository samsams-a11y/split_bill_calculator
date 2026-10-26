import { Plus, Trash2, Users } from 'lucide-react'
import type { Participant } from '../types/bill'
import type { ValidationIssue } from '../types/bill'

export function Participants({ people, labels, issues, onAdd, onChange, onRemove }: {
  people: Participant[]; labels: Map<string, string>; issues: ValidationIssue[];
  onAdd: () => void; onChange: (id: string, name: string) => void; onRemove: (id: string) => void;
}) {
  const emptyIssue = issues.find(issue => issue.path === 'participants')
  return <section className="section" aria-labelledby="participants-heading">
    <div className="section-heading"><div className="section-icon"><Users size={18} /></div><div><h2 id="participants-heading">參與者</h2><p>Participants</p></div><span className="count-pill">{people.length}</span></div>
    {people.length === 0 ? <p className="empty-line">{emptyIssue?.message ?? '先新增參與者，再加入菜品。'}</p> : <div className="people-list">
      {people.map(person => {
        const issue = issues.find(item => item.path === `participants.${people.indexOf(person)}.name`)
        const fieldId = `participant-${person.id}`
        return <div className="person-edit" key={person.id}><input id={fieldId} aria-label="參與者姓名" aria-invalid={Boolean(issue)} aria-describedby={issue ? `${fieldId}-error` : undefined} value={person.name} onChange={event => onChange(person.id, event.target.value)} placeholder="姓名" />{issue && <span className="field-error" id={`${fieldId}-error`}>{issue.message}</span>}<button className="icon-button" aria-label={`刪除${labels.get(person.id) ?? '參與者'}`} onClick={() => onRemove(person.id)}><Trash2 size={17} /></button></div>
      })}
    </div>}
    <button className="button button-outline add-button" onClick={onAdd}><Plus size={17} />新增參與者</button>
  </section>
}
