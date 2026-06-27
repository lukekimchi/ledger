import { supabase } from './supabase'

interface Props {
  darkMode: boolean
  onDarkMode: (val: boolean) => void
  onClose: () => void
}

export default function SettingsSheet({ darkMode, onDarkMode, onClose }: Props) {
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-title">Settings</div>

        <div className="settings-list">
          <div className="settings-row">
            <span className="settings-label">Dark Mode</span>
            <label className="toggle">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={e => onDarkMode(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        <button
          className="signout-btn"
          onClick={() => supabase.auth.signOut()}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
