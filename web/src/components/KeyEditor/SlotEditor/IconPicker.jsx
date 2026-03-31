export default function IconPicker({ icons, value, onChange, styles }) {
  const entries = Object.entries(icons)
  return (
    <div className={styles.iconGrid}>
      {entries.map(([key, char]) => (
        <div
          key={key}
          className={`${styles.iconCell} ${value === key ? styles.iconCellSelected : ''}`}
          title={key}
          onClick={() => onChange(key)}
        >
          {char}
        </div>
      ))}
    </div>
  )
}
