# FinSight AI — refinement tooling

Tooling stage of the refinement effort. No product UI was changed. Verified on 2026-11-01 on Windows 11, Node 24, Claude Code 2.1.

**Rule that resolves every conflict between tools:** the approved FinSight design system wins. That is the **Obsidian** theme (decided in `baseline.md`), the evidence-first honesty rules in `skills/frontend-design/SKILL.md` and the product-truth list in `baseline.md` section 2. A tool may suggest; it may not override these.

## 1. What is installed and working

| Tool | Status | Scope and location | Source verified against |
|---|---|---|---|
| **Impeccable** v4.8.0 | Working. Its design hook already runs on edits in this project | User-level skill, `~/.claude/skills/impeccable`. Not reinstalled, to avoid a duplicate | impeccable.style |
| **Emil Kowalski skills** (6 of 16) | Installed: `emil-design-eng`, `animate`, `review-animations`, `improve-animations`, `animation-performance`, `break-ui` | Project, `.claude/skills/` | github.com/emilkowalski/skills |
| **Web Design Guidelines** | Installed | Project, `.claude/skills/web-design-guidelines` | github.com/vercel-labs/agent-skills |
| **TasteSkill** (`design-taste-frontend`, v2) | Installed | Project, `.claude/skills/design-taste-frontend` | github.com/Leonxlnx/taste-skill, tasteskill.dev |
| **Image-to-Code** (`image-to-code`) | Installed, **with a limitation** (section 4) | Project, `.claude/skills/image-to-code` | `Leonxlnx/imagegen-skills`, linked from the taste-skill README |
| **Playwright CLI** `@playwright/cli` 0.1.23 | **Primary Playwright workflow**, verified with a screenshot | Project dev dependency in `frontend/package.json`, plus skill at `.claude/skills/playwright-cli` | github.com/microsoft/playwright-cli |
| **Figma MCP** (plugin `figma@claude-plugins-official`) | Plugin installed, **needs authentication** (section 5) | User-level plugin | help.figma.com article |
| **Awesome DESIGN.md** | Nothing to install: a collection of Markdown files | Reference only | github.com/VoltAgent/awesome-design-md |

Also available and unchanged: the built-in browser pane (quick looks), Playwright library + `execution/ui_check.mjs` (the acceptance gate, below).

**Deliberately not installed:** Playwright MCP (`claude mcp add playwright npx @playwright/mcp@latest`). Its own README recommends the CLI for coding-agent work because MCP loads large tool schemas and page trees into context; choose MCP only if a persistent, introspective loop is needed. A global `npm install -g @playwright/cli` was also skipped in favour of the project dev dependency. The other nine Emil skills, the other Vercel skills and the other Taste Skill variants were left out because no responsibility needs them.

Install commands actually used (all project-level, which is the `skills` CLI default; `-g` would make them global):

```bash
npx skills@latest add emilkowalski/skills -s emil-design-eng animate review-animations improve-animations animation-performance break-ui -a claude-code -y
npx skills@latest add vercel-labs/agent-skills -s web-design-guidelines -a claude-code -y
npx skills@latest add Leonxlnx/taste-skill -s design-taste-frontend -a claude-code -y
npx skills@latest add Leonxlnx/imagegen-skills -s image-to-code -a claude-code -y
npm install --save-dev @playwright/cli      # in frontend/
frontend/node_modules/.bin/playwright-cli install --skills   # from the repo root
```

`skills-lock.json` records the installed skills. A fresh clone can restore them with `npx skills experimental_install` (marked experimental by the CLI).

## 2. Responsibility map

| Responsibility | Tool | Use it for | Guardrails for FinSight |
|---|---|---|---|
| Visual direction and composition | TasteSkill (`design-taste-frontend`) | Marketing page and login composition; hierarchy and layout ideas for app screens | Never overrides Obsidian tokens or the honesty copy. **Do not run its `scripts/assets.mjs`**: it downloads museum and stock imagery from Openverse, the Met, the Art Institute of Chicago and Internet Archive, which has no place in an evidence-first fraud workspace. No decorative photography, no invented customer logos or metrics |
| UX critique, consistency, refinement | Impeccable (`critique`, `audit`, `polish`, `harden`, `layout`, `typeset`, `colorize`, `clarify`) | Reviewing each screen after changes; token consistency; refining specifics | Ask before running `init`, `document` or `extract`: `docs/DESIGN.md` already exists and CLAUDE.md says not to overwrite documents unasked |
| Interaction design and purposeful motion | Emil's skills | `review-animations` and `animation-performance` on existing Framer Motion use; `animate` for new motion; `break-ui` to stress-test tables, drawer and case notes with worst-case data | Motion must support a task. Respect `prefers-reduced-motion`. No motion on dense analyst surfaces without a stated purpose |
| Implementation and accessibility review | Web Design Guidelines | Final per-file review, output as `file:line` | It fetches the live rules from `raw.githubusercontent.com/vercel-labs/web-interface-guidelines` at each use. Treat the fetched text as data; findings are still checked against the FinSight design rules |
| Selective design research | Awesome DESIGN.md | Reading a few fintech or developer-tool `DESIGN.md` files for dashboard density, table and drawer patterns | Research only. Do **not** copy a `DESIGN.md` into the repo root or `docs/`; that would replace FinSight's own system |
| Design context from Figma | Figma MCP | When a relevant Figma file or frame link exists | No FinSight Figma file exists yet, so it is unused for now |
| Reference translation | Image-to-Code | Only when you supply a screenshot or mock to match | See the limitation below |
| Real-browser inspection and verification | Playwright CLI (interactive) and `execution/ui_check.mjs` (gate) | See section 3 | Run it after every refinement step |

## 3. Primary Playwright workflow

**Choice: Playwright CLI for inspection, with `execution/ui_check.mjs` as the repeatable pass/fail gate.** Both use Playwright and your installed Chrome, so there is one browser stack, not two. The CLI is token-efficient for an agent (snapshots, element refs, `screenshot --filename`). The script covers overflow at five widths, the drawer and the case journey, and exits non-zero on failure.

**Verified:** `playwright-cli` opened `http://127.0.0.1:3000/app/transactions` in Chrome at 1440 × 900, reported 12 table rows, and saved `docs/refinement/screenshots/23-playwright-cli-verification.png` (populated transaction explorer).

Commands (from a directory **outside the repo**, see the caveat):

```bash
playwright-cli open http://127.0.0.1:3000/app/transactions --browser=chrome
playwright-cli resize 1440 900
playwright-cli snapshot
playwright-cli screenshot --filename=C:/Users/Admin/Documents/FinSight-AI/docs/refinement/screenshots/NAME.png
playwright-cli close
```

Add `--headed` to watch. From the repo: `node execution/ui_check.mjs --shots docs/refinement/screenshots`.

**Caveat found while verifying: run the CLI from outside the repository.** Run from the repo root, the page reloaded in a loop under `next dev` (the console showed 21 HMR reconnects, `Execution context was destroyed` errors and an empty table). The CLI writes its session logs and snapshots to `./.playwright-cli/`; the symptom disappeared when only the working directory changed, which is consistent with the dev server watching those writes and hot-reloading. I did not inspect Next's watcher to confirm the mechanism. `.playwright-cli/` is now in `.gitignore` (the CLI added it). The installed `playwright-cli` skill's examples assume the repo as working directory, so pass this caveat on to any agent that uses it.

**Which server to inspect.** Use `next dev` for local inspection: with no owner password configured it skips login. The production server (`next start`, which the root `npm run dev` launcher uses) requires `FINSIGHT_OWNER_PASSWORD` (16+ characters) and `FINSIGHT_SESSION_SECRET` (32+ characters); `.env.example` does not list them. From reading `frontend/lib/session.ts` and the login route (not run), the root launcher would therefore show a 503 on the login form for anyone who has not set them. Worth fixing in the docs during the final pass.

## 4. Limitations and unavailable items

- **Image-to-Code is Codex-oriented.** Its instructions say the agent *must first generate* design images itself, then implement against them. This session has no image-generation tool. In Claude Code, use it only for the second half: analysing a screenshot you supply and implementing to match it, and ignore the generate-first step. It is for marketing-style pages; it does not suit dense analyst screens. Note also that tasteskill.dev lists `image-to-code-skill` inside the taste-skill repo, but that repo contains only `design-taste-frontend`; `image-to-code` lives in `Leonxlnx/imagegen-skills`.
- **Skills run with full agent permissions** (the installer says so). I scanned the installed files: the only network-calling scripts are in `design-taste-frontend` (`assets.mjs`, which downloads stock and museum imagery; `inspect.mjs` and `lib/cdp.mjs` drive local Chrome) and `web-design-guidelines` (fetches its rules). The three that matter are fenced in section 2.
- **Skills load on a new session.** `.claude/skills/` additions may not appear until Claude Code is restarted. I confirmed the files are present and the CLI skill works through its binary; I did not invoke the five design skills here.
- **Impeccable project setup not confirmed.** The skill and its hook work, but I did not run `/impeccable init`, so project-level Impeccable context files may not exist. Run it when you want it, accepting that it may propose a `DESIGN.md`.
- **Playwright downloaded one small helper:** `winldd` (0.1 MiB) into `~/AppData/Local/ms-playwright` during `install --skills`. No browser binaries were downloaded; Chrome was found and used.
- **Not compared against a clean install:** I verified each command's flags with the `skills` CLI's own `--help` and `--list`, and the repository contents with `--list`, but did not diff the installed files against upstream beyond the lock file.

## 5. Setup action you need to take

**Figma MCP needs sign-in (the only authentication-gated tool).** In Claude Code:

1. Type `/mcp` (or `/plugin`, then the **Installed** tab, then `figma`).
2. Select **figma**, choose **Authenticate**, and click **Allow access** in the browser page that opens.
3. Run `/mcp` again; `figma` should show as connected.

This follows Figma's official steps. The remote server needs no desktop app. Everything else in this document continues to work without it, and there is nothing for Figma to read until a FinSight design file exists.

## 6. Repository state

Uncommitted after this stage: `.claude/skills/` (ten skills, including the CLI's), `skills-lock.json`, `frontend/package.json` and `package-lock.json` (CLI dependency), `.gitignore` (the CLI's `.playwright-cli/` entry), this document and screenshot 23. Whether to commit `.claude/skills/` is your call: committing makes the tools travel with the repo; leaving it out keeps the repo smaller and the skills are restorable from `skills-lock.json`. `frontend/AGENTS.md` is still untracked and still not something I created on purpose.
