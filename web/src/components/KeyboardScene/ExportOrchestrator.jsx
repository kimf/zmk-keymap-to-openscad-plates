import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useKeyboardStore } from '../../store.js'
import { export3mf, downloadBlob } from '../../lib/export3mf.js'
import { buildExportKeymapData } from '../../lib/buildExportKeymapData.js'
import { buildScad } from '../../lib/generate.js'

export default function ExportOrchestrator() {
  const { scene }          = useThree()
  const pendingExport      = useKeyboardStore(s => s.pendingExport)
  const clearPendingExport = useKeyboardStore(s => s.clearPendingExport)
  const keymapData         = useKeyboardStore(s => s.keymapData)
  const keyOverrides       = useKeyboardStore(s => s.keyOverrides)
  const config             = useKeyboardStore(s => s.config)

  // Keep a ref to the latest values so the export effect never reads stale state
  const latestRef = useRef({})
  latestRef.current = { scene, keymapData, keyOverrides, config, clearPendingExport }

  useEffect(() => {
    if (!pendingExport) return
    const { scene, keymapData, keyOverrides, config, clearPendingExport } = latestRef.current

    try {
      if (pendingExport === '3mf') {
        const blob = export3mf(scene)
        downloadBlob(blob, 'keycaps.3mf')
      } else if (pendingExport === 'scad') {
        const exportData = buildExportKeymapData(keymapData, keyOverrides)
        const scad = buildScad(exportData, config)
        downloadBlob(
          new Blob([scad], { type: 'text/plain' }),
          'output.scad'
        )
      }
    } catch (err) {
      console.error('Export failed:', err)
      alert(`Export failed: ${err.message}`)
    }

    clearPendingExport()
  }, [pendingExport])

  return null
}
