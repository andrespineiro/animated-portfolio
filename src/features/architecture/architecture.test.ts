import { describe, expect, it } from 'vitest'
import { buildScene, LAYERS, type SceneEdge } from './geometry'
import { highlight } from './highlight'
import { PROJECTS } from './projects'
import { toSource } from './source'
import { validate } from './validate'

const base = PROJECTS[0]
const clone = () => JSON.parse(JSON.stringify(base)) as Record<string, unknown> & typeof base

describe.each(PROJECTS.map(p => [p.id, p] as const))('%s', (_, p) => {
  it('es válido', () => expect(validate(p)).toEqual([]))

  it('sobrevive al editor de fuente (JSON ida y vuelta)', () => expect(JSON.parse(toSource(p))).toEqual(p))

  for (const kind of ['dimetric', 'isometric'] as const) {
    it(`construye la escena ${kind} con todas las piezas en orden de capa`, () => {
      const s = buildScene(p, kind)
      expect(s.pieces).toHaveLength(1 + p.nodes.length + p.edges.length)
      expect(s.pieces.map(x => x.order)).toEqual(s.pieces.map((_, i) => i + 1))
      const layers = s.pieces.map(x => LAYERS.indexOf(x.layer))
      expect(layers).toEqual([...layers].sort((a, b) => a - b))
      expect(s.pieces.map(x => JSON.stringify(x)).join()).not.toMatch(/NaN/)
    })
  }

  it('las aristas rectas solo avanzan por un eje en el suelo', () => {
    const edges = buildScene(p, 'dimetric').pieces.filter((x): x is SceneEdge => x.kind === 'edge' && !x.arc)
    for (const e of edges)
      for (let i = 1; i < e.points.length; i++) {
        const [a, b] = [e.points[i - 1], e.points[i]]
        expect([a[0] !== b[0], a[1] !== b[1], a[2] !== b[2]].filter(Boolean).length, `${e.from}→${e.to}`).toBeLessThanOrEqual(1)
      }
  })
})

describe('validate', () => {
  it('rechaza raíces que no son objeto', () => expect(validate([])).toEqual(['La raíz debe ser un objeto.']))

  it('detecta ids repetidos, roles desconocidos y aristas a nodos inexistentes', () => {
    const p = clone()
    p.nodes = [...base.nodes, { ...base.nodes[0] }, { ...base.nodes[1], id: 'nuevo', role: 'magia' as never }]
    p.edges = [...base.edges, ['nuevo', 'fantasma', 'query']]
    const errors = validate(p).join('\n')
    expect(errors).toMatch(/id repetido/)
    expect(errors).toMatch(/"role" debe ser uno de/)
    expect(errors).toMatch(/no existe el nodo "fantasma"/)
  })

  it('exige "arc" en aristas no alineadas', () => {
    const p = clone()
    const a = base.nodes[0]
    const pair = base.nodes.find(m => m.x !== a.x && m.y !== a.y)!
    p.edges = [[a.id, pair.id, 'query']]
    expect(validate(p).join()).toMatch(/no está alineada/)
    p.edges = [[a.id, pair.id, 'query', 'arc']]
    expect(validate(p)).toEqual([])
  })

  it('rechaza flujos y alturas fuera de rango', () => {
    const p = clone()
    p.nodes = base.nodes.map((n, i) => (i ? n : { ...n, h: 9 }))
    p.edges = [[base.edges[0][0], base.edges[0][1], 'teleport' as never]]
    const errors = validate(p).join('\n')
    expect(errors).toMatch(/"h" debe estar entre 0 y 6/)
    expect(errors).toMatch(/el flujo debe ser uno de/)
  })
})

describe('highlight', () => {
  const none = { hover: null, pin: null, tech: null }

  it('un filtro de tecnología resalta solo los nodos que la usan', () => {
    const tech = base.nodes[0].tech[0]
    const hl = highlight(base, { flow: 'all', ...none, tech })
    expect(hl.byTech).toBe(true)
    expect([...hl.nodes!]).toEqual(base.nodes.filter(n => n.tech.includes(tech)).map(n => n.id))
  })

  it('enfocar un nodo activa sus aristas y vecinos', () => {
    const [from, to] = base.edges[0]
    const hl = highlight(base, { flow: 'all', ...none, hover: from })
    expect(hl.focus).toBe(from)
    expect(hl.edges.has(0)).toBe(true)
    expect(hl.nodes!.has(to)).toBe(true)
  })

  it('ignora un nodo enfocado que ya no existe (tras editar el JSON)', () => {
    expect(highlight(base, { flow: 'all', ...none, pin: 'borrado' }).focus).toBeNull()
  })
})
