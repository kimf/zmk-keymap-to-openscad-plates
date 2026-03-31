import { useKeyboardStore } from './store.js'
import TopBar from './components/TopBar/index.jsx'
import KeyGrid from './components/KeyGrid/index.jsx'
import KeyEditor from './components/KeyEditor/index.jsx'
import '@fontsource/fira-code'
import '@fontsource/staatliches'

export default function App() {
  const keymapData  = useKeyboardStore(s => s.keymapData)
  const selectedKey = useKeyboardStore(s => s.selectedKey)

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
        <div className="right-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
          3D preview
        </div>
      </div>
    </div>
  )
}
