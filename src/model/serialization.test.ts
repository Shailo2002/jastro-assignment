import { describe, expect, it } from 'vitest'

import { parseTemplateDocument } from './document'
import { createInitialTemplateDocument } from './initial-template'

/** Walks the document and reports any value that would not survive JSON. */
function findNonSerializableValues(root: unknown): string[] {
  const problems: string[] = []
  const seen = new WeakSet<object>()

  const walk = (value: unknown, path: string): void => {
    if (value === null) return

    const kind = typeof value
    if (kind === 'function' || kind === 'symbol' || kind === 'bigint') {
      problems.push(`${path}: ${kind}`)
      return
    }
    if (kind !== 'object') {
      if (kind === 'number' && !Number.isFinite(value)) {
        problems.push(`${path}: non-finite number`)
      }
      return
    }

    const objectValue = value as object
    if (seen.has(objectValue)) {
      problems.push(`${path}: circular reference`)
      return
    }
    seen.add(objectValue)

    if (value instanceof Map || value instanceof Set) {
      problems.push(`${path}: ${value.constructor.name}`)
      return
    }
    if (value instanceof Date || value instanceof RegExp) {
      problems.push(`${path}: ${value.constructor.name}`)
      return
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${path}[${index}]`))
      return
    }

    const prototype = Object.getPrototypeOf(objectValue) as object | null
    if (prototype !== Object.prototype && prototype !== null) {
      problems.push(`${path}: class instance (${objectValue.constructor.name})`)
      return
    }

    for (const [key, child] of Object.entries(objectValue)) {
      if (child === undefined) {
        problems.push(`${path}.${key}: undefined`)
        continue
      }
      walk(child, `${path}.${key}`)
    }
  }

  walk(root, '$')
  return problems
}

describe('canonical document serialization', () => {
  it('contains only JSON-safe values', () => {
    expect(findNonSerializableValues(createInitialTemplateDocument())).toEqual([])
  })

  it('survives a JSON round trip unchanged', () => {
    const document = createInitialTemplateDocument()
    const roundTripped: unknown = JSON.parse(JSON.stringify(document))

    expect(roundTripped).toEqual(document)
  })

  it('re-validates after a round trip', () => {
    const serialized = JSON.stringify(createInitialTemplateDocument())
    const result = parseTemplateDocument(JSON.parse(serialized))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(JSON.stringify(result.value)).toBe(serialized)
  })

  it('does not silently drop falsy values through serialization', () => {
    const document = createInitialTemplateDocument()
    const serialized = JSON.stringify(document)

    expect(serialized).toContain('"revision":0')
    expect(serialized).toContain('"borderWidth":0')
  })
})
