import styles from './KeyEditor.module.css'

const DIAGRAM_LAYOUT = [
  ['topLeft', 'topCenter', 'topRight'],
  [null,      'center',    null      ],
  ['botLeft', 'botCenter', 'botRight'],
]

const SLOT_LABELS = {
  topLeft: 'TL', topCenter: 'TC', topRight: 'TR',
  center: '●',
  botLeft: 'BL', botCenter: 'BC', botRight: 'BR',
}

export default function SlotDiagram({ slots, focusedSlot, onFocus }) {
  return (
    <div className={styles.diagram}>
      {DIAGRAM_LAYOUT.flat().map((slotId, i) => {
        if (!slotId) return <div key={i} />
        const slot = slots?.[slotId]
        const isActive = slot?.active
        const isFocused = focusedSlot === slotId
        const isCenter = slotId === 'center'
        return (
          <div
            key={slotId}
            className={[
              styles.diagCell,
              isActive  ? styles.diagCellActive  : '',
              isFocused ? styles.diagCellFocused : '',
              isCenter  ? styles.diagCenterCell  : '',
            ].join(' ')}
            onClick={() => onFocus(slotId)}
            title={slotId}
          >
            {slot?.type === 'icon' && slot?.value
              ? '★'
              : (slot?.value || SLOT_LABELS[slotId])}
          </div>
        )
      })}
    </div>
  )
}
