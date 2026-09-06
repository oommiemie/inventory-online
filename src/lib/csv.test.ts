import { describe, expect, it } from 'vitest'
import { csvName, toCsv } from './csv'

describe('csv', () => {
  it('separates rows with CRLF so Excel reads them', () => {
    expect(toCsv(['a', 'b'], [[1, 2]])).toBe('a,b\r\n1,2')
  })

  it('quotes only the cells that need it', () => {
    const out = toCsv(['x'], [['plain'], ['has,comma'], ['has"quote'], ['has\nbreak']])
    expect(out.split('\r\n').slice(1)).toEqual([
      'plain', '"has,comma"', '"has""quote"', '"has\nbreak"',
    ])
  })

  it('renders empty cells for null and undefined', () => {
    expect(toCsv(['a', 'b'], [[null, undefined]])).toBe('a,b\r\n,')
  })

  it('keeps Thai text as-is', () => {
    expect(toCsv(['ชื่อ'], [['พาราเซตามอล']])).toBe('ชื่อ\r\nพาราเซตามอล')
  })

  it('builds a sortable, dated filename', () => {
    expect(csvName('stock')).toMatch(/^stock-\d{8}\.csv$/)
  })
})
