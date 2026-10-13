# Skills

Skills are instruction packs for AI coding tools. They live in `.agents/skills/<name>` and are linked into `.claude/skills/<name>`. **`docs/ai/DECISIONS.md` and the design tokens (`scss/tokens.css`) override every skill.** A skill script that downloads or runs a program needs explicit approval each time.

## Installed from outside

| Skill | What it does | Use it in Ticketzy for | Ticketzy rules that override it |
|---|---|---|---|
| vercel-react-best-practices | React/Next.js performance rules (data fetching, bundle size, re-renders) | Reviewing or refactoring components and pages | Apollo stays the only data layer (the rules mention SWR and server patterns); Pages Router; no new libraries |
| web-design-guidelines | Reviews UI code against Web Interface Guidelines (fetches the current guideline text) | "Review my UI" and accessibility audits | Needs network access; findings are checked against DECISIONS.md before changing anything |
| frontend-design | Pushes toward a distinctive visual direction instead of template defaults | New sections where the direction is open | The Volt look is fixed (F14, F18); do not change fonts, palette or brand |
| webapp-testing | Playwright toolkit for driving and screenshotting a local app (`scripts/with_server.py`) | Scripted checks of a running build | Examples use `npm run dev`; use Yarn, port 3100 for scratch builds, never a second server on 3000; Playwright is not in package.json, ask first |
| impeccable | Design commands: critique, audit, polish, harden, animate, adapt, etc.; has a CLI and live-browser scripts | Critique and polish passes on one page or component | Tokens and motion rules win; its scripts run programs, so approve each run; no changes to the design system without a decision |
| ui-ux-pro-max | Searchable UI/UX data (styles, palettes, fonts, UX rules, stacks) with Python scripts | Ideas and UX checklists | Do not adopt its palettes or fonts; use only as a checklist |
| emil-design-eng | Emil Kowalski's rules for UI polish and animation decisions | Micro-interactions, easing and timing choices | Use the `--ease-*` and `--dur-*` tokens, not its raw curves; reduced motion is mandatory |
| review-animations | Reviews animation code against a high bar (manual only) | Reviewing `scss/motion.scss` changes and new transitions | Same token and reduced-motion rules; a finding that conflicts with a decision (such as F321) is a note, not a change |

## Project skills (written for this repo)

| Skill | What it does | Use it for |
|---|---|---|
| ticketzy-ui | Tokens, motion, themes, contrast, backdrop, tags, how to add a page | Any visual change |
| ticketzy-frontend-workflow | GraphQL query/mutation steps, loading and error states, four-language i18n, verification checklist, report format | Any feature or fix |

## Global

`find-skills` is installed globally (outside this repo); it helps find new skills and is not tracked in `skills-lock.json`.

## Restoring

`skills-lock.json` stores each external skill's source repository, path and content hash, so the set can be reinstalled with the skills tool and checked for changes. Review a skill's files before approving any script it wants to run.
