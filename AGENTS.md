Go outside of this project and read ticketzy/docs/ai first!

# Ticketzy Frontend Modification Instructions

This client project is being migrated from nestar-next to ticketzy-next

## Rules

- Preserve current project architecture
- Keep GraphQL/Apollo integration
- Do not rewrite the whole app
- Improve UI incrementally

## Backend Context

Before making any changes, read:

- docs/ai/BACKEND_MIGRATION.md
- docs/ai/DECIONS.md
- docs/ai/FRONTEND_MIGRATION.md
  and etc inside of petoria/docs/ai

## Workflow

1. Analyze before editing.
2. Backend is running on port http://localhost:3007/graphql now.
3. Make small incremental changes.
4. Run typecheck after each phase.
5. Do not remove working logic unless replaced safely.
6. Update ticketzy/docs/ai/COMPLETED_TASKS.md after major changes.

## Package Manager

- Use Yarn for all frontend commands.
- Do not use npm or pnpm.
- Install dependencies with:

```bash
yarn install
```
