const LAYER_NAMES = ['_p', '_tl', '_tr', '_bt']
const SLOT_TO_LAYER = { center: '_p', topLeft: '_tl', topRight: '_tr', botCenter: '_bt' }

function resolveSlotForScad(slot) {
  if (!slot || !slot.active) return ''
  if (slot.type === 'icon' && slot.value) return `$${slot.value}`
  return slot.value || ''
}

/**
 * Translate 7-slot keyOverrides back to a keymapData-shaped object
 * with 4 synthetic layer names compatible with buildScad().
 */
export function buildExportKeymapData(keymapData, keyOverrides) {
  const keys = keymapData.keys.map(key => {
    const k = `${key.row},${key.col}`
    const override = keyOverrides[k]

    const layers = {}
    for (const layerName of LAYER_NAMES) {
      if (key.empty || !override) {
        layers[layerName] = ''
      } else {
        const slotId = Object.keys(SLOT_TO_LAYER).find(s => SLOT_TO_LAYER[s] === layerName)
        layers[layerName] = resolveSlotForScad(override.slots[slotId])
      }
    }

    return { row: key.row, col: key.col, empty: key.empty, layers }
  })

  return {
    layerNames: LAYER_NAMES,
    grid: keymapData.grid,
    keys,
  }
}
