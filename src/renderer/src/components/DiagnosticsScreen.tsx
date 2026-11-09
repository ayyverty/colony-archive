import { DiagnosticsPanel } from './panels/DiagnosticsPanel'
import { IntegrityScanPanel } from './IntegrityScanPanel'

export function DiagnosticsScreen() {
  return (
    <div className="screen screen--diagnostics">
      <header className="screen__head">
        <div>
          <div className="screen__eyebrow">DIAGNOSTICS.SYS // HEALTH REPORT</div>
          <h1 className="screen__title">Diagnostics</h1>
        </div>
      </header>
      <div className="screen__body screen__body--single">
        <DiagnosticsPanel />
        <IntegrityScanPanel />
      </div>
    </div>
  )
}