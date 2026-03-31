import styles from './KeyEditor.module.css'

const ALL_SLOTS = ['topLeft', 'topCenter', 'topRight', 'center', 'botLeft', 'botCenter', 'botRight']

export default function SlotTabs({ slots, focusedSlot, onFocus }) {
  const activeSlots = ALL_SLOTS.filter(s => slots?.[s]?.active || s === 'center')
  const inactiveSlots = ALL_SLOTS.filter(s => !slots?.[s]?.active && s !== 'center')

  return (
    <div className={styles.tabs}>
      {activeSlots.map(slotId => (
        <div
          key={slotId}
          className={`${styles.tab} ${focusedSlot === slotId ? styles.tabActive : ''}`}
          onClick={() => onFocus(slotId)}
        >
          {slotId}
        </div>
      ))}
      {inactiveSlots.length > 0 && (
        <div
          className={styles.tab}
          onClick={() => onFocus(inactiveSlots[0])}
          title="Add slot"
        >
          +
        </div>
      )}
    </div>
  )
}
