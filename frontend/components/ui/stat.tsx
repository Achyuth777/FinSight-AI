import Link from "next/link";
// One figure with its label and the fact that qualifies it. Optional href makes the whole tile a link.
// Values wrap rather than clip, so large rupee amounts stay readable on a phone.
export function Stat({ label, value, note, href, onClick }: { label: string; value: React.ReactNode; note?: React.ReactNode; href?: string; onClick?: () => void }) {
  const body = (
    <>
      <span className="stat-label">{label}</span>
      <strong className={"stat-value mono" + (typeof value === "string" && value.length > 13 ? " long" : "")}>{value}</strong>
      {note && <small className="stat-note">{note}</small>}
    </>
  );
  return href ? (
    <Link className="stat is-link" href={href} onClick={onClick}>{body}</Link>
  ) : (
    <div className="stat">{body}</div>
  );
}

// Horizontal share bars: label, bar, count and share. Replaces decorative donuts.
export function ShareBars({ rows, total, label }: { rows: { name: string; value: number }[]; total: number; label: string }) {
  return (
    <ul className="share-bars" aria-label={label}>
      {rows.map((r) => {
        const share = total ? (r.value / total) * 100 : 0;
        return (
          <li key={r.name}>
            <span className="share-name">{r.name}</span>
            <span className="share-track" aria-hidden="true"><i style={{ width: share + "%" }} /></span>
            <span className="share-num mono">{r.value.toLocaleString()} <small>{total ? share.toFixed(1) + "%" : "n/a"}</small></span>
          </li>
        );
      })}
    </ul>
  );
}
