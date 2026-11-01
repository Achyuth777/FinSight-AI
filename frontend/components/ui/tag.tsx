// Status tags carry text as well as colour. Variants map to the semantic palette in DESIGN.md.
const tone = { flag: "amber", case: "case", clear: "", ok: "ok", bad: "bad" } as const;
export function StatusTag({ kind, children }: { kind: keyof typeof tone; children: React.ReactNode }) {
  return <span className={"pill " + tone[kind]}>{children}</span>;
}
