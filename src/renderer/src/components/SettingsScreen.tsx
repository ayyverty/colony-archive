import { useArchiveStore } from '../state/store'

export function SettingsScreen() {
  const theme = useArchiveStore((state) => state.theme)
  const display = useArchiveStore((state) => state.display)
  const keyclick = useArchiveStore((state) => state.keyclick)
  const signOff = useArchiveStore((state) => state.signOff)
  const autosave = useArchiveStore((state) => state.autosave)
  const typewriterScroll = useArchiveStore((state) => state.typewriterScroll)
  const linter = useArchiveStore((state) => state.linter)
  const toggleTheme = useArchiveStore((state) => state.toggleTheme)
  const toggleDisplay = useArchiveStore((state) => state.toggleDisplay)
  const toggleKeyclick = useArchiveStore((state) => state.toggleKeyclick)
  const toggleSignOff = useArchiveStore((state) => state.toggleSignOff)
  const toggleAutosave = useArchiveStore((state) => state.toggleAutosave)
  const toggleTypewriter = useArchiveStore((state) => state.toggleTypewriter)
  const toggleLinter = useArchiveStore((state) => state.toggleLinter)
  const openManual = useArchiveStore((state) => state.openManual)
  const setSector = useArchiveStore((state) => state.setSector)
  const setSealPassphrase = useArchiveStore((state) => state.setSealPassphrase)
  const sector = useArchiveStore((state) => state.sector)
  const sealPassphrase = useArchiveStore((state) => state.sealPassphrase)
  const profile = useArchiveStore((state) => state.profile)
  const openPanel = useArchiveStore((state) => state.openPanel)

  const row = (label: string, value: string, action: () => void) => (
    <div className="settings-row">
      <span className="settings-row__label">{label}</span>
      <span className="settings-row__value">{value}</span>
      <button type="button" className="btn btn--ghost" onClick={action}>Change</button>
    </div>
  )

  return (
    <div className="screen screen--settings">
      <header className="screen__head">
        <div>
          <div className="screen__eyebrow">CONFIG.SYS // SYSTEM CONFIGURATION</div>
          <h1 className="screen__title">Settings</h1>
        </div>
      </header>
      <div className="screen__body screen__body--single">
        <section className="settings-section">
          <h2>Identity</h2>
          <div className="settings-row">
            <span className="settings-row__label">Profile</span>
            <span className="settings-row__value">{profile.preset}</span>
            <button type="button" className="btn btn--ghost" onClick={() => openPanel('profile')}>Edit</button>
          </div>
          {row('Sector', sector, () => {
            const value = window.prompt('Sector label', sector)
            if (value) setSector(value)
          })}
          {row('Seal passphrase', '••••••', () => {
            const value = window.prompt('Seal passphrase', sealPassphrase)
            if (value) setSealPassphrase(value)
          })}
        </section>
        <section className="settings-section">
          <h2>Display</h2>
          {row('Theme', theme, toggleTheme)}
          {row('Display', display, toggleDisplay)}
          {row('Key click', keyclick ? 'on' : 'off', toggleKeyclick)}
          {row('Sign-off', signOff ? 'on' : 'off', toggleSignOff)}
        </section>
        <section className="settings-section">
          <h2>Editor</h2>
          {row('Autosave', autosave ? 'on' : 'off', toggleAutosave)}
          {row('Typewriter', typewriterScroll ? 'on' : 'off', toggleTypewriter)}
          {row('Linter', linter ? 'on' : 'off', toggleLinter)}
        </section>
        <section className="settings-section">
          <h2>Tools</h2>
          <button type="button" className="btn btn--ghost" onClick={() => openPanel('templates')}>Templates</button>
          <button type="button" className="btn btn--ghost" onClick={() => openPanel('export')}>Export</button>
          <button type="button" className="btn btn--ghost" onClick={() => openPanel('inbox')}>Inbox</button>
          <button type="button" className="btn btn--ghost" onClick={() => void openManual()}>Open manual</button>
        </section>
      </div>
    </div>
  )
}