import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useCanvasTexture } from './useCanvasTexture.js'
import { useKeyboardStore } from '../../store.js'

const KEY_W = 16
const KEY_H = 16
const PLATE_H = 0.8
const GAP = 1
const HALVE_GAP = 20
const LEGEND_H = 0.42   // sits just above base top face
const LEGEND_DEPTH = 0.02

// Which slots use "legend" (white) material vs "accent" (gray)
const LEGEND_SLOTS  = new Set(['center', 'topLeft', 'topCenter', 'topRight'])
const ACCENT_SLOTS  = new Set(['botLeft', 'botCenter', 'botRight'])

const SLOT_OFFSET = {
  topLeft:   { x: -4.5, z: -4.5, w: 5, h: 5 },
  topCenter: { x:    0, z: -4.5, w: 5, h: 5 },
  topRight:  { x:  4.5, z: -4.5, w: 5, h: 5 },
  center:    { x:    0, z:    0, w: 9, h: 9 },
  botLeft:   { x: -4.5, z:  4.5, w: 5, h: 5 },
  botCenter: { x:    0, z:  4.5, w: 5, h: 5 },
  botRight:  { x:  4.5, z:  4.5, w: 5, h: 5 },
}

function keyX(col) {
  const x = col * (KEY_W + GAP)
  return col >= 6 ? x + HALVE_GAP : x
}

function keyZ(row) {
  return row * (KEY_H + GAP)
}

export default function KeyCapMesh({ keyEntry }) {
  const keyOverrides = useKeyboardStore(s => s.keyOverrides)
  const config       = useKeyboardStore(s => s.config)

  const k        = `${keyEntry.row},${keyEntry.col}`
  const override = keyOverrides[k]
  const slots    = override?.slots
  const font     = override?.font || null

  const texture = useCanvasTexture(slots, config.icons, font)

  // Build materials for the base box: 6 faces, top face gets the texture
  const baseMaterials = useMemo(() => [
    new THREE.MeshStandardMaterial({ color: '#1a1a1a' }),  // +x
    new THREE.MeshStandardMaterial({ color: '#1a1a1a' }),  // -x
    new THREE.MeshStandardMaterial({ color: '#1a1a1a', map: texture }),  // +y (top)
    new THREE.MeshStandardMaterial({ color: '#1a1a1a' }),  // -y
    new THREE.MeshStandardMaterial({ color: '#1a1a1a' }),  // +z
    new THREE.MeshStandardMaterial({ color: '#1a1a1a' }),  // -z
  ], [texture])

  useEffect(() => {
    return () => { baseMaterials.forEach(m => m.dispose()) }
  }, [baseMaterials])

  const x = keyX(keyEntry.col)
  const z = keyZ(keyEntry.row)

  const activeSlots = Object.entries(SLOT_OFFSET).filter(([sid]) => slots?.[sid]?.active)

  return (
    <group position={[x, 0, z]}>
      {/* Base plate */}
      <mesh material={baseMaterials}>
        <boxGeometry args={[KEY_W, PLATE_H, KEY_H]} />
      </mesh>

      {/* Legend overlays (white — top/center) */}
      {activeSlots
        .filter(([sid]) => LEGEND_SLOTS.has(sid))
        .map(([sid]) => {
          const off = SLOT_OFFSET[sid]
          return (
            <mesh
              key={sid}
              position={[off.x, LEGEND_H, off.z]}
            >
              <boxGeometry args={[off.w, LEGEND_DEPTH, off.h]} />
              <meshStandardMaterial color="#e0e0e0" />
            </mesh>
          )
        })
      }

      {/* Accent overlays (gray — bottom) */}
      {activeSlots
        .filter(([sid]) => ACCENT_SLOTS.has(sid))
        .map(([sid]) => {
          const off = SLOT_OFFSET[sid]
          return (
            <mesh
              key={sid}
              position={[off.x, LEGEND_H, off.z]}
            >
              <boxGeometry args={[off.w, LEGEND_DEPTH, off.h]} />
              <meshStandardMaterial color="#888888" />
            </mesh>
          )
        })
      }
    </group>
  )
}
