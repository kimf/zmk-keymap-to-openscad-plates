import { useRef } from 'react'
import { useKeyboardStore } from '../../store.js'
import { parseKeymapText } from '../../lib/parse.js'
import styles from './TopBar.module.css'

const FONTS = [
  { label: 'Hack Nerd Font',  value: 'Hack Nerd Font Mono:style=Bold' },
  { label: 'Staatliches',     value: 'Staatliches' },
  { label: 'Fira Code',       value: 'Fira Code' },
  { label: 'Pixel Cyr',       value: 'Pixel Cyr' },
  { label: 'Pixel Ex',        value: 'Pixel Ex' },
]

export default function TopBar() {
  const fileRef = useRef(null)
  const config          = useKeyboardStore(s => s.config)
  const loadKeymapData  = useKeyboardStore(s => s.loadKeymapData)
  const triggerExport   = useKeyboardStore(s => s.triggerExport)
  const updateConfig    = useKeyboardStore(s => s.updateConfig)
  const reset           = useKeyboardStore(s => s.reset)
  const keymapData      = useKeyboardStore(s => s.keymapData)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = parseKeymapText(ev.target.result, config)
        loadKeymapData(data)
      } catch (err) {
        alert(`Failed to parse keymap: ${err.message}`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleReset() {
    if (!confirm('Start over? All customizations will be lost.')) return
    localStorage.removeItem('keebs-state')
    reset()
  }

  return (
    <div className={styles.topbar}>
      <span className={styles.title}>⌨ Keebs</span>

      <input
        type="file"
        accept=".keymap"
        ref={fileRef}
        className={styles.fileInput}
        onChange={handleFile}
      />
      <button className={styles.btn} onClick={() => fileRef.current.click()}>
        Load .keymap
      </button>

      {/* FontPicker — updates config.legends.font so SCAD export uses chosen font */}
      <select
        className={styles.btn}
        value={config.legends.font}
        onChange={e => updateConfig({ legends: { ...config.legends, font: e.target.value } })}
        title="Global font"
      >
        {FONTS.map(f => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      {keymapData && (
        <>
          <div className={styles.spacer} />
          <button className={styles.btn} onClick={() => triggerExport('3mf')}>
            ↓ 3MF
          </button>
          <button className={styles.btn} onClick={() => triggerExport('scad')}>
            ↓ SCAD
          </button>
          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleReset}>
            Start Over
          </button>
        </>
      )}
    </div>
  )
}
