// Maps layer count to ordered slot IDs
export const SLOT_ORDER = {
  1: ['center'],
  2: ['center', 'botCenter'],
  3: ['center', 'topLeft', 'topRight'],
  4: ['center', 'topLeft', 'topRight', 'botCenter'],
  5: ['center', 'topLeft', 'topRight', 'botLeft', 'botRight'],
  6: ['center', 'topLeft', 'topCenter', 'topRight', 'botLeft', 'botRight'],
  7: ['center', 'topLeft', 'topCenter', 'topRight', 'botLeft', 'botCenter', 'botRight'],
}

const ALL_SLOTS = ['topLeft', 'topCenter', 'topRight', 'center', 'botLeft', 'botCenter', 'botRight']

function makeSlot(value = '', active = false) {
  const isIcon = typeof value === 'string' && /^\$[a-z_]/i.test(value)
  return {
    active: active && value !== '',
    type: isIcon ? 'icon' : 'text',
    value: isIcon ? value.slice(1) : value,  // '$ic_bt' → 'ic_bt'
    font: null,
  }
}

/**
 * Build the initial keyOverrides from parsed keymapData.
 * Returns Record<"row,col", KeyOverride>.
 */
export function applySlotDefaults(keymapData) {
  const { layerNames, keys } = keymapData
  const count = Math.min(layerNames.length, 7)
  const order = SLOT_ORDER[count] || SLOT_ORDER[7]

  const overrides = {}

  for (const key of keys) {
    const k = `${key.row},${key.col}`
    const slots = {}

    // Initialize all slots as inactive
    for (const slotId of ALL_SLOTS) {
      slots[slotId] = makeSlot('', false)
    }

    if (!key.empty) {
      // Map each layer to its default slot
      for (let i = 0; i < order.length; i++) {
        const slotId = order[i]
        const layerName = layerNames[i]
        const value = (key.layers[layerName] || '').trim()
        slots[slotId] = makeSlot(value, value !== '')
      }
    }

    overrides[k] = { slots, font: null }
  }

  return overrides
}
