import { describe, it, expect, beforeEach } from 'vitest'
import { createStore } from '../store.js'

// createStore() returns a vanilla Zustand store (not a hook) — easier to test
describe('keyboard store', () => {
  let store

  beforeEach(() => {
    store = createStore()
  })

  it('starts with null keymapData and empty overrides', () => {
    const state = store.getState()
    expect(state.keymapData).toBeNull()
    expect(state.keyOverrides).toEqual({})
    expect(state.selectedKey).toBeNull()
  })

  it('loadKeymapData sets keymapData and populates keyOverrides', () => {
    store.getState().loadKeymapData({
      layerNames: ['Base'],
      grid: { rows: 1, cols: 2 },
      keys: [
        { row: 0, col: 0, empty: false, layers: { Base: 'A' } },
        { row: 0, col: 1, empty: false, layers: { Base: 'B' } },
      ],
    })
    const state = store.getState()
    expect(state.keymapData).not.toBeNull()
    expect(state.keyOverrides['0,0'].slots.center.value).toBe('A')
    expect(state.keyOverrides['0,1'].slots.center.value).toBe('B')
  })

  it('setSlotOverride updates a slot', () => {
    store.getState().loadKeymapData({
      layerNames: ['Base'],
      grid: { rows: 1, cols: 1 },
      keys: [{ row: 0, col: 0, empty: false, layers: { Base: 'Q' } }],
    })
    store.getState().setSlotOverride(0, 0, 'center', { active: true, type: 'text', value: 'Z', font: null })
    expect(store.getState().keyOverrides['0,0'].slots.center.value).toBe('Z')
  })

  it('selectKey and clearSelection work', () => {
    store.getState().selectKey(1, 3)
    expect(store.getState().selectedKey).toEqual({ row: 1, col: 3 })
    store.getState().clearSelection()
    expect(store.getState().selectedKey).toBeNull()
  })

  it('reset clears keymapData and overrides', () => {
    store.getState().loadKeymapData({
      layerNames: ['Base'],
      grid: { rows: 1, cols: 1 },
      keys: [{ row: 0, col: 0, empty: false, layers: { Base: 'Q' } }],
    })
    store.getState().reset()
    const state = store.getState()
    expect(state.keymapData).toBeNull()
    expect(state.keyOverrides).toEqual({})
  })

  it('triggerExport sets pendingExport', () => {
    store.getState().triggerExport('3mf')
    expect(store.getState().pendingExport).toBe('3mf')
    store.getState().clearPendingExport()
    expect(store.getState().pendingExport).toBeNull()
  })
})
