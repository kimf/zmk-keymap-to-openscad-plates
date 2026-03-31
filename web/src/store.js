import { createStore as createZustandStore } from 'zustand/vanilla'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import defaultConfig from './lib/defaultConfig.js'
import { applySlotDefaults } from './lib/slotDefaults.js'

const initialState = {
  keymapData:   null,
  keyOverrides: {},
  config:       defaultConfig,
  // transient — excluded from persistence
  selectedKey:   null,
  pendingExport: null,
}

function storeDefinition(set) {
  return {
    ...initialState,

    loadKeymapData(keymapData) {
      const keyOverrides = applySlotDefaults(keymapData)
      set({ keymapData, keyOverrides, selectedKey: null })
    },

    setSlotOverride(row, col, slotId, slotOverride) {
      set(state => {
        const k = `${row},${col}`
        const existing = state.keyOverrides[k] || { slots: {}, font: null }
        return {
          keyOverrides: {
            ...state.keyOverrides,
            [k]: {
              ...existing,
              slots: { ...existing.slots, [slotId]: slotOverride },
            },
          },
        }
      })
    },

    setKeyFont(row, col, font) {
      set(state => {
        const k = `${row},${col}`
        const existing = state.keyOverrides[k] || { slots: {}, font: null }
        return {
          keyOverrides: {
            ...state.keyOverrides,
            [k]: { ...existing, font },
          },
        }
      })
    },

    selectKey(row, col) { set({ selectedKey: { row, col } }) },
    clearSelection()    { set({ selectedKey: null }) },
    triggerExport(fmt)  { set({ pendingExport: fmt }) },
    clearPendingExport(){ set({ pendingExport: null }) },

    updateConfig(patch) {
      set(state => ({ config: { ...state.config, ...patch } }))
    },

    reset() {
      set({ ...initialState, config: defaultConfig })
    },
  }
}

// Vanilla store for tests (no React hook)
export function createStore() {
  return createZustandStore(storeDefinition)
}

// Persisted React hook for the app
export const useKeyboardStore = create(
  persist(storeDefinition, {
    name: 'keebs-state',
    storage: createJSONStorage(() => localStorage),
    partialize: state => ({
      keymapData:   state.keymapData,
      keyOverrides: state.keyOverrides,
      config:       state.config,
    }),
  })
)
