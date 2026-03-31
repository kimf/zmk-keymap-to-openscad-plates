import { useState, useEffect } from 'react'
import { useKeyboardStore } from './store.js'
import TopBar from './components/TopBar/index.jsx'
import KeyGrid from './components/KeyGrid/index.jsx'
import KeyEditor from './components/KeyEditor/index.jsx'
import KeyboardScene from './components/KeyboardScene/index.jsx'
import '@fontsource/fira-code'
import '@fontsource/staatliches'

export default function App() {
  const keymapData  = useKeyboardStore(s => s.keymapData)
  const selectedKey = useKeyboardStore(s => s.selectedKey)
  const [fontsReady, setFontsReady] = useState(false)

  useEffect(() => {
    const nerdFont = new FontFace(
      'Hack Nerd Font Mono',
      'url(/fonts/HackNerdFontMono-Regular.woff2)'
    )
    nerdFont.load()
      .then(f => { document.fonts.add(f); setFontsReady(true) })
      .catch(() => setFontsReady(true))  // degrade gracefully
  }, [])

  return (
    <div className="app-shell">
      <TopBar />
      <div className="main-layout">
        <div className="left-panel">
          {keymapData
            ? (selectedKey ? <KeyEditor /> : <KeyGrid />)
            : <p style={{ padding: '20px', color: '#555' }}>Load a .keymap file to begin</p>
          }
        </div>
        <div className="right-panel">
          <KeyboardScene fontsReady={fontsReady} />
        </div>
      </div>
    </div>
  )
}
