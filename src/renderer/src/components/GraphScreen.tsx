import { GraphPanel } from './panels/GraphPanel'

export function GraphScreen() {
  return (
    <div className="screen screen--graph">
      <header className="screen__head">
        <div>
          <div className="screen__eyebrow">GRAPH.SVC // RELATIONSHIP TOPOLOGY</div>
          <h1 className="screen__title">Relationship Graph</h1>
        </div>
      </header>
      <div className="screen__body screen__body--single">
        <GraphPanel />
      </div>
    </div>
  )
}