import { Check, Info, Loader2, TriangleAlert } from "lucide-react";
// Feedback surface. Errors use role=alert, everything else role=status so assistive tech announces both.
type Kind = "info" | "success" | "error" | "busy";
const icon = { info: Info, success: Check, error: TriangleAlert, busy: Loader2 };
export function Notice({ kind = "info", children, action, className = "" }: { kind?: Kind; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  const Icon = icon[kind];
  return (
    <div className={`notice ${kind === "error" ? "error" : kind === "success" ? "success" : ""} ${className}`} role={kind === "error" ? "alert" : "status"}>
      <Icon size={16} className={kind === "busy" ? "spin" : undefined} aria-hidden="true" />
      <span className="notice-text">{children}</span>
      {action}
    </div>
  );
}
