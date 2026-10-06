// Barre de progression simple (valeur de 0 à 100)
export default function ProgressBar({ value, tone = "board", label }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={`bar__fill bar__fill--${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
