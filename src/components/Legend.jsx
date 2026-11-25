const ITEMS = [
  ['Start', 'start'],
  ['Target', 'end'],
  ['Wall', 'wall'],
  ['Weight', 'weight'],
  ['Frontier', 'frontier'],
  ['Visited', 'visited'],
  ['Path', 'path'],
];

export default function Legend() {
  return (
    <ul className="legend" aria-label="Legend">
      {ITEMS.map(([label, kind]) => (
        <li key={label}>
          <span className={`key key-${kind}`} aria-hidden="true" />
          {label}
        </li>
      ))}
    </ul>
  );
}
