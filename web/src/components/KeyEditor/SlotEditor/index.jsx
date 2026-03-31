import { useKeyboardStore } from '../../../store.js'
import TextInput from './TextInput.jsx'
import IconPicker from './IconPicker.jsx'
import styles from '../KeyEditor.module.css'

export default function SlotEditor({ row, col, slotId }) {
  const slot   = useKeyboardStore(s => s.keyOverrides[`${row},${col}`]?.slots[slotId])
  const config = useKeyboardStore(s => s.config)
  const setSlotOverride = useKeyboardStore(s => s.setSlotOverride)

  if (!slot) return null

  function update(patch) {
    setSlotOverride(row, col, slotId, { ...slot, ...patch })
  }

  return (
    <div className={styles.slotEditor}>
      <div className={styles.row}>
        <span className={styles.label}>Active</span>
        <label className={styles.activeToggle}>
          <input
            type="checkbox"
            checked={slot.active}
            onChange={e => update({ active: e.target.checked })}
          />
          {slot.active ? 'On' : 'Off'}
        </label>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Type</span>
        <div className={styles.typeToggle}>
          {['text', 'icon'].map(t => (
            <button
              key={t}
              className={`${styles.typeBtn} ${slot.type === t ? styles.typeBtnActive : ''}`}
              onClick={() => update({ type: t, value: '' })}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {slot.type === 'text' && (
        <TextInput
          value={slot.value}
          onChange={val => update({ value: val, active: val !== '' })}
          styles={styles}
        />
      )}

      {slot.type === 'icon' && (
        <IconPicker
          icons={config.icons}
          value={slot.value}
          onChange={key => update({ value: key, active: true })}
          styles={styles}
        />
      )}
    </div>
  )
}
