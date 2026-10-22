import type { Project } from './types'

/** JSON con las tuplas cortas (aristas, pares del resumen, listas de tecnologías) en una sola línea. */
export const toSource = (p: Project) =>
  JSON.stringify(p, null, 2).replace(/\[\n\s+("[^"\n]*"(?:,\n\s+"[^"\n]*"){0,3})\n\s+\]/g, (_, items: string) => `[${items.replace(/,\n\s+/g, ', ')}]`)
