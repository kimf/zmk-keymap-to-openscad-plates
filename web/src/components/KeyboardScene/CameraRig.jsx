import { useRef } from 'react'
import { OrbitControls } from '@react-three/drei'

const DEFAULT_POS = [60, 90, 60]

export default function CameraRig() {
  const controlsRef = useRef()

  return (
    <OrbitControls ref={controlsRef} makeDefault />
  )
}

export { DEFAULT_POS }
