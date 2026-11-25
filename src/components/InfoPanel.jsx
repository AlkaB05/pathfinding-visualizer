import { ALGORITHMS } from '../algorithms/index.js';

export default function InfoPanel({ algorithm }) {
  const a = ALGORITHMS[algorithm];
  return (
    <section className="panel" aria-labelledby="info-title">
      <header className="panel-head">
        <h2 id="info-title">Overview</h2>
      </header>
      <p className="panel-text">{a.blurb}</p>
      <dl className="props">
        <div>
          <dt>Open set</dt>
          <dd className="mono">{a.structure}</dd>
        </div>
        <div>
          <dt>Complexity</dt>
          <dd className="mono">{a.time}</dd>
        </div>
        <div>
          <dt>Weights</dt>
          <dd>
            <Pill ok={a.weighted}>{a.weighted ? 'Respected' : 'Ignored'}</Pill>
          </dd>
        </div>
        <div>
          <dt>Shortest path</dt>
          <dd>
            <Pill ok={a.shortest}>{a.shortest ? 'Guaranteed' : 'Not guaranteed'}</Pill>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function Pill({ ok, children }) {
  return <span className={ok ? 'pill ok' : 'pill no'}>{children}</span>;
}
