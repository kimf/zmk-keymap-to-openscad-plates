import { describe, it, expect } from 'vitest'
import { buildExportKeymapData } from '../lib/buildExportKeymapData.js'

const km = {
  layerNames: ['Base', 'Sym', 'Nav', 'Fn'],
  grid: { rows: 1, cols: 1 },
  keys: [{ row: 0, col: 0, empty: false, layers: { Base:'Q', Sym:'!', Nav:'↑', Fn:'' } }],
}

function makeOverride(slots) {
  const allSlots = ['topLeft','topCenter','topRight','center','botLeft','botCenter','botRight']
  const full = {}
  for (const s of allSlots) full[s] = { active: false, type: 'text', value: '', font: null }
  return { slots: { ...full, ...slots }, font: null }
}

describe('buildExportKeymapData', () => {
  it('returns layerNames as [_p, _tl, _tr, _bt]', () => {
    const result = buildExportKeymapData(km, {})
    expect(result.layerNames).toEqual(['_p', '_tl', '_tr', '_bt'])
  })

  it('maps center slot to _p', () => {
    const overrides = {
      '0,0': makeOverride({ center: { active: true, type: 'text', value: 'Z', font: null } }),
    }
    const result = buildExportKeymapData(km, overrides)
    expect(result.keys[0].layers._p).toBe('Z')
  })

  it('maps icon slot to $varname', () => {
    const overrides = {
      '0,0': makeOverride({
        center:    { active: true,  type: 'text', value: 'Q',     font: null },
        botCenter: { active: true,  type: 'icon', value: 'ic_bt', font: null },
      }),
    }
    const result = buildExportKeymapData(km, overrides)
    expect(result.keys[0].layers._bt).toBe('$ic_bt')
  })

  it('inactive slot produces empty string', () => {
    const overrides = {
      '0,0': makeOverride({
        center:   { active: true,  type: 'text', value: 'Q', font: null },
        topLeft:  { active: false, type: 'text', value: 'X', font: null },
      }),
    }
    const result = buildExportKeymapData(km, overrides)
    expect(result.keys[0].layers._tl).toBe('')
  })

  it('empty keys produce all-empty layers', () => {
    const emptyKm = {
      layerNames: ['Base'],
      grid: { rows: 1, cols: 1 },
      keys: [{ row: 0, col: 0, empty: true, layers: { Base: '' } }],
    }
    const result = buildExportKeymapData(emptyKm, {})
    const layers = result.keys[0].layers
    expect(Object.values(layers).every(v => v === '')).toBe(true)
  })
})
