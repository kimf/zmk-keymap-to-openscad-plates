import { useKeyboardStore } from './store.js'
import KeyGrid from './components/KeyGrid/index.jsx'
import TopBar from './components/TopBar/index.jsx'

export default function App() {
  const keymapData = useKeyboardStore(s => s.keymapData)

  return (
    <div className="app-shell">
      <TopBar />
      <div className="main-layout">
        <div className="left-panel">
          {keymapData
            ? <KeyGrid />
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
