import { FLOWS, ROLES, type Project } from './types'

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Valida un proyecto llegado como JSON sin tipar. Devuelve los errores en español,
 * cada uno con la ruta del campo, o una lista vacía si es válido.
 */
export function validate(p: unknown): string[] {
  if (!isObj(p)) return ['La raíz debe ser un objeto.']
  const err: string[] = []
  for (const k of ['id', 'name', 'tagline', 'what'] as const) if (!isStr(p[k])) err.push(`Falta "${k}".`)
  if (!Array.isArray(p.summary) || p.summary.some(r => !Array.isArray(r) || r.length !== 2 || !r.every(isStr)))
    err.push('"summary" debe ser una lista de pares [etiqueta, valor].')

  const s = p.slab
  if (!isObj(s) || !(['x', 'y', 'w', 'd', 'h'] as const).every(k => isNum(s[k]))) err.push('"slab" necesita x, y, w, d y h numéricos.')
  else if (!Array.isArray(s.tech) || !isStr(s.label)) err.push('"slab" necesita "label" y una lista "tech".')

  if (!Array.isArray(p.nodes) || p.nodes.length === 0) return [...err, '"nodes" debe ser una lista no vacía.']
  const nodes = new Map<string, Record<string, unknown>>()
  p.nodes.forEach((n: unknown, i) => {
    if (!isObj(n) || !isStr(n.id)) return void err.push(`nodes[${i}]: falta "id".`)
    const at = `nodes[${i}] (${n.id})`
    if (nodes.has(n.id)) err.push(`${at}: id repetido.`)
    nodes.set(n.id, n)
    for (const k of ['x', 'y', 'h'] as const) if (!isNum(n[k])) err.push(`${at}: "${k}" debe ser un número.`)
    if (isNum(n.h) && (n.h <= 0 || n.h > 6)) err.push(`${at}: "h" debe estar entre 0 y 6.`)
    if (!isStr(n.role) || !(n.role in ROLES)) err.push(`${at}: "role" debe ser uno de ${Object.keys(ROLES).join(', ')}.`)
    if (n.shape !== undefined && n.shape !== 'cyl') err.push(`${at}: "shape" solo admite "cyl".`)
    for (const k of ['name', 'sub', 'desc'] as const) if (!isStr(n[k])) err.push(`${at}: falta "${k}".`)
    if (!Array.isArray(n.tech) || !n.tech.every(isStr)) err.push(`${at}: "tech" debe ser una lista de textos.`)
    const d = n.decision
    if (d !== undefined && !(isObj(d) && isStr(d.chose) && isStr(d.over) && isStr(d.why)))
      err.push(`${at}: "decision" necesita chose, over y why.`)
  })

  if (!Array.isArray(p.edges)) return [...err, '"edges" debe ser una lista.']
  p.edges.forEach((e: unknown, i) => {
    const at = `edges[${i}]`
    if (!Array.isArray(e) || e.length < 3 || e.length > 4)
      return void err.push(`${at}: usa [origen, destino, flujo] o [origen, destino, flujo, "arc"].`)
    const [f, t, flow, arc] = e as unknown[]
    const a = nodes.get(String(f)), b = nodes.get(String(t))
    if (!a) err.push(`${at}: no existe el nodo "${String(f)}".`)
    if (!b) err.push(`${at}: no existe el nodo "${String(t)}".`)
    if (!isStr(flow) || !(flow in FLOWS)) err.push(`${at}: el flujo debe ser uno de ${Object.keys(FLOWS).join(', ')}.`)
    if (arc !== undefined && arc !== 'arc') err.push(`${at}: el cuarto valor solo puede ser "arc".`)
    if (a && b && arc === undefined && a.x !== b.x && a.y !== b.y)
      err.push(`${at}: ${String(f)} → ${String(t)} no está alineada en x ni en y. Alinéalos o añade "arc".`)
  })
  return err
}

/** Valida y devuelve el proyecto tipado; lanza con todos los errores si no es válido. */
export function assertProject(p: unknown): Project {
  const errors = validate(p)
  if (errors.length) throw new Error(`Proyecto no válido:\n- ${errors.join('\n- ')}`)
  return p as Project
}
