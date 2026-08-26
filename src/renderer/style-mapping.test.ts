import { describe, expect, it } from 'vitest'

import { propertiesToStyle } from './style-mapping'

describe('property to style mapping', () => {
  it('maps typography', () => {
    expect(
      propertiesToStyle({
        typography: {
          fontSize: 56,
          fontWeight: 700,
          lineHeight: 1.1,
          letterSpacing: 0.6,
          textAlign: 'center',
          textTransform: 'uppercase',
          color: '#fafafa',
        },
      }),
    ).toEqual({
      fontSize: '56px',
      fontWeight: 700,
      lineHeight: 1.1,
      letterSpacing: '0.6px',
      textAlign: 'center',
      textTransform: 'uppercase',
      color: '#fafafa',
    })
  })

  it('maps surface, resolving named shadows to tokens rather than literals', () => {
    const style = propertiesToStyle({
      surface: {
        background: '#050506',
        borderColor: '#262626',
        borderWidth: 1,
        borderRadius: 12,
        opacity: 1,
        shadow: 'glow',
      },
    })

    expect(style).toMatchObject({
      backgroundColor: '#050506',
      borderColor: '#262626',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderRadius: '12px',
      boxShadow: 'var(--shadow-glow)',
    })
  })

  it('writes only the spacing sides that are present', () => {
    expect(propertiesToStyle({ spacing: { padding: { top: 8, left: 20 }, gap: 12 } })).toEqual({
      paddingTop: '8px',
      paddingLeft: '20px',
      gap: '12px',
    })
  })

  it('maps dimensions including auto and percentages', () => {
    expect(
      propertiesToStyle({
        size: { width: { value: 100, unit: '%' }, height: 'auto', maxWidth: { value: 760, unit: 'px' } },
      }),
    ).toEqual({ width: '100%', height: 'auto', maxWidth: '760px' })
  })

  it('maps layout, including grid columns and bounded translation', () => {
    expect(
      propertiesToStyle({
        layout: {
          display: 'grid',
          alignItems: 'start',
          justifyContent: 'space-between',
          gridColumns: 3,
          translateX: 10,
          translateY: -4,
        },
      }),
    ).toEqual({
      display: 'grid',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      transform: 'translate(10px, -4px)',
    })
  })

  it('maps sibling order, including the falsy first position', () => {
    expect(propertiesToStyle({ layout: { order: 0 } })).toEqual({ order: 0 })
    expect(propertiesToStyle({ layout: { order: 2 } })).toEqual({ order: 2 })
  })

  it('keeps falsy but valid values instead of dropping them', () => {
    const style = propertiesToStyle({
      surface: { opacity: 0, borderWidth: 0 },
      spacing: { padding: { top: 0 }, gap: 0 },
    })

    expect(style).toMatchObject({
      opacity: 0,
      borderWidth: '0px',
      paddingTop: '0px',
      gap: '0px',
    })
  })

  it('produces no declarations for an empty property set', () => {
    expect(propertiesToStyle({})).toEqual({})
    expect(propertiesToStyle({ layout: { translateX: 0, translateY: 0 } })).toEqual({})
  })
})
