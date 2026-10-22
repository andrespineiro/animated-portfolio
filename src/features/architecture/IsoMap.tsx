import { useEffect, useId, useRef, type CSSProperties, type KeyboardEvent, type RefObject } from 'react'
import { cn } from '../../lib/utils'
import type { Highlight } from './highlight'
import type { Piece, Scene, SceneBlock, SceneEdge } from './geometry'

interface Props {
  scene: Scene
  hl: Highlight
  /** Nodos con una decisión visible: llevan ◆ en la etiqueta. */
  withDecision: Set<string>
  showHitZones: boolean
  showOrder: boolean
  title: string
  onHover: (id: string | null) => void
  onToggle: (id: string) => void
  onClear: () => void
}

/** Velocidad de los paquetes que recorren las aristas activas, en unidades SVG por segundo. */
const DOT_SPEED = 70

export function IsoMap({ scene, hl, withDecision, showHitZones, showOrder, title, onHover, onToggle, onClear }: Props) {
  const uid = useId().replace(/:/g, '')
  const ids = { grain: `${uid}-grain`, hatch: `${uid}-hatch`, dense: `${uid}-dense`, ink: `${uid}-ink` }
  const svgRef = useRef<SVGSVGElement>(null)
  const hotKey = [...hl.edges].join(',')
  useEdgeParticles(svgRef, `${hotKey}|${scene.viewBox.w}`)

  const { x, y, w, h } = scene.viewBox
  const blocks = scene.pieces.filter((p): p is SceneBlock => p.kind === 'block')

  const keyDown = (e: KeyboardEvent<SVGGElement>, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(id) }
  }

  return (
    <svg
      ref={svgRef}
      className={cn('arch-map', showHitZones && 'show-hit')}
      viewBox={`${x.toFixed(0)} ${y.toFixed(0)} ${w.toFixed(0)} ${h.toFixed(0)}`}
      role="group"
      aria-label={title}
      onMouseLeave={() => onHover(null)}
      onClick={e => { if (e.target === e.currentTarget) onClear() }}
    >
      <defs>
        {/* Grano de tinta: ruido multiplicado sobre la forma, recortado a su silueta */}
        <filter id={ids.grain} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves={2} stitchTiles="stitch" result="n" />
          <feColorMatrix in="n" type="saturate" values="0" result="g" />
          <feComponentTransfer in="g" result="g2">
            <feFuncR type="linear" slope=".45" intercept=".775" />
            <feFuncG type="linear" slope=".45" intercept=".775" />
            <feFuncB type="linear" slope=".45" intercept=".775" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" in2="g2" mode="multiply" result="b" />
          <feComposite in="b" in2="SourceGraphic" operator="in" />
        </filter>
        <Hatch id={ids.hatch} gap={5} className="hatch-paper" />
        <Hatch id={ids.dense} gap={3.4} className="hatch-paper" />
        <Hatch id={ids.ink} gap={4} className="hatch-ink" />
      </defs>

      {scene.pieces.map(piece => (
        <PieceView key={pieceKey(piece)} piece={piece} hl={hl} ids={ids} onHover={onHover} onToggle={onToggle} onKeyDown={keyDown} />
      ))}

      <g className="labels" aria-hidden="true">
        {blocks.map(({ node, label: [lx, ly] }) => (
          <g key={node.id} className={cn('lbl', stateClass(hl, node.id))}>
            <text className="t-name" x={lx} y={ly - 22} textAnchor="middle">
              {node.name}
              {withDecision.has(node.id) && <tspan className="dec-mark"> ◆</tspan>}
            </text>
            <text className="t-sub" x={lx} y={ly - 8} textAnchor="middle">{node.sub}</text>
          </g>
        ))}
      </g>

      {showOrder && (
        <g className="order" aria-hidden="true">
          {scene.pieces.map(p => (
            <g key={pieceKey(p)} className={p.kind === 'edge' ? 'o-edge' : 'o-blk'} transform={`translate(${p.anchor[0].toFixed(1)},${p.anchor[1].toFixed(1)})`}>
              <rect x={-10} y={-8} width={20} height={16} />
              <text y={4} textAnchor="middle">{p.order}</text>
            </g>
          ))}
        </g>
      )}
    </svg>
  )
}

const pieceKey = (p: Piece) => (p.kind === 'block' ? p.node.id : p.kind === 'edge' ? p.id : 'slab')

function stateClass(hl: Highlight, id: string) {
  if (id === hl.focus) return 'sel'
  if (!hl.nodes) return undefined
  if (!hl.nodes.has(id)) return 'dim'
  return hl.focus || hl.byTech ? 'hit' : undefined
}

function Hatch({ id, gap, className }: { id: string; gap: number; className: string }) {
  return (
    <pattern id={id} width={gap} height={gap} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect className={className} width={gap / 2} height={gap} />
    </pattern>
  )
}

interface PieceProps {
  piece: Piece
  hl: Highlight
  ids: { grain: string; hatch: string; dense: string; ink: string }
  onHover: (id: string | null) => void
  onToggle: (id: string) => void
  onKeyDown: (e: KeyboardEvent<SVGGElement>, id: string) => void
}

function PieceView({ piece, hl, ids, onHover, onToggle, onKeyDown }: PieceProps) {
  if (piece.kind === 'slab') {
    const dim = hl.byTech && !hl.slab
    return (
      <g>
        <g className={cn('slab', hl.slab && 'hit', dim && 'dim')} filter={`url(#${ids.grain})`}>
          {piece.faces.map(f => (
            <g key={f.kind}>
              <path className={f.kind} d={f.d} />
              {f.kind !== 'top' && <path className="hatch" d={f.d} fill={`url(#${ids.ink})`} />}
            </g>
          ))}
        </g>
        <text className="t-slab" transform={`translate(${piece.label.at[0].toFixed(1)},${piece.label.at[1].toFixed(1)}) rotate(${piece.label.angle.toFixed(2)})`}>
          {piece.label.text}
        </text>
      </g>
    )
  }
  if (piece.kind === 'edge') return <EdgeView edge={piece} hot={hl.edges.has(piece.index)} />

  const { node } = piece
  return (
    <g
      className={cn('blk', stateClass(hl, node.id))}
      style={{ '--c': `var(--r-${node.role})` } as CSSProperties}
      filter={`url(#${ids.grain})`}
      tabIndex={0}
      role="button"
      aria-label={`${node.name}: ${node.sub}`}
      aria-pressed={hl.focus === node.id}
      onMouseEnter={() => onHover(node.id)}
      onFocus={() => onHover(node.id)}
      onBlur={() => onHover(null)}
      onClick={() => onToggle(node.id)}
      onKeyDown={e => onKeyDown(e, node.id)}
    >
      {piece.faces.map(f => (
        <g key={f.kind}>
          <path className={f.kind} d={f.d} />
          {f.kind !== 'top' && <path className="hatch" d={f.d} fill={`url(#${f.kind === 'lf' ? ids.hatch : ids.dense})`} />}
        </g>
      ))}
    </g>
  )
}

function EdgeView({ edge, hot }: { edge: SceneEdge; hot: boolean }) {
  return (
    <g data-hot={hot || undefined}>
      <path className={cn('edge', edge.arc && 'arc', hot ? 'hot' : 'dim')} d={edge.d} />
      {hot && <><circle className="dot" r={3.2} /><circle className="dot" r={3.2} /></>}
    </g>
  )
}

/**
 * Mueve los puntos de las aristas activas con requestAnimationFrame escribiendo directamente
 * en el DOM (sin re-render de React). Se pausa fuera de pantalla y con reduced-motion.
 */
function useEdgeParticles(svgRef: RefObject<SVGSVGElement | null>, key: string) {
  useEffect(() => {
    const svg = svgRef.current
    if (!svg || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const tracks = [...svg.querySelectorAll<SVGGElement>('g[data-hot]')].map(g => {
      const path = g.querySelector('path')!
      return { path, len: path.getTotalLength(), dots: [...g.querySelectorAll('circle')] }
    })
    let frame = 0, visible = true
    const tick = (now: number) => {
      for (const { path, len, dots } of tracks) {
        dots.forEach((dot, k) => {
          const p = path.getPointAtLength(((now / 1000) * DOT_SPEED + (k * len) / dots.length) % len)
          dot.setAttribute('cx', p.x.toFixed(1))
          dot.setAttribute('cy', p.y.toFixed(1))
        })
      }
      frame = visible ? requestAnimationFrame(tick) : 0
    }
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible && !frame) frame = requestAnimationFrame(tick)
    })
    io.observe(svg)
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); io.disconnect() }
  }, [svgRef, key])
}
