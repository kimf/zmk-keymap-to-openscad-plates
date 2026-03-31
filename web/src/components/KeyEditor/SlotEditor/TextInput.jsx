export default function TextInput({ value, onChange, styles }) {
  return (
    <input
      className={styles.textInput}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Label text..."
      spellCheck={false}
    />
  )
}
