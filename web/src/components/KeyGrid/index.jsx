import { useKeyboardStore } from '../../store.js'
import KeyCell from './KeyCell.jsx'
import styles from './KeyGrid.module.css'

export default function KeyGrid() {
  const keymapData = useKeyboardStore(s => s.keymapData)
  const selectedKey = useKeyboardStore(s => s.selectedKey)
  const selectKey = useKeyboardStore(s => s.selectKey)

  if (!keymapData) return null

  const { grid, keys } = keymapData

  const byPosition = {}
  for (const key of keys) {
    byPosition[`${key.row},${key.col}`] = key
  }

  const cells = []
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const key = byPosition[`${row},${col}`]
      if (!key) {
        cells.push(<div key={`${row},${col}`} className={styles.cellEmpty} />)
        continue
      }
      const isSelected = selectedKey?.row === row && selectedKey?.col === col
      cells.push(
        <KeyCell
          key={`${row},${col}`}
          keyEntry={key}
          isSelected={isSelected}
          onClick={() => !key.empty && selectKey(row, col)}
        />
      )
    }
  }

  return <div className={styles.grid}>{cells}</div>
}
