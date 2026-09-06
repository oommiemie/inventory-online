import { describe, expect, it } from 'vitest'
import type { Mapping, StockRow } from '@/types'
import {
  ACTION_FROM, ACTION_PERM, M, available, fefo, fmtStamp, isTerminal,
  mapIsActive, mappingReady, money, num, onHand, pad, reserved, stockRows,
  toBase, toLocal, uomOf,
} from './domain'

const lot = (lotNo: string, exp: string, qty: number, res = 0): StockRow =>
  ({ wh: 'WH-A', item: 'PCM500', lot: lotNo, exp, qty, reserved: res })

const mapping = (over: Partial<Mapping> = {}): Mapping => ({
  org: 'PCU01', local: 'L-1', localName: 'พารา', item: 'PCM500',
  localUom: 'กล่อง', factor: 100, state: 'ACTIVE', ...over,
})

describe('item master', () => {
  it('returns a placeholder for an unknown code instead of throwing', () => {
    const unknown = M('NOPE')
    expect(unknown.code).toBe('NOPE')
    expect(unknown.price).toBe(0)
  })
})

describe('unit conversion', () => {
  const maps = [mapping()]

  it('converts local units to base and back', () => {
    expect(toBase(maps, 'PCU01', 'PCM500', 3)).toBe(300)
    expect(toLocal(maps, 'PCU01', 'PCM500', 300)).toBe(3)
  })

  it('falls back to the master unit when no mapping is active', () => {
    const pending = [mapping({ state: 'PENDING_APPROVAL' })]
    expect(uomOf(pending, 'PCU01', 'PCM500').factor).toBe(1)
    expect(mapIsActive(pending, 'PCU01', 'PCM500')).toBe(false)
  })

  it('prefers the active mapping when a facility has more than one', () => {
    const both = [mapping({ factor: 7, state: 'REJECTED' }), mapping({ factor: 100 })]
    expect(uomOf(both, 'PCU01', 'PCM500').factor).toBe(100)
  })

  it('treats a factor below one as an incomplete proposal', () => {
    expect(mappingReady(mapping())).toBe(true)
    expect(mappingReady(mapping({ factor: 0 }))).toBe(false)
    expect(mappingReady(mapping({ localUom: '' }))).toBe(false)
  })
})

describe('stock', () => {
  const stock = [lot('A', '31/12/70', 100, 40), lot('B', '30/06/70', 50)]

  it('counts on hand, reserved and available separately', () => {
    expect(onHand(stock, 'WH-A', 'PCM500')).toBe(150)
    expect(reserved(stock, 'WH-A', 'PCM500')).toBe(40)
    expect(available(stock, 'WH-A', 'PCM500')).toBe(110)
  })

  it('hides emptied lots', () => {
    expect(stockRows([...stock, lot('C', '01/01/71', 0)], 'WH-A')).toHaveLength(2)
  })
})

describe('fefo allocation', () => {
  const stock = [lot('LATE', '31/12/70', 100), lot('EARLY', '30/06/70', 30)]

  it('takes the earliest expiry first', () => {
    const { lots, short } = fefo(stock, 'WH-A', 'PCM500', 40)
    expect(short).toBe(0)
    expect(lots).toEqual([
      { lot: 'EARLY', exp: '30/06/70', qty: 30 },
      { lot: 'LATE', exp: '31/12/70', qty: 10 },
    ])
  })

  it('compares expiry by date, not by string order', () => {
    // '01/01/71' sorts before '30/06/70' as plain text but expires later.
    const wrap = [lot('NEXT_YEAR', '01/01/71', 10), lot('THIS_YEAR', '30/06/70', 10)]
    expect(fefo(wrap, 'WH-A', 'PCM500', 5).lots[0].lot).toBe('THIS_YEAR')
  })

  it('never allocates quantity that is already reserved', () => {
    const { lots, short } = fefo([lot('A', '30/06/70', 100, 90)], 'WH-A', 'PCM500', 20)
    expect(lots).toEqual([{ lot: 'A', exp: '30/06/70', qty: 10 }])
    expect(short).toBe(10)
  })

  it('reports the shortfall when stock runs out', () => {
    expect(fefo(stock, 'WH-A', 'PCM500', 500).short).toBe(370)
  })

  it('leaves the input array untouched', () => {
    const input = [...stock]
    fefo(input, 'WH-A', 'PCM500', 40)
    expect(input.map(r => r.lot)).toEqual(['LATE', 'EARLY'])
  })
})

describe('document state machine', () => {
  it('allows submit only from an editable state', () => {
    expect(ACTION_FROM.submit).toContain('DRAFT')
    expect(ACTION_FROM.submit).toContain('RETURNED')
    expect(ACTION_FROM.submit).not.toContain('APPROVED')
  })

  it('cannot act on a document that is already closed', () => {
    for (const action of Object.keys(ACTION_FROM)) {
      expect(ACTION_FROM[action].some(isTerminal)).toBe(false)
    }
  })

  it('guards every action with a permission', () => {
    for (const action of Object.keys(ACTION_FROM)) {
      expect(ACTION_PERM[action], `missing permission for ${action}`).toBeDefined()
    }
  })
})

describe('formatting', () => {
  it('groups thousands and trims noise decimals', () => {
    expect(num(12480)).toBe('12,480')
    expect(num(0)).toBe('0')
    expect(money(1035)).toBe('1,035.00')
  })

  it('stamps a Buddhist-era two-digit year', () => {
    expect(fmtStamp(new Date(2026, 7, 27, 8, 5))).toBe('27/08/69 08:05')
  })

  it('pads to the requested width', () => {
    expect(pad(7)).toBe('07')
    expect(pad(7, 3)).toBe('007')
  })
})
