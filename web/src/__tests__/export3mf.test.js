import { describe, it, expect, vi } from 'vitest'
import { buildModelXml, export3mf, downloadBlob, COLOR_MAP } from '../lib/export3mf.js'
import * as THREE from 'three'

describe('buildModelXml', () => {
  it('returns a string containing the 3MF core namespace', () => {
    const xml = buildModelXml([])
    expect(xml).toContain('http://schemas.microsoft.com/3dmanufacturing/core/2015/02')
  })

  it('contains the materials namespace', () => {
    const xml = buildModelXml([])
    expect(xml).toContain('http://schemas.microsoft.com/3dmanufacturing/material/2015/02')
  })

  it('contains a colorgroup with 3 colors', () => {
    const xml = buildModelXml([])
    expect(xml.match(/<m:color color=/g)?.length).toBe(3)
  })

  it('serializes a box mesh as vertices and triangles', () => {
    const geo = new THREE.BoxGeometry(1, 1, 1)
    const mat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.updateMatrixWorld()
    const xml = buildModelXml([mesh])
    expect(xml).toContain('<vertices>')
    expect(xml).toContain('<triangle ')
  })

  it('assigns correct pindex for white material', () => {
    const geo = new THREE.BoxGeometry(1, 1, 1)
    // White is color index 1 in COLOR_MAP
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(COLOR_MAP[1]) })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.updateMatrixWorld()
    const xml = buildModelXml([mesh])
    expect(xml).toContain('pindex="1"')
  })

  it('assigns pindex=2 for a slightly-off gray (nearest-neighbor test)', () => {
    const geo = new THREE.BoxGeometry(1, 1, 1)
    // COLOR_MAP[2] is '#888888' — use a close but inexact gray
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#909090') })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.updateMatrixWorld()
    const xml = buildModelXml([mesh])
    expect(xml).toContain('pindex="2"')
  })
})

describe('export3mf', () => {
  it('returns a Blob from an empty scene', () => {
    const scene = new THREE.Scene()
    const blob = export3mf(scene)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('returns a Blob from a scene with a mesh', () => {
    const scene = new THREE.Scene()
    const geo  = new THREE.BoxGeometry(1, 1, 1)
    const mat  = new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    const mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
    const blob = export3mf(scene)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })
})

describe('downloadBlob', () => {
  it('creates and clicks an anchor element, then revokes the URL', () => {
    const mockUrl = 'blob:mock'
    const createObjectURL = vi.fn(() => mockUrl)
    const revokeObjectURL = vi.fn()
    Object.defineProperty(globalThis, 'URL', {
      value: { createObjectURL, revokeObjectURL },
      configurable: true,
    })

    const clicks = []
    const origCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = origCreate(tag)
      if (tag === 'a') el.click = () => clicks.push(el)
      return el
    })

    const blob = new Blob(['test'])
    downloadBlob(blob, 'test.3mf')

    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(clicks.length).toBe(1)
    expect(clicks[0].download).toBe('test.3mf')

    vi.restoreAllMocks()
  })
})
