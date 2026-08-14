let fallbackSequence = 0

export function createId(prefix: string): string {
  const unique = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}_${fallbackSequence++}`
  return `${prefix}_${unique}`
}
