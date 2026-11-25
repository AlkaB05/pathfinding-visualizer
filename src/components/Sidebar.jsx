import { Eraser, Grid3x3, RotateCcw, Square, Waypoints, Weight } from 'lucide-react';
import { ALGORITHMS } from '../algorithms/index.js';
import { SPEED_LEVELS, WEIGHT_COST } from '../constants.js';

const TOOLS = [
  { key: 'wall', label: 'Wall', icon: Square },
  { key: 'weight', label: `Weight`, icon: Weight },
  { key: 'erase', label: 'Erase', icon: Eraser },
];

export default function Sidebar({ algorithm, setAlgorithm, speed, setSpeed, tool, setTool, running, onMaze, onClearPath, onReset }) {
  return (
    <nav className="sidebar" aria-label="Controls">
      <div className="side-section">
        <h3 className="side-label">Algorithm</h3>
        <ul className="nav-list" role="radiogroup" aria-label="Algorithm">
          {Object.entries(ALGORITHMS).map(([key, a], n) => (
            <li key={key}>
              <button
                type="button"
                role="radio"
                aria-checked={algorithm === key}
                className={algorithm === key ? 'nav-item active' : 'nav-item'}
                onClick={() => setAlgorithm(key)}
                disabled={running}
              >
                <span className="nav-dot" aria-hidden="true" />
                <span className="nav-text">{a.name}</span>
                <kbd>{n + 1}</kbd>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="side-section">
        <h3 className="side-label">Draw</h3>
        <div className="segmented" role="radiogroup" aria-label="Draw tool">
          {TOOLS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={tool === key}
              aria-label={key === 'weight' ? `Weight, cost ${WEIGHT_COST}` : label}
              className={tool === key ? 'seg active' : 'seg'}
              onClick={() => setTool(key)}
            >
              <Icon size={13} strokeWidth={2} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        <p className="side-note">
          Weighted cells cost <span className="mono">{WEIGHT_COST}</span> to enter instead of <span className="mono">1</span>.
        </p>
      </div>

      <div className="side-section">
        <div className="side-row">
          <label className="side-label" htmlFor="speed">
            Speed
          </label>
          <output className="mono side-value" htmlFor="speed">
            {SPEED_LEVELS[speed].label}
          </output>
        </div>
        <input
          id="speed"
          className="slider"
          type="range"
          min="0"
          max={SPEED_LEVELS.length - 1}
          step="1"
          value={speed}
          style={{ '--fill': `${(speed / (SPEED_LEVELS.length - 1)) * 100}%` }}
          onChange={(e) => setSpeed(Number(e.target.value))}
        />
        <div className="ticks" aria-hidden="true">
          {SPEED_LEVELS.map((s) => (
            <span key={s.label} />
          ))}
        </div>
      </div>

      <div className="side-section">
        <h3 className="side-label">Board</h3>
        <ul className="nav-list">
          {[
            ['Generate maze', 'M', Grid3x3, onMaze],
            ['Clear path', 'C', Waypoints, onClearPath],
            ['Reset board', 'R', RotateCcw, onReset],
          ].map(([label, key, Icon, fn]) => (
            <li key={label}>
              <button type="button" className="nav-item" onClick={fn} disabled={running}>
                <Icon size={14} aria-hidden="true" className="nav-icon" />
                <span className="nav-text">{label}</span>
                <kbd>{key}</kbd>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
