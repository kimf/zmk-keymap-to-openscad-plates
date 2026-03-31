import { useState } from 'react'
import { useKeyboardStore } from '../../store.js'
import SlotDiagram from './SlotDiagram.jsx'
import SlotTabs from './SlotTabs.jsx'
import SlotEditor from './SlotEditor/index.jsx'
import styles from './KeyEditor.module.css'

export default function KeyEditor() {
  const selectedKey    = useKeyboardStore(s => s.selectedKey)
  const keymapData     = useKeyboardStore(s => s.keymapData)
  const keyOverrides   = useKeyboardStore(s => s.keyOverrides)
  const clearSelection = useKeyboardStore(s => s.clearSelection)

  const [focusedSlot, setFocusedSlot] = useState('center')

  if (!selectedKey || !keymapData) return null

  const { row, col } = selectedKey
  const key = keymapData.keys.find(k => k.row === row && k.col === col)
  if (!key) return null

  const override = keyOverrides[`${row},${col}`]
  const primaryLabel = override?.slots?.center?.value || key.layers[keymapData.layerNames[0]] || ''

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={clearSelection}>←</button>
        <span className={styles.keyLabel}>{primaryLabel || `Key`}</span>
        <span className={styles.rowCol}>r{row} c{col}</span>
      </div>

      <SlotDiagram
        slots={override?.slots}
        focusedSlot={focusedSlot}
        onFocus={setFocusedSlot}
      />

      <SlotTabs
        slots={override?.slots}
        focusedSlot={focusedSlot}
        onFocus={setFocusedSlot}
      />

      <SlotEditor row={row} col={col} slotId={focusedSlot} />
    </div>
  )
}
