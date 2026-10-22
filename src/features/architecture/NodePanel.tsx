import type { CSSProperties } from 'react'
import { flowsOf, techsOf } from './highlight'
import { isDecisionVisible } from './decisions'
import { FLOWS, ROLES, type Project } from './types'

interface Props {
  project: Project
  nodeId: string | null
  pinned: boolean
  tech: string | null
  onTech: (tech: string) => void
  onUnpin: () => void
}

export function NodePanel({ project, nodeId, pinned, tech, onTech, onUnpin }: Props) {
  const node = project.nodes.find(n => n.id === nodeId)
  const chips = (list: string[]) => (
    <div className="chips">
      {list.map(t => (
        <button key={t} type="button" className="chip" aria-pressed={tech === t} onClick={() => onTech(t)}>{t}</button>
      ))}
    </div>
  )

  if (!node) {
    const anyDecision = project.nodes.some(n => isDecisionVisible(n.decision))
    return (
      <aside className="arch-panel" aria-live="polite">
        <div><h3>Qué es</h3><p>{project.what}</p></div>
        <div>
          <h3>Datos clave</h3>
          <dl>{project.summary.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        </div>
        <div><h3>Stack · pulsa para resaltar</h3>{chips(techsOf(project))}</div>
        {anyDecision && <p className="hint">Los bloques con <span className="dec-mark">◆</span> explican una decisión de diseño.</p>}
      </aside>
    )
  }

  const decision = isDecisionVisible(node.decision) ? node.decision : null
  return (
    <aside className="arch-panel" aria-live="polite">
      <div>
        <span className="pill" style={{ '--c': `var(--r-${node.role})` } as CSSProperties}><i />{ROLES[node.role].label}</span>
        <h3 className="node-name">{node.name}</h3>
        <p className="sub">{node.sub}</p>
      </div>
      <p>{node.desc}</p>
      {decision && (
        <div className="decision">
          <h3>Decisión{decision.draft && <span className="draft">borrador · confirmar</span>}</h3>
          <p className="dec-pick"><b>{decision.chose}</b> <span>en vez de</span> {decision.over}</p>
          <p>{decision.why}</p>
        </div>
      )}
      {node.tech.length > 0 && <div><h3>Tecnología</h3>{chips(node.tech)}</div>}
      <div><h3>Participa en</h3><p className="sub">{flowsOf(project, node.id).map(f => FLOWS[f]).join(' · ')}</p></div>
      {pinned && <button type="button" className="back" onClick={onUnpin}>← Volver al resumen</button>}
    </aside>
  )
}
