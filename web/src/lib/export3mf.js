import { zipSync, strToU8 } from 'fflate'
import * as THREE from 'three'

// The three material colors in order (indices 0, 1, 2)
export const COLOR_MAP = ['#1a1a1a', '#e0e0e0', '#888888']

const CORE_NS        = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'
const MATERIAL_NS    = 'http://schemas.microsoft.com/3dmanufacturing/material/2015/02'
const COLOR_GROUP_ID = 1  // must match pid on <object> elements

// Pre-parsed THREE.Color instances for nearest-neighbor matching (avoid per-call alloc)
const COLOR_MAP_THREE = COLOR_MAP.map(c => new THREE.Color(c))

/**
 * Find the closest COLOR_MAP index for a material's hex color.
 */
function colorIndex(material) {
  if (!material?.color) return 0
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < COLOR_MAP_THREE.length; i++) {
    const ref = COLOR_MAP_THREE[i]
    const dr = material.color.r - ref.r
    const dg = material.color.g - ref.g
    const db = material.color.b - ref.b
    const d = dr*dr + dg*dg + db*db   // squared distance — no sqrt needed for comparison
    if (d < bestDist) { bestDist = d; best = i }
  }
  return best
}

/**
 * Serialize a THREE.Mesh's geometry (after applying matrix world) to
 * 3MF <vertices> and <triangles> XML strings.
 */
function meshToXml(mesh, objectId, pindex) {
  // Work on a clone so we don't mutate the original
  const geo = mesh.geometry.clone()
  geo.applyMatrix4(mesh.matrixWorld)
  // BoxGeometry and all generated geometries are indexed; non-indexed geometries
  // are handled by the fallback triangle loop in meshToXml_indexed.
  return meshToXml_indexed(geo, objectId, pindex)
}

function meshToXml_indexed(geo, objectId, pindex) {
  const pos = geo.attributes.position
  const idx = geo.index?.array

  let verts = ''
  for (let i = 0; i < pos.count; i++) {
    verts += `<vertex x="${pos.getX(i).toFixed(4)}" y="${pos.getY(i).toFixed(4)}" z="${pos.getZ(i).toFixed(4)}"/>`
  }

  let tris = ''
  if (idx) {
    for (let i = 0; i < idx.length; i += 3) {
      tris += `<triangle v1="${idx[i]}" v2="${idx[i+1]}" v3="${idx[i+2]}"/>`
    }
  } else {
    const n = pos.count
    for (let i = 0; i < n; i += 3) {
      tris += `<triangle v1="${i}" v2="${i+1}" v3="${i+2}"/>`
    }
  }

  return `<object id="${objectId}" type="model" pid="${COLOR_GROUP_ID}" pindex="${pindex}">` +
    `<mesh><vertices>${verts}</vertices><triangles>${tris}</triangles></mesh>` +
    `</object>`
}

/**
 * Build the 3dmodel.model XML string from an array of THREE.Mesh objects.
 */
export function buildModelXml(meshes) {
  const colorGroup = `<m:colorgroup id="${COLOR_GROUP_ID}">` +
    COLOR_MAP.map(c => `<m:color color="${c}"/>`).join('') +
    `</m:colorgroup>`

  let objectsXml = ''
  let buildXml   = ''
  let id = 2

  for (const mesh of meshes) {
    if (!mesh.geometry || !mesh.visible) continue
    const pidx = colorIndex(mesh.material)
    objectsXml += meshToXml(mesh, id, pidx)
    buildXml   += `<item objectid="${id}"/>`
    id++
  }

  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<model xmlns="${CORE_NS}" xmlns:m="${MATERIAL_NS}" unit="millimeter">` +
    `<resources>${colorGroup}${objectsXml}</resources>` +
    `<build>${buildXml}</build>` +
    `</model>`
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>` +
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>` +
  `</Types>`

const RELS = `<?xml version="1.0" encoding="UTF-8"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Target="/3D/3dmodel.model" Id="rel0" ` +
  `Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>` +
  `</Relationships>`

/**
 * Collect all meshes from a Three.js scene, build the 3MF, and return a Blob.
 */
export function export3mf(scene) {
  const meshes = []
  scene.traverse(obj => {
    if (obj.isMesh) meshes.push(obj)
  })

  const modelXml = buildModelXml(meshes)

  const zipped = zipSync({
    '[Content_Types].xml':  strToU8(CONTENT_TYPES),
    '_rels/.rels':          strToU8(RELS),
    '3D/3dmodel.model':     strToU8(modelXml),
  })

  return new Blob([zipped], {
    type: 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
  })
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  // Anchor must be in the DOM for Firefox to trigger the download.
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke asynchronously — the browser reads the object URL on the next tick.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
