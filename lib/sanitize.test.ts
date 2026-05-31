import { sanitizeFilename } from './sanitize'

describe('sanitizeFilename', () => {
  it('keeps alphanumeric, spaces, hyphens, and underscores', () => {
    expect(sanitizeFilename('Hello World_test-123')).toBe('Hello World_test-123')
  })

  it('removes special characters like colons, exclamation marks, parens', () => {
    expect(sanitizeFilename('Hello: World! (feat. Artist)')).toBe('Hello World feat Artist')
  })

  it('truncates to 100 characters', () => {
    expect(sanitizeFilename('a'.repeat(150))).toHaveLength(100)
  })

  it('trims leading and trailing spaces after sanitization', () => {
    expect(sanitizeFilename('  hello  ')).toBe('hello')
  })

  it('returns "untitled" when result is blank', () => {
    expect(sanitizeFilename('!!!')).toBe('untitled')
  })

  it('returns "untitled" for empty string', () => {
    expect(sanitizeFilename('')).toBe('untitled')
  })
})
