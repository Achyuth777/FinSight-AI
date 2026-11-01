# FinSight AI: two visual directions

Stage: direction proposal. Nothing here touches production routes. The previews are static files in `docs/refinement/directions/` and read no API data. The decision is yours; nothing has been rolled out.

Method: TasteSkill's app-screen run (`references/app-screens.md`, styles dealt with `draw.mjs --app`, seeds in `.tmp/taste/`), then an Impeccable critique pass (section 5). Its image downloader (`assets.mjs`) was not run, and no Awesome DESIGN.md file was copied into the repo. No Figma file exists for FinSight, so the previews are local browser pages.

## 1. What the direction has to serve

- **Who:** one analyst, working a batch of payment transactions in long sessions, on a laptop and occasionally a phone.
- **The screen's one question:** which flagged rows should I look at first, and why did the model flag each one?
- **Most frequent job:** open a flagged row, read the evidence, then either open an investigation or move on.
- **Product truth the visuals must not contradict** (from `baseline.md`): INR and UTC; the score is an anomaly percentile, not a fraud probability; feature deviations are not SHAP; the data is a synthetic sample unless uploaded; analysis is batch, not live; no fake activity, logos or metrics.

Both directions share one FinSight-specific element so they stay recognisably the same product. The **percentile ruler** is a thin 0 to 100 track with the review threshold as one tick and the row's percentile as one mark. It appears on every row, in the evidence panel and as the band summary above the table. It needs no legend, it is honest about what the number is (a rank against training scores), and it replaces the traffic-light score pills.

## 2. Direction A: Ledger (light)

Previews: [ledger.html](directions/ledger.html) · [desktop](screenshots/directions/ledger-desktop.png) · [mobile](screenshots/directions/ledger-mobile.png)

| | |
|---|---|
| **Typography** | Hanken Grotesk for all interface text at 14px. Newsreader (serif) only for the page title and the one answer figure in the evidence panel (40px). Tabular figures everywhere; no monospace. |
| **Numerics** | Amounts right-aligned with two decimals and Indian digit grouping (₹84,250.00), percentiles at one decimal, 500 weight, fixed-width column so digits stack. IDs in the sans at 600. |
| **Colour** | Chrome is ink on white on a cool grey ground (#f2f4f7). Colour is data only: one blue (#1d5fbf) on the percentile mark and deviation bars. The primary button is near-black. |
| **Status colours** | Amber pill: flagged for review (not "fraud"). Blue pill: in investigation. Grey pill: reviewed or standard. Red is reserved for failed data checks and errors, so it never appears on a transaction. |
| **Layout and density** | Spacious: 44px rows, 16px gutters, 28px canvas padding. A labelled 232px sidebar, a 30px serif page title with the finding as a sentence beneath it, a context panel, then the band summary and the queue beside a docked 360px evidence column. |
| **Navigation** | Labelled sidebar grouped Work / Explore / Model, active item a grey pill, no accent colour. A count only on Investigations. |
| **Tables, charts, forms** | Header row in grey regular 12px, hairline row rules, no zebra, no header band. Band summary is a three-part bar with seams. Controls are 34 to 36px, white with a grey border. |
| **Surfaces** | White cards on the grey ground, 1px border, 8px radius, no shadow at rest. |
| **Recognisably FinSight** | The percentile ruler, the serif answer figure, and the context panel carrying the SYNTHETIC SAMPLE chip and UTC period. |
| **Why it supports the tasks** | Highest legibility for reading evidence sentences and comparing figures. Labelled navigation needs no learning. The light, document-like surface suits exporting or screen-sharing a case. |

## 3. Direction B: Instrument (dark)

Previews: [instrument.html](directions/instrument.html) · [desktop](screenshots/directions/instrument-desktop.png) · [mobile](screenshots/directions/instrument-mobile.png)

| | |
|---|---|
| **Typography** | IBM Plex Sans at 13px for text, IBM Plex Mono for every figure, ID and timestamp. Page title is a 15px breadcrumb, not a hero. |
| **Numerics** | Mono with tabular digits so columns line up digit for digit. The evidence panel's answer figure is mono 34px. Mono is a deliberate exception to TasteSkill's "no monospace" rule: it is the style's decision (digits that stack, IDs that scan), and a ledger of identifiers is the case where it earns its place. |
| **Colour** | Graphite ground (#0b0e13) and surfaces one lightness step apart, which is the current Obsidian theme, so step 0 carries over. Lime (#d5f78b) appears only as the percentile mark, deviation bars and the 1px selection line. |
| **Status colours** | Amber tag: flagged for review. Cyan-blue tag: in investigation. Grey tag: reviewed. Red is reserved for failures. Tags are square-cornered (3px), not pills. |
| **Layout and density** | Dense: 42px rows with two-line identity cells, 13px text, 20px padding. A 56px icon rail, a 48px top bar, one-row context strip, then the queue with the evidence pane docked at 400px full height, divided by 1px rules instead of cards. |
| **Navigation** | Icon rail with tooltips and accessible names, the active item marked by a 1px lime bar on the rail's edge. Same single-line selection mark on the row, the tab and the mobile bar. |
| **Tables, charts, forms** | Same table rules as A. The band summary is a full-width axis with the 80th and 95th percentile edges. Controls are 30px, outlined, on the ground colour. |
| **Surfaces** | One ground, separated by 1px rules; no cards, no shadows. |
| **Recognisably FinSight** | The percentile ruler in lime on graphite, mono figures, the single-line selection mark. |
| **Why it supports the tasks** | Lower glare in long sessions, the most rows per screen, and the queue and evidence side by side with no overlay hiding the table. Fewer boxes means fewer edges to scan. |

## 4. Same screen, same content

Both previews render the same data from `directions/shared.js`: the Transactions review queue with TXN-10513 open in the evidence pane. Real demo-run facts are kept (1,200 rows, 75 flagged or 6.3%, 962 / 181 / 57 band split, run 97c47264, TXN-10513 on ACC-035 with velocity 1h six IQR out). **Every other row, amount, merchant pairing, deviation value and the shared-device link is sample content for layout** and each preview says so in its banner.

- **Desktop (1440):** A shows 8 rows with the evidence column beside it; B shows 8 rows plus the evidence pane and the band axis without scrolling. Neither overflows horizontally.
- **Mobile (390):** both turn rows into stacked cards (ID and amount, merchant and account, then ruler, percentile and tag) and place the evidence below the list. A hides the sidebar behind a Menu button; B replaces the rail with a labelled bottom bar. Neither has horizontal overflow (measured: scrollWidth 390).
- **Known preview limits:** on a phone the evidence should open as a full-height sheet rather than sit under the list; the previews do not build that, and the full-page mobile capture of B draws its sticky bottom bar mid-page, which is a capture artefact.

## 5. Critique pass (Impeccable)

`Method: DEGRADED, single-context.` Impeccable's critique normally runs the design review and the detector as two isolated sub-agents. This session does not spawn sub-agents unprompted, so I ran the design review myself and the detector as a separate command (`impeccable detect --json` on both files). No critique snapshot was persisted to `.impeccable/critique/`.

**Detector:** one finding, `cramped-padding` on A's `.panel`, because table rows run edge to edge inside the bordered card. That is deliberate (rows bleed to the card edge) and each cell has 16px of its own padding, so I treat it as a false positive. Nothing was suppressed.

**Design specificity:** both avoid the dashboard template: no icon-topped KPI tiles, no gradients, no sparklines, no hero greeting, and the lead element is the evidence row, not a chart. The percentile ruler is the part that could not belong to another product. Without it, A is close to a generic light data table; B is close to a generic dark terminal.

**Findings that apply to the chosen direction, whichever it is:**

| Severity | Finding | Fix |
|---|---|---|
| P1 | B's icon-only rail hides seven destinations behind tooltips. A first-time analyst cannot tell Evidence search from Linked accounts. | Keep labelled navigation (A's grouped sidebar, or what step 0 already built) and use the rail only as an optional collapsed state. |
| P1 | A 1px selection line (B) is a weak signal for low-vision users and for dim screens. | Pair the line with a one-step tint on the selected row, as B's table row already does, and keep a 2px focus ring. |
| P2 | Percentile ruler tick and fill are close in tone at A's 4px height. | Make the threshold tick taller than the track and label "Review threshold 94" once, in the band summary. |
| P2 | Evidence on a phone sits below eight cards, so the row you tapped scrolls away. | Open a bottom sheet with focus trapped and Escape to close. This is the J2 drawer work, not a visual-direction question. |
| P3 | Both previews use "Showing 8 of 75 flagged" next to an "All rows" filter; the count and filter disagree. | Show the count of the active filter. |

**Persona red flags.** Alex (power user): neither preview has keyboard row navigation; B's density and mono columns serve scanning, A's two-line cells are slower. Sam (accessibility): amber on #fdf3dc (A) and amber on #2a2314 (B) both pass 4.5:1 by calculation but were not machine-tested; status is also carried by text, never colour alone. Jordan: A passes; B's rail fails until labelled.

## 6. Recommendation: Direction B, Instrument, with labelled navigation

1. **It continues what you already approved.** Obsidian graphite and lime were your choice, and step 0 is committed on that palette. B is a refinement of it; A would replace it with a light theme and discard that work.
2. **It fits the job.** The task is scanning a ranked queue and reading evidence beside it. B shows more rows and the evidence at once, without cards or overlays, and its dark ground is easier in long sessions.
3. **Its colour discipline is stricter.** Lime appears only on data marks and the selection line, so the status colours (amber, cyan, grey) stay readable as status. The current app spreads lime over buttons, pills and borders.
4. **The weakness is fixable cheaply:** use the labelled sidebar from step 0 instead of the icon rail, and add a row tint to the 1px selection line.

Where A is better, and what I would borrow regardless: its grouped labelled sidebar and its calm context panel. If you expect analysts to screen-share cases, export to documents, or work in bright rooms, A is the better choice, and a light theme could still be added later from the same tokens.

**Costs.** B needs IBM Plex Sans and Mono (two Google Fonts families; self-host them in the app via `next/font` so no external request is made at runtime). A needs Hanken Grotesk and Newsreader. Both are open-licensed.

## 7. Decision needed

Choose one before any rollout:

- **B, Instrument**, as recommended, with the labelled sidebar.
- **A, Ledger**, replacing the Obsidian palette.
- **A hybrid** you name (for example B's density with A's serif answer figure).

Also confirm two details that the choice depends on: whether monospace figures are acceptable, and whether Inter (the current font) should be replaced. I have not changed any production file for this stage.

## 8. Decision (2026-11-01)

**Direction B, Instrument, chosen by you.** Rollout started with the foundations only: IBM Plex Sans and Mono through `next/font` (self-hosted at build), status tokens (flag amber, case cyan, clear grey, red reserved for failures), square 3px tags, an 8px radius, mono figures and IDs, and the percentile ruler replacing the score pills. Navigation stays the labelled, grouped sidebar from step 0, not the icon rail. Unchanged for now: page layouts, the evidence drawer, and marketing and login (steps 1 to 6 in `experience.md`).

Note: `next/font/google` downloads the two families during `next build` (and in dev when online); an offline first build fails or falls back to system fonts.
