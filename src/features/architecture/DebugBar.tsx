import type { ProjectionKind } from './geometry'

export interface DebugState {
  projection: ProjectionKind
  hitZones: boolean
  order: boolean
}

interface Props {
  state: DebugState
  onChange: (s: DebugState) => void
  pieces: number
  buildMs: number
}

/** Controles del modo "cómo está hecho": cambian la proyección y enseñan las zonas de clic y el orden de pintado. */
export function DebugBar({ state, onChange, pieces, buildMs }: Props) {
  return (
    <div className="arch-dbg">
      <fieldset>
        <legend>Proyección</legend>
        {(['dimetric', 'isometric'] as const).map(k => (
          <label key={k}>
            <input type="radio" name="arch-projection" checked={state.projection === k} onChange={() => onChange({ ...state, projection: k })} />
            {k === 'dimetric' ? '2:1' : '30° real'}
          </label>
        ))}
      </fieldset>
      <label><input type="checkbox" checked={state.hitZones} onChange={e => onChange({ ...state, hitZones: e.target.checked })} /> Zonas de clic</label>
      <label><input type="checkbox" checked={state.order} onChange={e => onChange({ ...state, order: e.target.checked })} /> Orden de pintado</label>
      <span className="stats">{pieces} piezas · escena en {buildMs.toFixed(2)} ms · 0 dependencias</span>
    </div>
  )
}
