// Courbe de progression en SVG (aucune dépendance). points = [{ label, value }], value en %.
export default function LineChart({ points, height = 180 }) {
  if (!points.length) return null;
  const W = 640;
  const H = height;
  const pad = { top: 14, right: 16, bottom: 26, left: 34 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const x = (i) => pad.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v) => pad.top + innerH - (Math.max(0, Math.min(100, v)) / 100) * innerH;

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${path} L${x(points.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="linechart" role="img" aria-label="Évolution des scores au fil des tests">
      {[0, 50, 100].map((g) => (
        <g key={g}>
          <line x1={pad.left} x2={W - pad.right} y1={y(g)} y2={y(g)} className="linechart__grid" />
          <text x={pad.left - 6} y={y(g) + 4} textAnchor="end" className="linechart__axis">{g}%</text>
        </g>
      ))}
      <line x1={pad.left} x2={W - pad.right} y1={y(60)} y2={y(60)} className="linechart__target" />
      <path d={area} className="linechart__area" />
      <path d={path} className="linechart__line" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r={4} className="linechart__dot" />
          <title>{`${p.label} : ${p.value}%`}</title>
        </g>
      ))}
      <text x={x(0)} y={H - 6} textAnchor={points.length === 1 ? "middle" : "start"} className="linechart__axis">{points[0].label}</text>
      {points.length > 1 && (
        <text x={x(points.length - 1)} y={H - 6} textAnchor="end" className="linechart__axis">{points[points.length - 1].label}</text>
      )}
    </svg>
  );
}
