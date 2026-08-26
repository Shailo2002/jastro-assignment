import { describe, expect, it } from 'vitest'

import { describeScopeLock, joinWithAnd, protectedViewports } from './edit-scope'

describe('protectedViewports', () => {
  it('protects nothing when the scope is shared', () => {
    expect(protectedViewports('all')).toEqual([])
  })

  it('protects the two views a viewport-scoped edit cannot reach', () => {
    expect(protectedViewports('mobile')).toEqual(['desktop', 'tablet'])
    expect(protectedViewports('desktop')).toEqual(['tablet', 'mobile'])
    expect(protectedViewports('tablet')).toEqual(['desktop', 'mobile'])
  })
})

describe('joinWithAnd', () => {
  it('reads as a sentence for any length', () => {
    expect(joinWithAnd([])).toBe('')
    expect(joinWithAnd(['Desktop'])).toBe('Desktop')
    expect(joinWithAnd(['Desktop', 'Tablet'])).toBe('Desktop and Tablet')
    expect(joinWithAnd(['Desktop', 'Tablet', 'Mobile'])).toBe('Desktop, Tablet and Mobile')
  })
})

describe('describeScopeLock', () => {
  it('states the target count and the scope', () => {
    const description = describeScopeLock({
      scope: 'mobile',
      targetNames: ['Heading: Ship it', 'Button: Use this template'],
    })

    expect(description.targetText).toBe('2 selected')
    expect(description.scopeText).toBe('Mobile only')
    expect(description.canEdit).toBe(true)
  })

  it('names the views a scoped edit leaves alone', () => {
    expect(describeScopeLock({ scope: 'mobile', targetNames: ['a'] }).protectionText).toBe(
      'Desktop and Tablet keep their current values.',
    )
  })

  it('explains that a shared edit still loses to an existing override', () => {
    const description = describeScopeLock({ scope: 'all', targetNames: ['a'] })
    expect(description.protectedViewports).toEqual([])
    expect(description.protectionText).toMatch(/shared value/)
    expect(description.protectionText).toMatch(/overrides a field keeps its own value/)
  })

  it('reports an empty selection as not editable', () => {
    const description = describeScopeLock({ scope: 'all', targetNames: [] })
    expect(description.targetText).toBe('Nothing selected')
    expect(description.canEdit).toBe(false)
  })

  it('tracks the affected names it was given, in order', () => {
    expect(
      describeScopeLock({ scope: 'tablet', targetNames: ['B', 'A'] }).targetNames,
    ).toEqual(['B', 'A'])
  })
})
