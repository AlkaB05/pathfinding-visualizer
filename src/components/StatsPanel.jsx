export default function StatsPanel({ live, stats }) {
  const s = stats ?? live;
  const pct = live ? Math.round(live.progress * 100) : stats ? 100 : 0;
  return (
    <section className="panel" aria-labelledby="stats-title" aria-live="polite">
      <header className="panel-head">
        <h2 id="stats-title">Run</h2>
        <span className="mono muted">{stats ? `${stats.ms.toFixed(2)} ms` : live ? `${pct}%` : '—'}</span>
      </header>
      <div className="meter" aria-hidden="true">
        <div className="meter-bar" style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
      <dl className="metrics">
        <Metric label="Visited" value={s?.visitedCount} tone="blue" />
        <Metric label="Open set" value={s?.frontier} tone="ring" />
        <Metric label="Path length" value={stats ? (stats.found ? stats.pathLength : '—') : undefined} tone="amber" />
        <Metric label="Path cost" value={stats ? (stats.found ? stats.cost : '—') : undefined} tone="violet" />
      </dl>
      {stats && !stats.found && <p className="error-text">No path. The target is walled off.</p>}
    </section>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div className="metric">
      <dt>
        <span className={`tone ${tone}`} aria-hidden="true" />
        {label}
      </dt>
      <dd className="mono">{value ?? '—'}</dd>
    </div>
  );
}
