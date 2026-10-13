---
name: ticketzy-frontend-workflow
description: Use when adding or changing a Ticketzy feature that touches GraphQL, translations or page states, and when verifying and reporting finished work.
---

# Ticketzy frontend workflow

Read `docs/ai/DECISIONS.md` first. Yarn only. Backend: `http://localhost:3007/graphql`; check names and types against `docs/ai/schema.json`.

## Add a GraphQL query or mutation
1. Add the document in `apollo/user`, `apollo/organizer` or `apollo/admin` (reuse fragments).
2. Add or extend the TypeScript type in `libs/types`.
3. Call it with `useQuery` / `useMutation` from the page or a hook in `libs/hooks`. Queries time out at 20 s and retry; mutations time out at 60 s and do not retry.
4. Map known server messages to translated text in `libs/errors.ts`; unknown messages are shown as sent.
5. Sign-out and account switches use `resetStore()`, not `clearStore()`.

## Loading and error states
- Loading: a skeleton with the final size (no layout shift), not a blank page.
- Error: an inline message with a retry button (`refetch`), in the page's language.
- Empty: a short message and a next step.
- Submit buttons disable while the request runs; server-rendered forms use `useAdoptTypedValues`.

## i18n (en, ko, ru, uz)
- Add every key to all four files in `public/locales/<lang>/<namespace>.json`, same keys and `{{placeholders}}`.
- List the namespace in the page's `serverSideTranslations` call, or the page shows raw keys after a hard load.
- Plurals use the i18next suffixes; dates and numbers go through the locale formatters.

## Verification checklist
1. `yarn typecheck`
2. `yarn lint`
3. `yarn i18n:check`
4. Scratch build on port 3100 (never a second server on 3000); for a mock API, point `NEXT_PUBLIC_API_GRAPHQL_URL` at it for that build only; do not touch `.env*`.
5. axe on changed pages in light and dark (0 violations), keyboard path, 375 / 768 / 1440 px, reduced motion.

## Finish
- Next F-number in `docs/ai/DECISIONS.md`; entry in `docs/ai/FRONTEND_COMPLETED_TASKS.md`. Do not commit unless asked.

## Report format
Files changed (one line each) / checks run with results / not tested or left / anything that contradicts a decision.
