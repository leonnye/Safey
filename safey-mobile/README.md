# Safey (mobile)

Ghana-first personal finance companion, built with Expo SDK 58, React Native and TypeScript. Product scope comes from `../PRD.md`, `../ARCHITECTURE.md` and `../DESIGN.md`.

This version stores everything **on the device only** (AsyncStorage). There is no account, server, Supabase project or AI service yet.

## Run it

```bash
npm install
npm run web        # browser preview at http://localhost:8081
npx expo start     # scan the QR code with Expo Go on a phone
```

## Checks

```bash
npm test           # finance engine, money/date and CSV tests (vitest)
npm run typecheck  # tsc --noEmit
npx eslint src
```

## Layout

- `src/domain/` — pure, deterministic logic with no React or clock access: money in pesewas, Africa/Accra dates, the finance engine (`engine/`), CSV import (`csv/`) and export.
- `src/domain/engine/config.ts` — **provisional** thresholds for coverage, spending estimates and warning rules. The PRD says these must be validated with users.
- `src/store/` — local persistence, actions, demo data.
- `src/components/`, `src/theme/` — UI built on the `DESIGN.md` tokens.
- `src/app/` — Expo Router screens: onboarding, five tabs (Home, Activity, Plan, Insights, Profile), and the editors, CSV import, simulator and insight detail.

## Not in this version

- Supabase Auth, Postgres, Row Level Security and Edge Functions (see `ARCHITECTURE.md`). The domain module is written so it can move server-side.
- AI explanations. Consent can be recorded, but no AI provider is connected and nothing is sent.
- Billing and premium plans, and push notifications.
- The ledger currency is Ghana cedi or US dollar, chosen in onboarding or Profile. Switching currency relabels amounts; it does not convert them.
- Mockup-only ideas still out of scope: transfers, connected bank or MoMo accounts, free-form AI chat, and savings goals.
