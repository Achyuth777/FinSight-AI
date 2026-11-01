import { ScanLine } from "lucide-react";
// Same mark as the public page: scan icon, lower-case wordmark, one violet AI badge.
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-icon">
        <ScanLine size={20} aria-hidden="true" />
      </span>
      finsight<span className="brand-ai">AI</span>
    </span>
  );
}
