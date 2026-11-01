import { useId } from "react";
// A labelled control. The label is always visible; hint and error are linked with aria-describedby.
type Common = { label: string; hint?: string; error?: string; className?: string };
function wrap(id: string, { label, hint, error, className = "" }: Common, control: React.ReactNode) {
  return (
    <div className={"field " + className}>
      <label htmlFor={id}>{label}</label>
      {control}
      {error ? <p className="field-error" id={id + "-msg"}>{error}</p> : hint ? <p className="field-hint" id={id + "-msg"}>{hint}</p> : null}
    </div>
  );
}
export function Input({ label, hint, error, className, id: given, ...props }: Common & Omit<React.ComponentProps<"input">, "className">) {
  const auto = useId();
  const id = given || auto;
  return wrap(id, { label, hint, error, className }, <input id={id} aria-invalid={error ? true : undefined} aria-describedby={error || hint ? id + "-msg" : undefined} {...props} />);
}
export function Textarea({ label, hint, error, className, id: given, ...props }: Common & Omit<React.ComponentProps<"textarea">, "className">) {
  const auto = useId();
  const id = given || auto;
  return wrap(id, { label, hint, error, className }, <textarea id={id} aria-invalid={error ? true : undefined} aria-describedby={error || hint ? id + "-msg" : undefined} {...props} />);
}
// Native select: the correct menu on phones, keyboard-complete, no dependency.
export function Select({ label, hint, error, className, options, id: given, ...props }: Common & Omit<React.ComponentProps<"select">, "className"> & { options: string[][] }) {
  const auto = useId();
  const id = given || auto;
  return wrap(id, { label, hint, error, className }, (
    <select id={id} aria-describedby={error || hint ? id + "-msg" : undefined} {...props}>
      {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
  ));
}
