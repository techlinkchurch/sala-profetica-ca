import "./Stat.css";

export function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <p className="ds-stat">
      <span className="ds-stat-label">{label}</span>
      <span className="ds-stat-value">{value}</span>
    </p>
  );
}
