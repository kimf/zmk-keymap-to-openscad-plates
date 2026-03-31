import { describe, it, expect } from 'vitest'
import { parseKeymapText } from '../lib/parse.js'
import defaultConfig from '../lib/defaultConfig.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Use the real keymap fixture from the project root
const keymapText = fs.readFileSync(
  path.resolve(__dirname, '../../../olik.keymap'), 'utf8'
)

describe('parseKeymapText', () => {
  it('returns layerNames, grid, keys', () => {
    const result = parseKeymapText(keymapText, defaultConfig)
    expect(result).toHaveProperty('layerNames')
    expect(result).toHaveProperty('grid')
    expect(result).toHaveProperty('keys')
    expect(Array.isArray(result.keys)).toBe(true)
    expect(result.keys.length).toBeGreaterThan(0)
  })

  it('grid matches layout (5 rows, 12 cols)', () => {
    const result = parseKeymapText(keymapText, defaultConfig)
    expect(result.grid.rows).toBe(5)
    expect(result.grid.cols).toBe(12)
  })

  it('key at row=0 col=0 has a Base layer label', () => {
    const result = parseKeymapText(keymapText, defaultConfig)
    const key = result.keys.find(k => k.row === 0 && k.col === 0)
    expect(key).toBeDefined()
    expect(key.layers['Base']).toBeTruthy()
  })

  it('empty keys have empty string labels', () => {
    const result = parseKeymapText(keymapText, defaultConfig)
    const emptyKey = result.keys.find(k => k.empty)
    if (emptyKey) {
      for (const label of Object.values(emptyKey.layers)) {
        expect(label).toBe('')
      }
    }
  })
})
