import { useEffect, useId, useState } from 'react'
import { toSource } from './source'
import type { Project } from './types'
import { validate } from './validate'

interface Props {
  original: Project
  onApply: (p: Project) => void
}

type Status = { ok: true; msg: string } | { ok: false; msg: string }

/** Editor del JSON que genera el diagrama. Solo aplica cambios válidos; si no, explica qué falla y conserva el último dibujo. */
export function SourceEditor({ original, onApply }: Props) {
  const fieldId = useId()
  const [text, setText] = useState(() => toSource(original))
  const [status, setStatus] = useState<Status>({ ok: true, msg: `Válido · ${original.nodes.length} nodos · ${original.edges.length} aristas` })

  useEffect(() => {
    const t = setTimeout(() => {
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch (e) {
        setStatus({ ok: false, msg: `JSON no válido: ${(e as Error).message}` })
        return
      }
      const errors = validate(parsed)
      if (errors.length) {
        setStatus({ ok: false, msg: errors.slice(0, 3).join(' ') + (errors.length > 3 ? ` (+${errors.length - 3} más)` : '') })
        return
      }
      const p = parsed as Project
      onApply(p)
      setStatus({ ok: true, msg: `Válido · ${p.nodes.length} nodos · ${p.edges.length} aristas` })
    }, 250)
    return () => clearTimeout(t)
  }, [text, onApply])

  return (
    <div className="arch-src">
      <div className="src-head">
        <div>
          <h3>proyectos/{original.id}.ts · como JSON</h3>
          <p className="hint">El diagrama sale de aquí. Edítalo y se redibuja: mueve Qdrant (<code>"x"</code>), cambia un <code>"role"</code> o añade un nodo.</p>
        </div>
        <button type="button" className="tool" onClick={() => setText(toSource(original))}>Restaurar original</button>
      </div>
      <p className={status.ok ? 'status ok' : 'status err'} role="status">{status.msg}</p>
      <label className="sr-only" htmlFor={fieldId}>JSON del proyecto</label>
      <textarea id={fieldId} value={text} onChange={e => setText(e.target.value)} spellCheck={false} autoComplete="off" autoCapitalize="off" />
    </div>
  )
}
