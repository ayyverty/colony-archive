import { useState } from 'react'
import { PROFILE_PRESETS } from '@shared/profiles'
import { useArchiveStore } from '../../state/store'

export function ProfilePanel() {
  const profile = useArchiveStore((state) => state.profile)
  const setProfile = useArchiveStore((state) => state.setProfile)
  const setProfileTerms = useArchiveStore((state) => state.setProfileTerms)
  const [draft, setDraft] = useState(profile)

  return (
    <div className="profile-panel">
      <div className="panel__summary">
        <span>ARCHIVE PROFILE</span>
        <span>{profile.preset}</span>
      </div>
      <label className="meta-field">
        <span className="meta-field__label">preset</span>
        <select
          className="meta-field__input"
          value={draft.preset}
          onChange={(event) => {
            const preset = event.target.value
            const next = PROFILE_PRESETS[preset] ?? draft
            setDraft(next)
          }}
        >
          {Object.keys(PROFILE_PRESETS).map((preset) => (
            <option key={preset} value={preset}>{preset}</option>
          ))}
          <option value="custom">custom</option>
        </select>
      </label>
      {Object.keys(draft).filter((key) => key !== 'preset').map((key) => (
        <label className="meta-field" key={key}>
          <span className="meta-field__label">{key}</span>
          <input
            className="meta-field__input"
            value={draft[key as keyof typeof draft]}
            onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
          />
        </label>
      ))}
      <div className="meta-editor__actions">
        <button type="button" className="btn btn--ghost" onClick={() => void setProfile(draft.preset)}>
          Apply preset
        </button>
        <button type="button" className="btn btn--accent" onClick={() => void setProfileTerms(draft)}>
          Save terms
        </button>
      </div>
    </div>
  )
}