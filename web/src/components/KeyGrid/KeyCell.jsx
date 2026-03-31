import styles from './KeyGrid.module.css'

export default function KeyCell({ keyEntry, isSelected, onClick }) {
  if (keyEntry.empty) return <div className={styles.cellEmpty} />

  const primaryLabel = Object.values(keyEntry.layers)[0] || ''

  return (
    <div
      className={`${styles.cell} ${isSelected ? styles.cellSelected : ''}`}
      onClick={onClick}
      title={`row ${keyEntry.row}, col ${keyEntry.col}`}
    >
      <span className={styles.cellLabel}>{primaryLabel}</span>
    </div>
  )
}
