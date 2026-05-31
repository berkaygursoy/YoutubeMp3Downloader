export function sanitizeFilename(title: string): string {
  const sanitized = title.replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 100)
  return sanitized || 'untitled'
}
