import { Canvas } from '@react-three/fiber'
import { useKeyboardStore } from '../../store.js'
import CameraRig from './CameraRig.jsx'
import KeyCapMesh from './KeyCapMesh.jsx'
import ExportOrchestrator from './ExportOrchestrator.jsx'

export default function KeyboardScene({ fontsReady }) {
  const keymapData = useKeyboardStore(s => s.keymapData)

  if (!fontsReady) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#444' }}>Loading fonts…</div>
  }

  return (
    <Canvas
      camera={{ position: [60, 90, 60], fov: 50 }}
      style={{ background: '#080810' }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[20, 40, 20]} intensity={1.2} />

      <CameraRig />
      <ExportOrchestrator />

      {keymapData?.keys
        .filter(k => !k.empty)
        .map(k => (
          <KeyCapMesh key={`${k.row},${k.col}`} keyEntry={k} />
        ))
      }
    </Canvas>
  )
}
