import { describe, expect, it } from 'vitest'
import { emptyBill } from '../src/types/bill'
import type { BillResult } from '../src/types/bill'
import { makeSummary, participantLabels } from '../src/utils/share'

describe('share summary', () => {
  it('keeps duplicate names distinguishable by stable ID and includes the current bill breakdown', () => {
    const bill = emptyBill()
    bill.title = '晚餐'
    bill.participants = [{ id: 'b', name: 'Alex' }, { id: 'a', name: 'Alex' }]
    bill.items = [{ id: 'meal', name: '披薩', unitPrice: '20', quantity: '1', participantIds: ['a', 'b'] }]
    const labels = participantLabels(bill.participants)
    expect(labels.get('a')).toBe('Alex（1）')
    expect(labels.get('b')).toBe('Alex（2）')
    const result: BillResult = { currency: 'HKD', subtotal: 2000, discount: 0, tax: 0, serviceCharge: 0, grandTotal: 2000,
      itemShares: { meal: { a: 1000, b: 1000 } }, people: [
        { participantId: 'b', itemSubtotal: 1000, discount: 0, tax: 0, serviceCharge: 0, total: 1000, items: [{ itemId: 'meal', name: '披薩', amount: 1000 }] },
        { participantId: 'a', itemSubtotal: 1000, discount: 0, tax: 0, serviceCharge: 0, total: 1000, items: [{ itemId: 'meal', name: '披薩', amount: 1000 }] },
      ] }
    const text = makeSummary(bill, result)
    expect(text).toContain('晚餐')
    expect(text).toContain('Alex（1）：HK$ 10.00 HKD')
    expect(text).toContain('菜品總額：HK$ 20.00 HKD')
    expect(text).toContain('應收總額：HK$ 20.00 HKD')
  })
})
