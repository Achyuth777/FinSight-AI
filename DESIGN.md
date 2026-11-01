# FinSight AI design system: Lightbox

Status: shipped. One art direction, "Lightbox", covers the public landing page (`/`, section 11) and the analyst workspace (`/app/*`) with the sign-in page (`/login`, sections 1 to 10). The landing page is Persuade mode and spends the direction on cinema (a pinned product film, one italic serif word per headline). The workspace is Operate mode: the same ground, violet, type and product preview, adapted for daily use, with nothing cinematic. This replaces the earlier lime "Instrument" workspace.

Where things live:

- Workspace and sign-in styles: `frontend/app/workspace.css`, one stylesheet scoped to `.ws` (the app shell, the sign-in page, and the sheet and overlay that portal to `<body>`). It holds the tokens, base, components and every screen. It replaced `globals.css` workspace rules, `obsidian.css`, `instrument.css` and `login/login.css`.
- Landing styles: `frontend/app/landing.css`, scoped to `.lp`. It re-declares the same token names, so nothing in the workspace stylesheet can reach it.
- `frontend/app/globals.css` is only the Tailwind reset, `box-sizing` and the page background. Tailwind is installed for its preflight reset only; the app uses none of its utility classes.
- Fonts load once in `frontend/app/layout.tsx`: Geist (`--font-sans`), Geist Mono (`--font-mono`) and Instrument Serif italic (`--font-serif`), self-hosted by `next/font`. The landing page still declares its own `--lp-*` copies so it stays self-contained.
- Shared components: `frontend/components/ui/` (Button, Field/Input/Select/Textarea, Notice, Sheet, Stat and ShareBars, StatusTag, Panel and EmptyState) and `frontend/components/brand.tsx`.
- Workspace feature code: `frontend/components/workspace.tsx` picks the screen for a route; `components/workspace/use-workspace.ts` holds the shared state and API actions; `shell.tsx` draws navigation, the run strip, feedback and first-use states; `screens/` holds Overview, Investigations, Linked accounts, Experiments, Data checks and Evidence search; `transactions-screen.tsx`, `transaction-table.tsx` and `evidence-panel.tsx` are the review workspace.
- The two earlier candidate directions (Ledger, Instrument) are kept as labelled documentation in `docs/refinement/directions/`.

## 1. Intent

A fraud analyst reviews transactions for hours. The workspace is the product the landing page shows: deep ink, one violet accent, a queue on the left and an inspector on the right. It is dense but legible, figures line up, and violet means "this is the selection, the action, or the main series". Nothing decorates; everything either carries information or helps find it.

Product truths the UI must never contradict:

- Currency is INR, times are UTC. Both are always labelled.
- Anomaly percentile ranks a row against training scores. It is not a fraud probability.
- "What stands out" lists feature deviations from training medians. It is not SHAP or model attribution, and it does not explain cause.
- Metrics on synthetic data do not estimate production performance; the caveat sits above every metric block.
- Evidence search is deterministic, cited keyword search. It is not a chat and not a language model. Analysis is batch, not streaming.
- A shared device is a lead to check, not proof of fraud.
- A value that cannot be computed reads `Unavailable: <reason>`, never `0`.
- No relative times ("2 hours ago"), no fake live activity, invented logos or metrics, and no control for a feature that does not exist (the linked-accounts diagram has no pan or zoom).

## 2. Typography

| Role | Face | Size / weight | Use |
|---|---|---|---|
| UI text | Geist | 13px (tables, controls), 14px (body), 500 for labels | everything that is words |
| Figures | Geist Mono, tabular | 12.5 to 13px, 400/500 | amounts, percentiles, IDs, timestamps, counts |
| Page title | Geist 600 | 28px, -0.04em | one `h1` per screen |
| Panel title | Geist 600 | 15px, -0.02em | `h2` |
| Stat value | Geist Mono 600 | up to 28px, scales with its tile | headline figures |
| Section label | Geist Mono 500 | 11px, uppercase, 0.12em | nav groups, run-strip and detail labels, data-check sections |
| Table header | Geist Mono 500 | 11px, uppercase, 0.1em, `--fg3` | every `th`, in every table, one style |
| Caption | Geist 400 | 12 to 12.5px, `--fg2` / `--fg3` | panel subtitles, legends, pagination, hints |
| Accent word | Instrument Serif italic | 1.1em of its headline | one word in the sign-in and first-use headlines only |

Type floor: nothing a person has to read renders below 11px; the `consistency` gate measures every visible text node at 375 and 1440px. Numbers are right-aligned in tables with `font-variant-numeric: tabular-nums`. Amounts always show two decimals with Indian digit grouping (`₹12,34,567.89`), via `money()` in `components/workspace/format.ts`. Long unbroken strings (IDs, merchant names) truncate with an ellipsis in tables and wrap in the evidence pane.

## 3. Colour tokens

Same names and values as the landing page, defined on `.ws`.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#05060b` | page |
| `--s1` | `#0b0d16` | panels, stats, run strip |
| `--s2` | `#11141f` | inputs, notices, option cards |
| `--s3` | `#1a1e2d` | hover, tracks, neutral tags |
| `--s-side`, `--s-pane` | `#080a12`, `#0a0c14` | sidebar and diagram ground; docked and sheet evidence |
| `--rule`, `--rule2` | white at 9%, 17% | dividers; input borders and hover borders |
| `--fg`, `--fg2`, `--fg3` | `#f5f6fa`, `#aab0c4`, `#8b92a8` | primary, secondary, tertiary text (all pass AA on `--s1`) |
| `--accent`, `--accent-hi`, `--accent-soft`, `--accent-line` | `#5f4bf5`, `#b9afff`, violet at 17%, violet at 50% | primary action fill (white text); selection, links, focus and the main data series; selection tint; selection line |

Violet appears on: the primary button, the selected row or list item (tint plus line), links, focus rings, the percentile ruler and the main chart series. It never marks a status.

Semantic colours (colour is never the only signal; every tag carries text):

| Meaning | Colour | Where |
|---|---|---|
| Flagged by the model, feature deviation, needs review | amber `#f3b84b` on 13% amber | Flagged tag, flagged-row edge, reason bars, flagged series, drift over 0.20 |
| Investigation exists, selected run | violet tag | In investigation, Selected |
| Cleared, success | green `#5fd39a` on 12% green | Cleared tag, saved feedback, clear data checks |
| Shared device | teal `#58d6c6` | linked-accounts diagram edges and device nodes |
| Failure (request failed, validation rejected) | rose `#ff8a98` | errors only |
| Standard | neutral `--s3` | Standard tag |

Red is not used for "flagged": a flag is a review prompt, not a verdict.

## 4. Spacing, radius, layout

- Spacing scale: 4, 8, 12, 16, 24, 32. Table cell padding 11px 14px; page padding 32px (20px under 1100px).
- Radius: 6px small, 8px controls, 12px panels and stats, 16px first-use and sheet top corners, 18px sign-in card, 999px only for the run chip and account chips. Status tags use 5px.
- Borders: 1px `--rule`. Elevation is surface steps, not shadows; shadows are reserved for the sheet, the sign-in card and the primary button.
- Shell: grouped sidebar (224px: Work, Explore, Model) beside a content column with a 1560px max width. A 56px top bar holds the breadcrumb, a run chip, the one Import CSV control and the link to the website. There is no icon-only rail.
- A run strip under the page title states dataset, data period (UTC), rows and currency, analysis time, run and model, with the batch / not-probability note (collapsed under "About these scores" on Transactions).
- Overview: four stats, then the priority queue beside a "Next to review" card, then activity and distribution. Transactions: filters and table on the left, evidence docked on the right at 1100px and wider. Investigations: queue on the left, the selected case with timeline and note composer on the right. Experiments: configuration on the left (sticky), held-out evaluation and comparison on the right, history below. Data checks: a plain summary of what needs review, then Data quality, Feature drift and Measured run timing as separate sections.

## 5. Components and their behaviour

All interactive elements have a visible `:focus-visible` ring (2px `--accent-hi` outline, 2px offset) and a minimum 36px hit target (44px on phones).

- **Button** (`ui/button.tsx`): `primary` (violet fill, white text), `outline`, `ghost`; `sm` size; `asChild` renders a link with button styling. Pressed state scales to 0.97. One primary per region. Disabled uses reduced opacity and `not-allowed`; the reason appears in adjacent text whenever disabling is not self-evident.
- **Field, Input, Select, Textarea** (`ui/field.tsx`): a visible label above the control (never placeholder-only), optional hint beneath, error text linked with `aria-describedby`. Selects are native.
- **StatusTag** (`ui/tag.tsx`): Flagged (amber), In investigation (violet), Cleared (green), Standard (neutral). Text always present.
- **Notice** (`ui/notice.tsx`): `info`, `success` (`role="status"`), `error` (`role="alert"`). Errors say what failed, what is kept, and offer Retry when a retry is meaningful. The session-ended notice carries a Sign in again link that returns to the same page.
- **Sheet** (`ui/sheet.tsx`, Radix Dialog): modal evidence on tablets (right) and phones (bottom, 92dvh); traps focus, closes on Escape and returns focus to the opener. Docked evidence on wide screens is a non-modal complementary region with the same content.
- **Panel and EmptyState** (`ui/panel.tsx`): a titled surface with an optional action; first-use and empty states name the cause and the next action.
- **Transaction table** (`workspace/transaction-table.tsx`): the one table on Overview, Transactions and Linked accounts. Right-aligned numerals, whole-row click target with a real button in the ID cell, a flagged row carries a 2px amber edge, the selected row a violet tint with a violet line and a top and bottom rule, a percentile ruler beside the figure. Under 720px rows become cards with the same fields.
- **Evidence panel** (`workspace/evidence-panel.tsx`): ID, merchant and UTC time, amount and percentile, the percentile caveat, facts, "What stands out" as amber deviation bars (full at 10 IQR, capped, never rescaled), account history, and a pinned action ("Create investigation" or "Open investigation").
- **Stat** (`ui/stat.tsx`): label, one figure, the fact that qualifies it; figures scale with the tile (container query) so a rupee amount stays on one line down to 360px. An optional `href` makes the tile a link; `tone="flag"` colours the figure amber.
- **Linked-accounts diagram**: three labelled columns (this account, shared devices, linked accounts) drawn from the run's data; each linked account is a keyboard-operable button that re-centres the diagram. Hidden under 720px, where the table is the view.
- **First use**: "No data yet" offers two equal choices, the synthetic sample or a CSV import, plus the example CSV. A saved but unanalysed dataset offers Analyze with defaults.
- Scroll regions, search inputs, pagination (25 rows, "X to Y of N") and skeleton loading are unchanged from the earlier system.

## 6. Responsive rules

| Width | Behaviour |
|---|---|
| 1100px and up | sidebar visible; Transactions shows the table and the docked evidence pane; two-column Investigations, Experiments and Overview |
| 720 to 1099px | sidebar behind the menu button (an overlay menu that is hidden from focus when closed); single-column layouts; merchant folded under the ID; evidence opens as a right-hand sheet |
| under 720px | rows become cards; the other filters sit behind a Filters button; evidence is a bottom sheet; the run strip drops the analysis time; the diagram is replaced by its table |

No horizontal page scroll at 360px. Wide tables scroll inside `.table-scroll`, never the page. The gate `execution/ui_check.mjs` checks scrollWidth at 360, 390, 768, 1024, 1440.

## 7. Chart and data-visualisation conventions

- The percentile ruler is the signature mark: a 0 to 100 track, a tick at the lowest flagged percentile, a violet fill to the row's percentile. It sits beside the number, never replaces it, and has an `aria-label` that states both values.
- The activity chart uses the violet series for all transactions and an amber line for flagged ones, faint horizontal gridlines, 11px axis labels, no animation and no decorative glow. The anomaly distribution uses share bars (violet, amber for the top band). Drift bars are violet, amber once PSI passes 0.20, with a tick at 0.20.
- No 3D, rainbow palettes or donut decoration, and no chart that restates a single number.
- Every chart has a text equivalent and a stated sample size.

## 8. Motion

- Token: `--ease-out: cubic-bezier(.23,1,.32,1)` for anything that enters, exits or answers a press. Hover and focus colour changes are 120ms `ease`.
- Budget: press feedback `scale(.97)` at 120ms; evidence sheet 180ms in and 120ms out; overlay fade 160ms in and 120ms out; phone menu 180ms. Feedback messages fade in over 150ms with no movement.
- Frequent actions are instant: row selection, the docked evidence pane, filters, sorting, paging, hover and the skeleton swap. Keyboard-initiated sheet opens and closes are effectively instant (`html[data-input=keyboard]`, set by `useInputMode`).
- Only opacity and transform animate. Sheets use `data-state` so Radix keeps them mounted for the exit; `@starting-style` handles one-off fades so nothing replays on rerender.
- `prefers-reduced-motion: reduce` removes travel and press scale and keeps opacity fades and colour feedback.
- No parallax, pinned scrolling or cinematic zoom (those stay on the landing page), no looping decorative motion, no count-up numbers, no hover lift. The only loops are the spinner and skeleton pulse, and only while something loads.

## 9. Conflict resolution between design skills

The approved landing page wins aesthetic conflicts; this system wins everything operational. Decisions already made:

| Skill advice | Decision here | Reason |
|---|---|---|
| TasteSkill: avoid monospace captions and thin rules | Geist Mono for figures, IDs, timestamps and 11px labels; 1px rules for table structure | Aligned digits and scannable columns matter more than avoiding a style tell in a work tool; it is also the landing page's own label style |
| TasteSkill: quiet borders and repeated panels are normal in app screens | Followed | Operate mode |
| TasteSkill: no gradients, glows, invented vanity numbers | Followed in the workspace; the only glows are the sign-in and first-use halos, which echo the landing page | Matches product truth |
| Impeccable: avoid side-stripe borders | The 2px amber edge and 2px violet selection line are state indicators on a row or list item, not decoration; kept | Documented exception |
| Emil: motion budget, strong easing, under 200ms | Followed (section 8) | Fits the work tool |
| Landing "one serif word per headline" | Only on the sign-in and first-use headlines | Tables and controls need clear interface type |

## 10. Rollout and known limits

Shipped in Lightbox: tokens, shell, Overview, Transactions with the docked evidence pane and sheets, Investigations, Linked accounts, Experiments, Data checks, Evidence search, first use and import, sign-in, session-expiry and unreachable-API states, motion, and the accessibility and consistency checks in `execution/ui_check.mjs`.

Known limits of the shipped design:

- No arrow-key stepping between transaction rows (Tab reaches each row's ID button).
- A table with a very large amount at tablet width scrolls inside its own region instead of reflowing.
- Closing evidence uses `history.back()`, which is asynchronous; reopening within a few milliseconds is undone.
- Native selects clip long option labels; the full value is available in the evidence and run-strip views.
- The workspace still loads the full run (all transactions) on every route. A paged API exists but the screens do not use it yet. Moving them is a performance task of its own and was deliberately not part of this visual change.
- The linked-accounts diagram shows at most 8 shared devices and 10 linked accounts and has no pan or zoom; the table lists all links.

## 11. Public landing page ("Lightbox")

Mode: Persuade. Code: `frontend/components/landing/*`, `frontend/app/landing.css`, `frontend/app/page.tsx`. Everything is scoped to `.lp`; the workspace stylesheet cannot reach it. This replaces the earlier "Trace" direction (lime, thin signal line, stacked heading-plus-cards sections).

Idea: the product is the hero. One lit interface (the real Transactions screen with its inspector, built from the workspace's own labels and the built-in synthetic sample) rises out of perspective under the headline, settles flat, and the page follows one transaction from the queue to a documented case. The composition adapts the reference screenshot's structure (centred display headline, one large lit product object, a floating call-to-action pill on near-black), not any company's branding or claims.

Page structure: one long dark film (hero and product scene, pinned), a short light paper statement, a full-bleed diagram of shared devices, a light numerals section for the model run, two overlapping documents for evidence, and a closing that echoes the hero (queue tilted back into the light, same pill). Dark and light alternate; no two neighbouring sections share a layout.

Visual rules:

- Ground near-black `#05060b` with a cool tint. Surfaces step up in four levels. One accent, ultraviolet (`#5f4bf5` fill with white text, `#b9afff` as text and line on dark); light is a violet radial glow behind and under the product, never a gradient on text. Risk and status colours are data only: amber for flagged and feature deviation, teal for shared devices, the accent for the selected row. The paper section uses `#ebe8e1` with near-black ink and `#4631e0` for the accent word.
- Type, four roles: display and body Geist (600 display, tracking about -0.047em, balanced); labels and every figure or ID Geist Mono with tabular figures, labels uppercase at 11px with 0.12em tracking; one italic serif word per headline in Instrument Serif (`em`, in the accent colour). Giant numerals (ROC-AUC) are Geist 600. Nothing under 11px; sentence case.
- The product object carries authentic detail only: real sidebar groups (Work, Explore, Model), real column names, real top-of-queue rows, percentile bars, IQR deviations, UTC stamps and a "Synthetic sample" chip. The shared-device diagram uses the sample's real clusters (DEV-035, DEV-031, DEV-002, DEV-001).
- Copy keeps the product truths: percentile is a rank, runs are batch and nothing blocks a payment in real time, synthetic metrics do not estimate real performance, evidence search is deterministic keyword matching, a shared device is a lead, sign-in is one shared owner password. No customers, logos, testimonials or compliance badges.
- Footer links are only the seven workspace routes.

Motion rules:

- One scroll-linked system. `ScrollStage` (client) writes `--p` (0 to 1) onto the few `data-p` elements and `data-reach` (1 to 4 at 22%, 48% and 74%) onto the film from one passive, rAF-throttled listener that exists only while the film is near the viewport. Layout is measured on mount, resize, content-size change and `pageshow`, never per frame. No React state changes per frame.
- Layout switch: `html[data-lp="pin"]` pins the film (410svh, CSS `position: sticky`, native scrolling); `html[data-lp="flow"]`, or no attribute, is the flow layout. A tiny inline script sets the attribute before first paint from `PIN_QUERY` (min-width 900px, min-height 640px, no reduced motion); `ScrollStage` keeps it current and removes it on unmount. If a deployed host forbids inline scripts, the page still works and switches layout once after hydration.
- Sequence: 0 to 30% the product rises out of a 36deg perspective tilt and 0.86 scale to flat (smoothstep on `--p`; a violet glow dims, a sheen fades, the headline and pill leave over the first 14%, the rail of four stages arrives); from 22% one row is selected and the rest recede in colour, never opacity, with context in the inspector (deviation bars grow with `--p`); from 48% a linked-accounts sheet rises over the queue and its wire draws with `--p`; from 74% the inspector resolves to the investigation record. Scrolling back reverses every state; a scroll position always gives the same picture.
- Performance: `--p` and derived values are registered with `@property` (`inherits: false`) and used only on the element that holds them (pseudo-elements do not inherit non-inheriting properties, so every scroll-driven part is a real element). Movement is transform and opacity; no blur, no filters, no layout animation. The product is layered once (`will-change: transform`) and only transformed.
- Short viewports shrink the scene instead of scrolling it: at 820px tall or less the queue shows six rows, at 720px or less five rows and no rail captions.
- Below the film, sections settle in once (opacity and a 32px rise) after script marks them ready; the shared-device edges draw once. Press feedback `scale(0.97)`; hover only under `(hover: hover)`.
- Flow layout (under 900px wide, under 640px tall, reduced motion, or no script): headline, pill, then the same product recomposed by its own width (container queries drop the sidebar, then the merchant and review columns, then stack the inspector), with the queue, linked accounts, evidence and investigation all visible, then the four stages as a numbered list. No tilt, pinning or animation runs. The shared-device diagram becomes a small DEV-035 drawing plus a list.
- Accessibility: the product object is `role="img"` with one reading; headings run h1, then one h2 per section; focus rings are visible on every stop; anchors clear the sticky nav (`scroll-padding-top`, `scroll-margin-top`). The hero pill is hidden once the film leaves the first scene, and the nav action stays reachable.
- References: the supplied product-page screenshot (primary composition), a Behance fraud dashboard viewed as stills (one large product object, one accent, sparse type) and Motion's scroll docs (progress tied to scroll, pin with sticky, measure layout, clean up listeners). No animation library is used.

Checks: `node execution/landing_check.mjs --base <url>` (against a production build) covers layout selection, the first screen, the scene states, reversal, resize, anchors, load-at-anchor, back navigation, keyboard, reduced motion, short windows, overflow at six widths, axe in every state, links and the mobile menu. Screenshots: `docs/refinement/screenshots/landing/` (`before/` is the Trace page, `after/` the redesign).
