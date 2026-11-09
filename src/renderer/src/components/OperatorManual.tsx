export function OperatorManual() {
  return (
    <div className="manual">
      <header className="manual__head">
        <div className="manual__eyebrow">RIMCODEX // OPERATOR'S MANUAL</div>
        <h1 className="manual__title">Operator's Manual</h1>
        <div className="manual__rev">REV 3 · INTERNAL USE ONLY</div>
      </header>

      <section className="manual__section">
        <h2>Mounting</h2>
        <p>Use <code>MOUNT ARCHIVE…</code> or <code>Ctrl O</code>. The archive is confined to the selected folder. Use <code>UNMOUNT</code> to release it without forgetting recent mounts.</p>
      </section>

      <section className="manual__section">
        <h2>Workspaces</h2>
        <p><code>F1 ARCHIVE.EXE</code> is the wiki. <code>F2 INDEXER.SVC</code> searches and backlinks. <code>F3 DIAGNOSTICS.SYS</code> runs health checks. <code>F4 GRAPH.SVC</code> shows relationships. <code>F5 MANUAL.SYS</code> opens this manual.</p>
      </section>

      <section className="manual__section">
        <h2>Linking</h2>
        <p>Use <code>[[Page]]</code>, <code>[[Page#Heading]]</code>, and <code>[[Page|label]]</code>. Unresolved links are reported by the integrity scan as <code>E-203</code>.</p>
      </section>

      <section className="manual__section">
        <h2>Classification</h2>
        <p>Frontmatter <code>classification: public | internal | classified</code> changes the preview header and redacts marked sections on classified pages:</p>
        <pre>{`:::redacted\nSensitive text\n:::`}</pre>
      </section>

      <section className="manual__section">
        <h2>Integrity scan</h2>
        <p>Runs a filesystem check over the archive and streams results into the scan log and console. Codes: <code>E-117</code>, <code>E-118</code>, <code>E-203</code>, <code>E-204</code>.</p>
      </section>

      <section className="manual__section">
        <h2>Error reference</h2>
        <table className="manual__table">
          <tbody>
            <tr><td>E-041</td><td>ARCHIVE UNREACHABLE</td></tr>
            <tr><td>E-102</td><td>PATH REJECTED</td></tr>
            <tr><td>E-117</td><td>MALFORMED FRONTMATTER</td></tr>
            <tr><td>E-118</td><td>EMPTY RECORD</td></tr>
            <tr><td>E-203</td><td>UNRESOLVED LINK</td></tr>
            <tr><td>E-204</td><td>ORPHAN RECORD</td></tr>
            <tr><td>E-301</td><td>SAVE FAILED</td></tr>
            <tr><td>E-404</td><td>RECORD NOT FOUND</td></tr>
          </tbody>
        </table>
      </section>
    </div>
  )
}