// A titled surface. The heading level is fixed (h2) so every route has one h1 and h2 per panel.
export function Panel({
  title,
  subtitle,
  children,
  action,
  className = "",
  id,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section className={"panel " + className} id={id}>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// Empty and first-use states: an icon, one explanation, then the choices.
export function EmptyState({ icon, title, children, actions }: { icon?: React.ReactNode; title: React.ReactNode; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="empty-state">
      {icon && <span className="empty-icon">{icon}</span>}
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {actions}
    </div>
  );
}
