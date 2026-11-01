# FinSight AI design system: Instrument

Status: shipped. Direction B ("Instrument") was chosen over A ("Ledger") and now covers the whole analyst workspace (`/app/*`) and the login page. The public marketing page (`/`) still uses the older Obsidian styling; it is accessible and honest but not yet restyled (see "Rollout and known limits").

Where things live:

- Tokens: `frontend/app/globals.css` (`:root`). Legacy rules from the first design (Obsidian) sit in `globals.css` and `obsidian.css` and mostly serve the marketing page.
- Instrument styles for the workspace: `frontend/app/instrument.css`, loaded last so it wins. Login: `frontend/app/login/login.css`.
- Components: `frontend/components/ui/` (Button, Field/Input/Select, Notice, Sheet, Stat, StatusTag) and `frontend/components/workspace/` (transactions screen, table, evidence panel, formatters, input-mode hook).
- The two candidate directions that were compared are kept as labelled artifacts in `docs/refinement/directions/` (they are documentation, not shipped code).
- Tailwind is still installed for its preflight reset only. The app uses none of its utility classes; removing it changed 15 of 18 reference screenshots, so replacing the reset is a separate, deliberate task.

## 1. Intent

A fraud analyst reviews transactions for hours. The interface is an instrument panel: quiet graphite, dense but legible, figures that line up, one accent that means "data" or "this is selected". Nothing decorates; everything either carries information or helps find it.

Product truths the UI must never contradict:

- Currency is INR, times are UTC. Both are always labelled.
- Anomaly percentile ranks a row against training scores. It is not a fraud probability.
- "What stands out" lists feature deviations from training medians. It is not SHAP or model attribution.
- Metrics on synthetic data do not estimate production performance; the caveat sits above every metric block.
- Evidence search is deterministic, cited keyword search. Analysis is batch, not streaming.
- A value that cannot be computed reads `Unavailable: <reason>`, never `0`.
- No relative times ("2 hours ago"), no "AI" wording, no fake live activity, invented logos or metrics, and no control for a feature that does not exist.

## 2. Typography

| Role | Face | Size / weight | Use |
|---|---|---|---|
| UI text | IBM Plex Sans | 13px (dense tables), 14px (body), 500 for labels | everything that is words |
| Figures | IBM Plex Mono, tabular | 13px, 400/500 | amounts, percentiles, IDs, timestamps, counts |
| Page title | Plex Sans 600 | 26px, tight tracking | one `h1` per screen |
| Panel title | Plex Sans 600 | 16px | `h2` |
| Section label | Plex Sans 600 | 11px, uppercase, 0.08em | nav groups, drawer sections |
| Table header | Plex Sans 500 | 11px, 0.02em, `--muted` | every `th`, in every table, one style |
| Caption | Plex Sans 400 | 12px, `--muted` | panel subtitles, legends, breadcrumb, pagination, links |
| Metadata | Plex Sans / Mono | 11px | account and timestamp lines under IDs, tags, footer |

Type floor: no text a person has to read renders below 11px anywhere in the workspace; the gate (`consistency`) measures every visible text node at 375 and 1440px.

Numbers are right-aligned in tables and use `font-variant-numeric: tabular-nums` so columns of rupees scan vertically. Amounts always show two decimals with Indian digit grouping (`₹12,34,567.89`), via `money()` in `components/workspace/format.ts`. Long unbroken strings (IDs, merchant names) truncate with an ellipsis in tables and wrap in the evidence pane.

## 3. Colour tokens

Ground and surfaces (graphite, neutral with a slight blue):

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0b0e13` | page |
| `--surface` | `#161b22` | panels, sidebar |
| `--surface-2` | `#1c222b` | inputs, hovered rows |
| `--surface-3` | `#232a34` | selected row, pressed |
| `--line` | `#2b333e` | 1px dividers, input borders |
| `--line-strong` | `#3a4450` | hover borders, focus-adjacent |
| `--text` | `#f1f3f7` | primary text (contrast about 16:1 on `--bg`) |
| `--muted` | `#a0aaba` | secondary text (about 7.5:1 on `--surface`) |

Accent (lime, `--accent: #d5f78b`) appears on exactly three kinds of thing: data marks (ruler fill, chart series), the 1px selection line on the selected row, and the primary button. It never fills a large area and never marks a status.

Semantic status (colour is never the only signal; every tag carries text):

| Meaning | Tag | Ink / background |
|---|---|---|
| Flagged by the model, needs review | amber | `#e6bb5c` on `#2a2314` |
| Investigation exists | cyan | `#8fc3dc` on `#14252d` |
| Standard / cleared | grey | `#aab3c2` on `#1a1f28` |
| Failure (request failed, validation rejected) | red | reserved for errors only |
| Success feedback | text + check icon on `--surface-2`, no green fill | |

Red is not used for "flagged": a flag is a review prompt, not a verdict.

## 4. Spacing, radius, layout

- Spacing scale: 4, 8, 12, 16, 24, 32. Table cell padding 10px 14px (dense) and 14px 16px (relaxed, mobile cards).
- Radius: 8px for panels, inputs, buttons; 3px for status tags (they read as labels, not buttons); 999px only for the ruler track.
- Borders: 1px `--line`. Elevation is expressed with surface steps, not shadows. The one shadow is the modal sheet.
- Shell: labelled, grouped sidebar (240px) beside a content column with a 1360px max width. Sidebar groups carry text labels; there is no icon-only rail.
- A context bar under the heading states dataset, data period (UTC), rows and currency, analysis time, run and model, with the batch/not-probability note.
- Transactions is a master/detail layout: the table on the left, the evidence pane docked on the right at 1100px and wider.

## 5. Components and their behaviour

All interactive elements have a visible `:focus-visible` ring (2px `--accent` outline, 2px offset) and a minimum 40px hit target (44px on touch layouts).

- **Button** (`ui/button.tsx`): `primary` (lime fill, dark ink), `outline`, `ghost`; `sm` size. Plain class composition, no variant library; `asChild` renders a link with button styling. Pressed state scales to 0.97. One primary per region. Disabled uses reduced opacity and `not-allowed`; the reason appears in adjacent text or `title` whenever disabling is not self-evident. Busy buttons keep their width and show a spinner.
- **Field, Input, Select** (`ui/field.tsx`): a visible label above the control (never placeholder-only), optional hint beneath, error text linked with `aria-describedby`. Selects are native: they are the correct menu on phones, keyboard-complete, and free of a dependency.
- **StatusTag** (`ui/tag.tsx`): the only way to show Flagged, Standard, or In investigation. Text always present.
- **Notice** (`ui/notice.tsx`): `info`, `success` (`role="status"`), `error` (`role="alert"`). Errors say what failed, what is kept, and offer Retry when a retry is meaningful.
- **Sheet** (`ui/sheet.tsx`, Radix Dialog): modal surface for the evidence view on narrow screens; traps focus, closes on Escape and returns focus to the row that opened it. `aria-labelledby` and `aria-describedby` are set explicitly (`evidence-title`, `evidence-sub`) because the title keeps its own id. Docked evidence on wide screens is a non-modal complementary region with the same content.
- **DataTable** (`workspace/transaction-table.tsx`): the one table used on Overview, Transactions and Linked accounts. Sticky header, right-aligned numerals, whole-row click target with a real button in the ID cell (so keyboard users have a stop), selected row marked with tint plus a 1px lime left line, ruler beside the percentile figure. Under 720px rows become cards with the same fields and the same single tap target.
- **Stat** (`ui/stat.tsx`): label, one figure, the fact that qualifies it. Figures scale with their tile width (container query) so a rupee amount stays on one line down to 360px. An optional `href` makes the whole tile a link.
- **Scroll regions**: any table that can scroll sideways is a focusable, labelled region (`tabindex=0`, `role=region`, `aria-label`) so keyboard users can reach it.
- **Search inputs** for identifiers use `type=search`, `autocomplete=off` and `spellcheck=false`.
- **Pagination**: states "X to Y of N", Previous/Next disabled at the ends. Filter or sort changes reset to page one. 25 rows per page.
- **Empty states** name the cause and the one next action ("No transactions match these filters" with a Clear filters button; "Dataset saved, not analysed yet" with Analyze with defaults).
- **Loading**: skeleton rows keep the table's height while a run loads; long operations show an elapsed-seconds counter.

## 6. Responsive rules

| Width | Behaviour |
|---|---|
| 1100px and up | table plus docked evidence pane; sidebar visible |
| 720 to 1099px | table full width, merchant folded under the ID and tighter cell padding so ordinary data fits without sideways scroll; evidence opens as a right-hand sheet; sidebar collapses behind the menu button |
| under 720px | rows become cards; search stays visible and the other filters sit behind a Filters button (two-column grid when open); evidence is a full-height sheet from the bottom; pagination buttons fill the row |

No horizontal page scroll at 360px. Wide tables scroll inside `.table-scroll`, never the page. The gate `execution/ui_check.mjs` checks scrollWidth at 360, 390, 768, 1024, 1440.

## 7. Chart and data-visualisation conventions

- The percentile ruler is the signature mark: a 0 to 100 track, a tick at the lowest flagged percentile, a lime fill to the row's percentile. It sits beside the number, never replaces it, and has an `aria-label` that states both values.
- Other charts: one hue per chart (lime for the series of interest, `--muted` for context), 3 to 5 faint horizontal gridlines at `--line`, axis labels in Plex Mono 11px, direct labels over legends where there is one series, a visible title stating the unit and the period (UTC).
- No gradients, glows, 3D, rainbow palettes, donut decoration, or charts that restate a single number. A chart appears only when a comparison or trend is the point.
- Every chart has a text equivalent (table or summary sentence) and a stated sample size.

## 8. Motion

- Token: `--ease-out: cubic-bezier(.23,1,.32,1)` for everything that enters, exits or responds to a press. Spinners are linear (0.8s). Hover and focus colour changes are 120ms `ease`.
- Budget: press feedback `scale(.97)` at 120ms; evidence sheet 180ms in and 120ms out (it is occasional, not constant); overlay fade 160ms in and 120ms out. Feedback messages fade in over 150ms with no movement.
- Frequent actions are instant: row selection, the docked evidence pane, filters, sorting, paging, hover on rows and list items, and the skeleton-to-table swap. Keyboard-initiated sheet opens and closes are effectively instant (`html[data-input=keyboard]`, set by `useInputMode`).
- Only opacity and transform animate. Sheets use `data-state` so Radix keeps them mounted for the exit; `@starting-style` handles one-off fades so nothing replays on rerender.
- `prefers-reduced-motion: reduce` removes travel and press scale and keeps opacity fades and colour feedback. The spinner still turns because it signals progress.
- No parallax, no looping decorative motion (the hero dash loops were removed), no hover lift, no count-up numbers, no chart tooltip travel.

## 9. Conflict resolution between design skills

This system wins wherever a skill's advice disagrees. Decisions already made:

| Skill advice | Decision here | Reason |
|---|---|---|
| TasteSkill: avoid monospace captions and thin rules | Use Plex Mono for figures, IDs, timestamps; 1px rules for table structure | Aligned digits and scannable columns matter more than avoiding a style tell in a work tool |
| TasteSkill: quiet borders and repeated panels are normal in app screens | Followed | Operate mode |
| TasteSkill: no gradients, glows, invented vanity numbers | Followed | Matches product truth |
| Impeccable: avoid default fonts (Inter) | Plex Sans chosen by direction B | Chosen deliberately, with a mono companion |
| Impeccable: avoid side-stripe borders | The 1px lime selection line is a state indicator on one row, not decoration; kept | Documented exception; the detector ignores nothing else |
| Emil: motion budget, strong easing, under 200ms | Followed (section 8) | Fits the work tool |
| Awesome-DESIGN.md references | Principles only (density, restraint, tabular figures); no brand styling copied | Original system |
| Marketing styling (olive/sage, hero glows) | Left in place; copy, contrast, heading order and decorative motion fixed | Marketing is Persuade mode and needs its own direction decision |

## 10. Rollout and known limits

Shipped in Instrument: tokens, Overview, Transactions with the docked evidence pane and sheets, Investigations, Experiments, Data checks, Linked accounts, Evidence search, onboarding and import, login, session-expiry and unreachable-API states, motion, and the accessibility and consistency checks in `execution/ui_check.mjs`.

Not restyled: the marketing page (`/`). It uses 8 to 11px text in places and an olive/sage palette. A Persuade-mode direction decision is needed first.

Known limits of the shipped design:

- No arrow-key stepping between transaction rows (Tab reaches each row's ID button).
- A table with a very large amount at tablet width scrolls inside its own region instead of reflowing.
- Closing evidence uses `history.back()`, which is asynchronous; reopening within a few milliseconds is undone.
- Native selects clip long option labels; the full value is available in the evidence and context views.
- Legacy Obsidian rules remain for the marketing page and are not tree-shaken per route.
