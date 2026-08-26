import { describe, expect, it } from 'vitest'

import {
  colorValueSchema,
  editablePropertiesSchema,
  FORBIDDEN_PROPERTY_KEYS,
  safeUrlSchema,
} from './properties'

describe('editable property boundary', () => {
  it('accepts a valid multi-group property object', () => {
    const result = editablePropertiesSchema.safeParse({
      content: { text: 'Hello', href: '#features' },
      typography: { fontSize: 24, fontWeight: 600, textAlign: 'center', color: '#fafafa' },
      surface: { background: 'var(--surface-panel)', borderWidth: 1, opacity: 1 },
      spacing: { padding: { top: 8, left: 0 }, gap: 12 },
      size: { width: { value: 100, unit: '%' }, height: 'auto' },
      layout: { display: 'flex', flexDirection: 'column', gridColumns: 3 },
    })

    expect(result.success).toBe(true)
  })

  it.each(FORBIDDEN_PROPERTY_KEYS)('rejects the forbidden key %s', (key) => {
    const result = editablePropertiesSchema.safeParse({ [key]: 'anything' })
    expect(result.success).toBe(false)
  })

  it('rejects unknown keys inside a known group', () => {
    const result = editablePropertiesSchema.safeParse({
      typography: { fontSize: 16, fontFamily: 'Comic Sans' },
    })
    expect(result.success).toBe(false)
  })

  it('preserves falsy-but-valid values instead of treating them as absent', () => {
    const result = editablePropertiesSchema.safeParse({
      content: { text: '' },
      surface: { opacity: 0, borderWidth: 0 },
      spacing: { padding: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 0 },
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.content?.text).toBe('')
    expect(result.data.surface?.opacity).toBe(0)
    expect(result.data.spacing?.gap).toBe(0)
  })

  it.each([
    ['fontSize', { typography: { fontSize: 900 } }],
    ['opacity', { surface: { opacity: 4 } }],
    ['gridColumns', { layout: { gridColumns: 12 } }],
    ['translateX', { layout: { translateX: 5000 } }],
    ['textAlign', { typography: { textAlign: 'justify' } }],
    ['dimension unit', { size: { width: { value: 10, unit: 'vw' } } }],
    ['non-finite number', { typography: { fontSize: Number.NaN } }],
  ])('rejects an out-of-range or unsupported %s value', (_label, value) => {
    expect(editablePropertiesSchema.safeParse(value).success).toBe(false)
  })

  it.each(['#fff', '#5b8def', '#5b8def80', 'transparent', 'var(--action-primary)'])(
    'accepts the color %s',
    (value) => {
      expect(colorValueSchema.safeParse(value).success).toBe(true)
    },
  )

  it.each(['red', 'rgb(1,2,3)', '#12345', 'url(evil)', 'var(--BAD)'])(
    'rejects the color %s',
    (value) => {
      expect(colorValueSchema.safeParse(value).success).toBe(false)
    },
  )

  it.each(['https://example.com/pricing', '/template/hero-preview.svg', '#features'])(
    'accepts the safe url %s',
    (value) => {
      expect(safeUrlSchema.safeParse(value).success).toBe(true)
    },
  )

  it.each([
    'javascript:alert(1)',
    'http://example.com',
    'data:text/html,<script>',
    'JavaScript:alert(1)',
  ])('rejects the unsafe url %s', (value) => {
    expect(safeUrlSchema.safeParse(value).success).toBe(false)
  })
})
