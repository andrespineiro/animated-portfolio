import type { Decision } from './types'

/** Las decisiones en borrador (redactadas, sin confirmar por el autor) solo se ven en desarrollo. */
export const isDecisionVisible = (d: Decision | undefined): d is Decision => !!d && (!d.draft || import.meta.env.DEV)
