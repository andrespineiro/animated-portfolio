export type Role = 'ingest' | 'app' | 'data' | 'ext' | 'ops'
export type Flow = 'query' | 'ingest' | 'deploy'

export const ROLES: Record<Role, { label: string }> = {
  ingest: { label: 'Ingesta' },
  app: { label: 'Servicio' },
  data: { label: 'Datos' },
  ext: { label: 'Externo' },
  ops: { label: 'Despliegue' },
}

export const FLOWS: Record<Flow, string> = {
  query: 'Consulta',
  ingest: 'Ingesta',
  deploy: 'Despliegue',
}

/** Una decisión de diseño: qué se eligió, frente a qué y por qué. */
export interface Decision {
  chose: string
  over: string
  why: string
  /** Redactada pero sin confirmar por el autor: solo se muestra en desarrollo. */
  draft?: boolean
}

/** Nodo en coordenadas de rejilla: ocupa una celda de 2×2 con esquina en (x, y). */
export interface ArchNode {
  id: string
  x: number
  y: number
  /** Altura del bloque en unidades de rejilla. */
  h: number
  role: Role
  shape?: 'cyl'
  name: string
  sub: string
  desc: string
  tech: string[]
  decision?: Decision
}

/** Arista recta (origen y destino alineados en x o y) o arco aéreo. */
export type ArchEdge = [from: string, to: string, flow: Flow] | [from: string, to: string, flow: Flow, 'arc']

/** Losa sobre la que se apoya el sistema desplegado (servidor, clúster…). */
export interface Slab {
  x: number
  y: number
  w: number
  d: number
  h: number
  label: string
  tech: string[]
}

export interface Project {
  id: string
  name: string
  tagline: string
  what: string
  summary: [label: string, value: string][]
  slab: Slab
  nodes: ArchNode[]
  edges: ArchEdge[]
}
