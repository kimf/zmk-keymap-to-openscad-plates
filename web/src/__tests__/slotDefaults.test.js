import { describe, it, expect } from 'vitest'
import { applySlotDefaults, SLOT_ORDER } from '../lib/slotDefaults.js'

function makeKeymap(layerNames, keyLayers) {
  return {
    layerNames,
    grid: { rows: 1, cols: 1 },
    keys: [{ row: 0, col: 0, empty: false, layers: keyLayers }],
  }
}

describe('SLOT_ORDER', () => {
  it('has 7 entries for 7 layers', () => {
    expect(SLOT_ORDER[7].length).toBe(7)
  })
  it('1-layer keymap maps to center', () => {
    expect(SLOT_ORDER[1][0]).toBe('center')
  })
  it('4-layer keymap maps 0→center, 1→topLeft, 2→topRight, 3→botCenter', () => {
    const [s0, s1, s2, s3] = SLOT_ORDER[4]
    expect(s0).toBe('center')
    expect(s1).toBe('topLeft')
    expect(s2).toBe('topRight')
    expect(s3).toBe('botCenter')
  })
})

describe('applySlotDefaults', () => {
  it('populates center slot from Base layer', () => {
    const km = makeKeymap(['Base'], { Base: 'Q' })
    const overrides = applySlotDefaults(km)
    expect(overrides['0,0'].slots.center.value).toBe('Q')
    expect(overrides['0,0'].slots.center.active).toBe(true)
    expect(overrides['0,0'].slots.center.type).toBe('text')
  })

  it('populates topLeft and topRight for 3-layer keymap', () => {
    const km = makeKeymap(['Base', 'Sym', 'Nav'], { Base: 'A', Sym: '!', Nav: '←' })
    const overrides = applySlotDefaults(km)
    const slots = overrides['0,0'].slots
    expect(slots.topLeft.value).toBe('!')
    expect(slots.topRight.value).toBe('←')
    expect(slots.botCenter.active).toBe(false)
  })

  it('empty labels become inactive slots', () => {
    const km = makeKeymap(['Base', 'Sym'], { Base: 'Q', Sym: '' })
    const overrides = applySlotDefaults(km)
    expect(overrides['0,0'].slots.botCenter.active).toBe(false)
    expect(overrides['0,0'].slots.botCenter.value).toBe('')
  })

  it('empty keys get all-inactive slots', () => {
    const km = {
      layerNames: ['Base'],
      grid: { rows: 1, cols: 1 },
      keys: [{ row: 0, col: 0, empty: true, layers: { Base: '' } }],
    }
    const overrides = applySlotDefaults(km)
    expect(overrides['0,0'].slots.center.active).toBe(false)
  })

  it('icon labels ($ic_bt) set type=icon and value=ic_bt', () => {
    const km = makeKeymap(['Base'], { Base: '$ic_bt' })
    const overrides = applySlotDefaults(km)
    const slot = overrides['0,0'].slots.center
    expect(slot.type).toBe('icon')
    expect(slot.value).toBe('ic_bt')
  })
})
