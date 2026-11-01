// The pinned layout needs width, height and no reduced-motion preference. ScrollStage evaluates this query live, and a
// tiny inline script evaluates it before first paint (see app/page.tsx) so the page never shows the flow layout
// and then jumps. Kept out of the "use client" module so the server component can read the string.
export const PIN_QUERY = "(min-width: 900px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)";
