import type { ArchNode, Flow, Project, Slab } from './types'

/**
 * Geometría de la escena isométrica. Puro: recibe un proyecto y devuelve trazados SVG
 * ya proyectados y ordenados para pintar de atrás hacia delante (algoritmo del pintor).
 */

export type ProjectionKind = 'dimetric' | 'isometric'
type Vec3 = [x: number, y: number, z: number]
type Vec2 = [x: number, y: number]

/** Unidad de rejilla en píxeles SVG. */
export const UNIT = 40
/** Cada nodo ocupa una celda de 2×2; el bloque se dibuja más pequeño y centrado para dejar ver las aristas. */
const CELL = 2
const SIZE = { box: 1.3, cyl: 1.5 }
/** Altura extra de los arcos aéreos sobre el más alto de sus extremos. */
const ARC_RISE = 3.2

export function projector(kind: ProjectionKind) {
  // Dimétrica 2:1 (2 px en x por cada 1 px en y) o isométrica real de 30°
  const cx = kind === 'isometric' ? UNIT * Math.cos(Math.PI / 6) : UNIT
  const cy = UNIT / 2
  const project = ([x, y, z]: Vec3): Vec2 => [(x - y) * cx, (x + y) * cy - z * UNIT]
  return { cx, cy, project }
}
type Projector = ReturnType<typeof projector>

export interface PlacedNode extends ArchNode {
  w: number
  d: number
  z: number
  onSlab: boolean
  inFront: boolean
}

export type Layer = 'back' | 'slab' | 'mid' | 'blocks' | 'front' | 'air'
export const LAYERS: Layer[] = ['back', 'slab', 'mid', 'blocks', 'front', 'air']

export type FaceKind = 'top' | 'lf' | 'rt'
export interface Face { kind: FaceKind; d: string }

export interface SceneBlock { kind: 'block'; node: PlacedNode; layer: Layer; faces: Face[]; label: Vec2; anchor: Vec2; order: number }
export interface SceneEdge { kind: 'edge'; id: string; index: number; from: string; to: string; flow: Flow; arc: boolean; layer: Layer; d: string; points: Vec3[]; anchor: Vec2; order: number }
export interface SceneSlab { kind: 'slab'; layer: 'slab'; faces: Face[]; label: { at: Vec2; angle: number; text: string }; anchor: Vec2; order: number }
export type Piece = SceneBlock | SceneEdge | SceneSlab
/** Pieza aún sin número de orden; el Omit se reparte por cada miembro de la unión. */
type Unordered = Piece extends infer T ? (T extends Piece ? Omit<T, 'order'> : never) : never

export interface Scene {
  viewBox: { x: number; y: number; w: number; h: number }
  /** Piezas en orden de pintado. */
  pieces: Piece[]
  nodes: Map<string, PlacedNode>
}

const fmt = (n: number) => n.toFixed(1)
const pathOf = (pts: Vec2[], close = true) => `M${pts.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' L')}${close ? 'Z' : ''}`

export function placeNodes(p: Project): PlacedNode[] {
  const s = p.slab
  return p.nodes.map(n => {
    const size = SIZE[n.shape ?? 'box'], off = (CELL - size) / 2
    const x = n.x + off, y = n.y + off
    const onSlab = x >= s.x && x + size <= s.x + s.w && y >= s.y && y + size <= s.y + s.d
    return { ...n, x, y, w: size, d: size, z: onSlab ? s.h : 0, onSlab, inFront: !onSlab && y >= s.y + s.d }
  })
}

function boxFaces({ x, y, z, w, d, h }: { x: number; y: number; z: number; w: number; d: number; h: number }, P: Projector): Face[] {
  const f = (kind: FaceKind, pts: Vec3[]): Face => ({ kind, d: pathOf(pts.map(P.project)) })
  return [
    f('rt', [[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]]),
    f('lf', [[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]]),
    f('top', [[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]]),
  ]
}

function cylinderFaces(n: PlacedNode, P: Projector): Face[] {
  const r = n.w / 2
  const [cx, bottom] = P.project([n.x + r, n.y + r, n.z])
  const top = bottom - n.h * UNIT
  // Un círculo en el suelo se proyecta como elipse con los ejes alineados a la pantalla
  const rx = r * P.cx * Math.SQRT2, ry = r * P.cy * Math.SQRT2
  const arc = (y: number, to: number) => `A${fmt(rx)},${fmt(ry)} 0 0 0 ${fmt(to)},${fmt(y)}`
  const ellipse = (y: number) => `M${fmt(cx - rx)},${fmt(y)} ${arc(y, cx + rx)} A${fmt(rx)},${fmt(ry)} 0 0 0 ${fmt(cx - rx)},${fmt(y)}Z`
  return [
    { kind: 'lf', d: `M${fmt(cx - rx)},${fmt(top)} L${fmt(cx - rx)},${fmt(bottom)} ${arc(bottom, cx + rx)} L${fmt(cx + rx)},${fmt(top)}Z` },
    { kind: 'rt', d: `M${fmt(cx)},${fmt(bottom + ry)} ${arc(bottom, cx + rx)} L${fmt(cx + rx)},${fmt(top)} L${fmt(cx)},${fmt(top + ry)}Z` },
    { kind: 'top', d: ellipse(top) },
  ]
}

/** Recta sobre el suelo (subiendo o bajando por el canto de la losa) o arco aéreo de extremo a extremo. */
export function edgePoints(a: PlacedNode, b: PlacedNode, arc: boolean, slab: Slab): Vec3[] {
  const ca: Vec2 = [a.x + a.w / 2, a.y + a.d / 2], cb: Vec2 = [b.x + b.w / 2, b.y + b.d / 2]
  if (arc) {
    const za = a.z + a.h, zb = b.z + b.h, peak = Math.max(za, zb) + ARC_RISE
    return Array.from({ length: 29 }, (_, i) => {
      const t = i / 28, u = 1 - t
      const q = (p0: number, p1: number, p2: number) => u * u * p0 + 2 * u * t * p1 + t * t * p2
      return [q(ca[0], (ca[0] + cb[0]) / 2, cb[0]), q(ca[1], (ca[1] + cb[1]) / 2, cb[1]), q(za, peak, zb)] as Vec3
    })
  }
  const axis = ca[0] !== cb[0] ? 0 : 1, sign = Math.sign(cb[axis] - ca[axis])
  const start: Vec2 = [...ca], end: Vec2 = [...cb]
  start[axis] += sign * (axis ? a.d : a.w) / 2
  end[axis] -= sign * ((axis ? b.d : b.w) / 2 + 0.05)
  const out: Vec3[] = [[...start, a.z]]
  if (a.z !== b.z) {
    const lo = axis ? slab.y : slab.x, hi = lo + (axis ? slab.d : slab.w)
    const edge = a.onSlab ? (sign > 0 ? hi : lo) : (sign > 0 ? lo : hi)
    const m: Vec2 = [...start]
    m[axis] = edge
    out.push([...m, a.z], [...m, b.z])
  }
  out.push([...end, b.z])
  return out
}

export function buildScene(p: Project, kind: ProjectionKind): Scene {
  const P = projector(kind), slab = p.slab
  const placed = placeNodes(p), nodes = new Map(placed.map(n => [n.id, n]))
  const byLayer: Record<Layer, Unordered[]> = { back: [], slab: [], mid: [], blocks: [], front: [], air: [] }
  const bounds: Vec2[] = []
  const track = (pts: Vec3[]) => { pts.forEach(q => bounds.push(P.project(q))); return pts }

  track([[slab.x, slab.y, 0], [slab.x + slab.w, slab.y + slab.d, slab.h], [slab.x + slab.w, slab.y, 0], [slab.x, slab.y + slab.d, 0]])
  const [lx, ly] = P.project([slab.x + slab.w, slab.y + slab.d / 2, 0])
  byLayer.slab.push({
    kind: 'slab', layer: 'slab', faces: boxFaces({ ...slab, z: 0 }, P),
    label: { at: [lx + 10, ly + 14], angle: -Math.atan2(P.cy, P.cx) * 180 / Math.PI, text: slab.label },
    anchor: P.project([slab.x + slab.w / 2, slab.y + slab.d / 2, slab.h]),
  })

  p.edges.forEach(([from, to, flow, arc], i) => {
    const a = nodes.get(from)!, b = nodes.get(to)!, isArc = arc === 'arc'
    const points = track(edgePoints(a, b, isArc, slab))
    const layer: Layer = isArc ? 'air' : a.inFront || b.inFront ? 'front' : !a.onSlab || !b.onSlab ? 'back' : 'mid'
    byLayer[layer].push({
      kind: 'edge', id: `e${i}`, index: i, from, to, flow, arc: isArc, layer, points,
      d: pathOf(points.map(P.project), false), anchor: P.project(points[Math.floor(points.length / 2)]),
    })
  })

  // Dentro de cada capa, lo más lejano (menor x + y) se pinta antes
  ;[...placed].sort((a, b) => a.x + a.y - (b.x + b.y)).forEach(n => {
    track([[n.x, n.y, n.z + n.h + 1.3], [n.x + n.w, n.y + n.d, n.z]])
    const layer: Layer = n.onSlab ? 'blocks' : n.inFront ? 'front' : 'back'
    const [tx, ty] = P.project([n.x + n.w / 2, n.y + n.d / 2, n.z + n.h])
    const lift = n.shape === 'cyl' ? n.w / 2 * P.cy * Math.SQRT2 : P.cy
    byLayer[layer].push({
      kind: 'block', node: n, layer, faces: n.shape === 'cyl' ? cylinderFaces(n, P) : boxFaces(n, P),
      label: [tx, ty - lift], anchor: P.project([n.x + n.w / 2, n.y + n.d / 2, n.z + n.h / 2]),
    })
  })

  let order = 0
  const pieces = LAYERS.flatMap(l => byLayer[l].map(piece => ({ ...piece, order: ++order }) as Piece))
  const xs = bounds.map(b => b[0]), ys = bounds.map(b => b[1])
  // Margen para las etiquetas de los nodos exteriores y el rótulo inclinado de la losa
  const x = Math.min(...xs) - 110, y = Math.min(...ys) - 20
  return { viewBox: { x, y, w: Math.max(...xs) + 190 - x, h: Math.max(...ys) + 24 - y }, pieces, nodes }
}
