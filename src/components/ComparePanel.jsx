export default function ComparePanel({ rows, onCompare, disabled }) {
  const maxVisited = rows ? Math.max(1, ...rows.map((r) => r.visitedCount)) : 1;
  return (
    <section className="panel" aria-labelledby="compare-title">
      <header className="panel-head">
        <h2 id="compare-title">Compare</h2>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCompare} disabled={disabled}>
          Run all four
        </button>
      </header>
      {rows ? (
        <>
          <table className="compare">
            <thead>
              <tr>
                <th scope="col">Algorithm</th>
                <th scope="col">Visited</th>
                <th scope="col" className="num">Cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className={r.best ? 'best' : ''}>
                  <th scope="row">{r.short}</th>
                  <td>
                    <div className="spark">
                      <div className="spark-bar" style={{ width: `${(r.visitedCount / maxVisited) * 100}%` }} />
                      <span className="mono">{r.visitedCount}</span>
                    </div>
                  </td>
                  <td className="num mono">
                    {r.found ? r.cost : '—'}
                    {r.best && <span className="sr-only"> (cheapest)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="panel-note">Same board, median of 5 runs. Highlighted rows found the cheapest path.</p>
        </>
      ) : (
        <p className="panel-text">Run every algorithm on the current walls and weights and compare how much of the grid each one explores.</p>
      )}
    </section>
  );
}
