// Gravité croissante des classifications de données (voir agentguard/taint.py)
export const TAINT_COLOR: Record<string, string> = {
  PUBLIC: '#66635e',
  INTERNAL: '#8a8f98',
  UNTRUSTED: '#c9893a',
  CONFIDENTIAL: '#e9a23b',
  SECRET: '#e2594f',
  MALICIOUS: '#b8322a',
}
export const SENSITIVE = new Set(['CONFIDENTIAL', 'SECRET', 'MALICIOUS'])

export function riskColor(risk: number | null | undefined): string {
  if (risk == null) return '#8e8b85'
  if (risk >= 60) return '#e2594f'
  if (risk >= 30) return '#e9a23b'
  return '#5fb08c'
}
