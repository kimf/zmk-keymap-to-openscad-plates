import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const SIZE = 256

// Slot positions on the texture canvas (0-256 space)
const SLOT_POS = {
  topLeft:   { x: 30,  y: 30,  fontSize: 22, align: 'left'   },
  topCenter: { x: 128, y: 30,  fontSize: 22, align: 'center' },
  topRight:  { x: 226, y: 30,  fontSize: 22, align: 'right'  },
  center:    { x: 128, y: 148, fontSize: 40, align: 'center' },
  botLeft:   { x: 30,  y: 228, fontSize: 22, align: 'left'   },
  botCenter: { x: 128, y: 228, fontSize: 22, align: 'center' },
  botRight:  { x: 226, y: 228, fontSize: 22, align: 'right'  },
}

/**
 * Returns a THREE.CanvasTexture that redraws whenever `slots` or `icons` change.
 */
export function useCanvasTexture(slots, icons, font) {
  const canvasRef = useRef(document.createElement('canvas'))
  const textureRef = useRef(null)

  if (!textureRef.current) {
    canvasRef.current.width  = SIZE
    canvasRef.current.height = SIZE
    textureRef.current = new THREE.CanvasTexture(canvasRef.current)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const texture = textureRef.current

    ctx.clearRect(0, 0, SIZE, SIZE)

    for (const [slotId, pos] of Object.entries(SLOT_POS)) {
      const slot = slots?.[slotId]
      if (!slot?.active || !slot.value) continue

      let label = slot.value
      if (slot.type === 'icon') {
        label = icons?.[slot.value] || '?'
      }

      const family = font || 'Hack Nerd Font Mono'
      ctx.font      = `${pos.fontSize}px "${family}"`
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = pos.align
      ctx.textBaseline = 'middle'
      ctx.fillText(label, pos.x, pos.y)
    }

    texture.needsUpdate = true
  }, [slots, icons, font])

  useEffect(() => {
    return () => { textureRef.current?.dispose() }
  }, [])

  return textureRef.current
}
