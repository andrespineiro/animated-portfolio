import type { Flow, Project } from './types'

export type FlowFilter = Flow | 'all'

export interface Selection {
  flow: FlowFilter
  /** Nodo bajo el ratón o con foco de teclado. */
  hover: string | null
  /** Nodo fijado con clic. */
  pin: string | null
  tech: string | null
}

export interface Highlight {
  focus: string | null
  /** Nodos resaltados; null = ninguno atenuado. */
  nodes: Set<string> | null
  /** Índices de aristas activas (animadas). */
  edges: Set<number>
  slab: boolean
  /** Hay un filtro de tecnología activo. */
  byTech: boolean
}

/** Qué se resalta según la selección. Prioridad: tecnología > nodo enfocado > flujo. */
export function highlight(p: Project, s: Selection): Highlight {
  const ids = new Set(p.nodes.map(n => n.id))
  const focus = [s.hover, s.pin].find(id => id !== null && ids.has(id)) ?? null
  const touching = (edges: Set<number>) => new Set(p.edges.filter((_, i) => edges.has(i)).flatMap(([f, t]) => [f, t]))

  if (s.tech) {
    return {
      focus: null,
      nodes: new Set(p.nodes.filter(n => n.tech.includes(s.tech!)).map(n => n.id)),
      edges: new Set(),
      slab: p.slab.tech.includes(s.tech),
      byTech: true,
    }
  }
  if (focus) {
    const edges = new Set(p.edges.flatMap(([f, t], i) => (f === focus || t === focus ? [i] : [])))
    return { focus, nodes: new Set([focus, ...touching(edges)]), edges, slab: false, byTech: false }
  }
  if (s.flow === 'all') return { focus: null, nodes: null, edges: new Set(p.edges.map((_, i) => i)), slab: false, byTech: false }
  const edges = new Set(p.edges.flatMap(([, , flow], i) => (flow === s.flow ? [i] : [])))
  return { focus: null, nodes: touching(edges), edges, slab: false, byTech: false }
}

/** Flujos en los que participa un nodo, sin repetir. */
export function flowsOf(p: Project, id: string): Flow[] {
  return [...new Set(p.edges.filter(([f, t]) => f === id || t === id).map(([, , flow]) => flow))]
}

/** Todas las tecnologías del proyecto, en orden de aparición. */
export function techsOf(p: Project): string[] {
  return [...new Set([...p.nodes.flatMap(n => n.tech), ...p.slab.tech])]
}
