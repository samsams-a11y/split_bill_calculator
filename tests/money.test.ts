import { describe, expect, it } from 'vitest'
import { formatMoney, parseMoney, parseQuantity, parseRate, percentAmount } from '../src/utils/money'

describe('money parsing and formatting', () => {
  it('uses HKD cents and rejects malformed or over-precise amounts', () => {
    expect(parseMoney('100.00', 'HKD')).toBe(10000)
    expect(parseMoney('100', 'HKD')).toBe(10000)
    expect(parseMoney('0.01', 'HKD')).toBe(1)
    for (const value of ['', '-1', '1e3', '1,000', '1.001']) expect(() => parseMoney(value, 'HKD')).toThrow()
    expect(() => parseMoney('20.501', 'HKD')).toThrow('港幣')
  })
  it('parses positive integer quantity and percent to basis points', () => {
    expect(parseQuantity('12')).toBe(12)
    for (const value of ['0', '-1', '1.5', '1e3', '']) expect(() => parseQuantity(value)).toThrow()
    expect(parseRate('6.25')).toBe(625)
    expect(() => parseRate('100.01', true)).toThrow()
    expect(() => parseRate('3.333')).toThrow()
  })
  it('rounds percentage amounts half-up without floating point and formats large exact values', () => {
    expect(percentAmount(1, 5000)).toBe(1)
    expect(percentAmount(1, 4999)).toBe(0)
    expect(formatMoney(Number.MAX_SAFE_INTEGER, 'HKD')).toBe('HK$ 90,071,992,547,409.91 HKD')
    expect(formatMoney(100, 'HKD')).toBe('HK$ 1.00 HKD')
    expect(formatMoney(1234, 'HKD')).toBe('HK$ 12.34 HKD')
  })
})
