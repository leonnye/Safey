# Safey — System Architecture

**Status:** Proposed MVP architecture  
**Audience:** Engineering, security, QA, operations  
**Last updated:** 2026-10-18

## 1. Overview

Safey is a Ghana-first personal finance mobile app for adults 18+. The initial release accepts financial data through manual entry and reviewed CSV imports. Direct bank or Mobile Money connections are explicitly post-validation work and require a separately evaluated provider, user authorization, and appropriate legal/security review. No provider, approval, or integration is assumed here.

### Proposed stack

- **Mobile:** React Native, Expo, TypeScript.
- **Backend:** Supabase Auth, PostgreSQL, Row Level Security, Edge Functions.
- **Financial calculations:** Deterministic TypeScript domain module with fixed-precision integer minor units; no LLM performs arithmetic or writes financial facts.
- **AI:** Cloud AI API called through a server-side orchestration layer and narrowly defined tools. Provider selection, retention terms, and regional data handling require validation before production.
- **Subscriptions:** Freemium. Store billing and entitlement implementation is a launch decision to validate against Apple/Google policies; this document does not assume a payment provider.
- **Observability:** Privacy-minimizing structured telemetry, crash reporting, and operational alerts; vendors and retention to be selected before production.

### Logical flow

`Expo app → Supabase Auth → RLS-protected Postgres`  
`Expo app → Edge Function → deterministic finance engine → database`  
`Expo app → Edge Function → AI orchestration → cloud AI API` (only with consent and minimized context)

The client is untrusted. Authorization and validation occur on the server and in database policies. The app must remain useful for core record keeping and calculations when AI is unavailable.

## 2. System boundaries and modules

### Mobile application

Modules: onboarding/consent, ledger entry, CSV import preview, category/source management, dashboard, scenario simulator, warnings, settings/privacy, subscription UI. Keep screen components separate from domain calculations and API transport. Store only short-lived session state and the minimum offline cache required for an explicitly designed offline experience. Do not persist access tokens or sensitive financial data in plain text beyond platform-protected storage and documented cache needs.

### Backend

- **Auth:** Supabase Auth user identity; require verified email or another selected supported method before syncing data. MFA is a recommended later enhancement, with risk-based decision before launch.
- **Postgres:** Authoritative financial records, user preferences, consent records, import jobs, insights, and subscription entitlements.
- **RLS:** Every user-owned table has `user_id`; default deny; policies scope reads/writes to `auth.uid()`. Service-role keys never ship to the client. Edge Functions must derive identity from a verified JWT, not a caller-supplied user id.
- **Edge Functions:** Validate requests, enforce ownership and consent, rate-limit expensive operations, orchestrate deterministic calculations and AI, and return typed responses.
- **Financial engine:** Pure functions for balances, cash-flow windows, budgets, scenario projections, and warning signals. Version algorithms and inputs; provide deterministic fixtures and reproducible outputs.

### AI orchestration

AI is an optional language layer for explaining structured, computed results and helping users explore scenarios. An AI call may only use an allowlisted, minimized context assembled by the server. It cannot issue SQL, access arbitrary tables, initiate transfers, connect accounts, alter ledger records, determine eligibility, or make binding decisions. Tool calls are schema-validated; user-confirmed mutations are separately submitted to ordinary APIs.

## 3. Data model

All timestamps are UTC `timestamptz`; user-facing dates use `Africa/Accra` unless the user changes locale. Amounts are integer minor units plus an ISO 4217 currency code (`GHS`). Define decimal/rounding conventions per operation; never use binary floating point for money. Historical records retain original import values for audit/review where appropriate.

| Table | Key fields | Notes |
|---|---|---|
| `profiles` | `id` (Auth UUID), `display_name`, `locale`, `timezone`, `default_currency`, `created_at` | User settings; `default_currency` defaults to `GHS` after confirmation. |
| `consents` | `id`, `user_id`, `purpose`, `policy_version`, `granted_at`, `revoked_at` | Purpose-specific consent, including AI processing; append/revoke history rather than overwrite. |
| `financial_sources` | `id`, `user_id`, `label`, `kind`, `is_archived`, `created_at` | `kind`: cash, bank_manual, mobile_money_manual, other. No credential fields in MVP. |
| `categories` | `id`, `user_id` nullable for system category, `name`, `direction`, `parent_id`, `is_active` | Seed Ghana-relevant editable categories; users can add custom categories. |
| `transactions` | `id`, `user_id`, `source_id`, `category_id`, `direction`, `amount_minor`, `currency`, `occurred_at`, `note`, `origin`, `external_ref_hash`, `created_at`, `updated_at` | `origin`: manual or CSV. Avoid storing unnecessary merchant data. Signed direction is explicit. |
| `import_jobs` | `id`, `user_id`, `status`, `file_name`, `file_hash`, `mapping_json`, `row_count`, `error_summary`, timestamps | Store parsed/reviewed data only as long as needed. Prefer client-side parsing or short-lived private storage; never public bucket. |
| `obligations` | `id`, `user_id`, `label`, `amount_minor`, `currency`, `due_date`, `frequency`, `is_active` | User-entered upcoming bills/commitments; not a creditor feed. |
| `scenarios` | `id`, `user_id`, `name`, `inputs_json`, `engine_version`, `created_at` | Inputs are schema-versioned; output can be recomputed. Avoid implying scenario equals actual behavior. |
| `insights` | `id`, `user_id`, `rule_id`, `rule_version`, `severity`, `evidence_json`, `period_start`, `period_end`, `status`, timestamps | Deterministic warning outputs, explainable evidence, dismiss/snooze state. |
| `subscriptions` | `user_id`, `entitlement`, `source`, `status`, `valid_until`, `updated_at` | Server-verified entitlement only. Avoid relying on client-provided purchase claims. |
| `audit_events` | `id`, `user_id` nullable, `event_type`, `target_type`, `target_id`, `created_at`, minimal metadata | Security/admin audit events only; do not duplicate financial payloads into logs. Restricted access. |

Use foreign keys and checks for positive amount, valid direction/currency, and ownership. RLS policies must also prevent associating another user's source/category with a transaction. Consider composite ownership constraints or server-side checks. Define retention, deletion, and backup expiry policies before launch. Do not treat audit logs as a reason to retain user financial content after deletion.

## 4. API surface (versioned, illustrative)

All endpoints require authentication except public health/version. Use request IDs, schema validation, explicit pagination, and idempotency keys for create/import operations. Responses use a stable error shape: `{ code, message, requestId, details? }` with no sensitive internals.

| Method / route | Purpose |
|---|---|
| `GET /v1/profile` / `PATCH /v1/profile` | Read/update permitted profile settings |
| `GET /v1/transactions` | Filtered, cursor-paginated ledger |
| `POST /v1/transactions` / `PATCH` / `DELETE` | Create, correct, remove own transaction; validate source/category ownership |
| `POST /v1/imports/preview` | Parse/validate a bounded CSV payload or private upload reference; no financial write |
| `POST /v1/imports/{id}/commit` | Commit only reviewed, confirmed rows with idempotency protection |
| `GET /v1/dashboard` | Deterministic summary with as-of time and completeness metadata |
| `POST /v1/simulations` | Validate scenario inputs and return deterministic baseline/scenario/range plus engine version |
| `GET /v1/insights` / `POST /v1/insights/{id}/dismiss` | Read explanations and update own display state |
| `POST /v1/assistant/explain` | Optional AI explanation of a computed result; requires active purpose-specific consent |
| `GET /v1/entitlements` | Read server-verified plan access |
| `POST /v1/privacy/export` / `POST /v1/privacy/delete` | Start export or account deletion workflow with confirmation and status |

Avoid exposing a generic database/query endpoint. Enforce CSV size, row, column, encoding, date, and formula-injection limits. Do not execute imported spreadsheet formulas. API contracts should be OpenAPI or generated from shared TypeScript schemas and versioned.

## 5. Deterministic finance engine

The engine is a pure, versioned module with no network, clock, or random dependency. Inputs include explicit records, time zone, currency, and assumptions. Outputs include calculation version, data coverage, as-of time, and explanatory evidence. Use integer minor units, bounded date windows, and documented rounding.

MVP calculations: recorded inflow/outflow summaries; user-entered source balances; trend summaries; scenario comparisons; rule-based early warnings such as low projected available funds against known user-entered obligations, or unusual spending relative to a user's own recent records when coverage is sufficient. Thresholds must be conservative, configurable, and presented as signals rather than conclusions. Do not infer creditworthiness, diagnose behavior, or use demographic/protected traits.

Missing or sparse data must suppress unsupported signals or reduce confidence visibly. Forecasts should include assumptions and range/sensitivity rather than false precision. Store the rule/engine version used so a user-visible insight can be explained later.

## 6. AI boundaries and prompt safety

- AI does not calculate balances, forecasts, risk scores, or eligibility. The deterministic engine owns those values.
- AI receives only the minimum context needed for a user-requested explanation, after consent. Prefer aggregated and pseudonymous context; do not send free-text notes unless specifically needed and consented.
- Treat ledger descriptions, CSV cells, and user notes as untrusted input. They cannot override system instructions or grant tool permissions.
- Expose a small allowlist of read-only tools such as `get_computed_summary` and `explain_scenario`; no arbitrary SQL, network, or writes.
- Validate output shape, escape rendered content, and provide a safe deterministic fallback. Never present model-generated text as authoritative advice.
- Disclose when a response is AI-generated; provide “show calculation” or source evidence for numerical claims. Log model/version and request metadata without storing prompts or raw financial data unless a reviewed, consented diagnostic need exists.
- Set retention, provider training opt-out, data residency, subprocessors, and deletion behavior through vendor due diligence. Do not claim compliance or residency until verified.

## 7. Security, privacy, and abuse controls

Threat model includes lost devices, account takeover, cross-user data access, malicious CSV content, prompt injection, overbroad staff access, API abuse, and vendor exposure. Required controls:

- TLS in transit; managed encryption at rest; platform keychain/keystore for tokens; no secrets in app bundle or source control.
- Supabase RLS on every user table, tested with cross-user negative cases. Restrict service-role access to server runtime secrets.
- Validate/authenticate every Edge Function; rate limit AI, imports, and exports; use idempotency for repeated writes.
- Minimize collection and logs; redact sensitive fields; separate operational telemetry from financial content; restrict admin access and review audit access.
- CSV limits, MIME/encoding checks, formula-injection-safe exports, malware handling if files are uploaded, and short retention for temporary objects.
- Consent versioning, revocation, data export, account deletion, and documented backup deletion windows.
- Dependency scanning, secret scanning, signed/reproducible release process where practical, incident response plan, and a vulnerability reporting channel.
- Privacy notice and terms reviewed for Ghana and any applicable target jurisdictions before launch. This architecture is not legal advice and does not assert regulatory approval.

## 8. External integrations

### MVP

No direct bank, payment initiation, or Mobile Money connection. CSV import and manual entry are the only financial-data ingestion paths. Push notifications, crash reporting, analytics, AI vendor, and billing are vendor decisions, not presumed integrations. Select each only after security, privacy, cost, availability, and platform-policy review.

### Future connection evaluation

Before any bank/MoMo integration: validate user need and coverage; identify a legitimate provider and documented API; confirm commercial access, supported institutions, consent/revocation model, data scope, incident obligations, regional handling, and applicable Ghanaian requirements with qualified counsel; prototype in a sandbox; pass security review; then ship behind explicit consent and a kill switch. Never collect banking PINs/OTPs or claim real-time sync absent a verified provider implementation.

## 9. Testing strategy

Testing is specified here for implementation planning; run suites when the repository and delivery milestone are ready.

- **Unit:** Money parsing/formatting, timezone boundaries, rounding, CSV normalization, categories, engine rules, scenario invariants.
- **Property-based:** Conservation/aggregation invariants, no negative/overflow values, deterministic outputs, import idempotency.
- **Database/security:** RLS tests for every table and operation, cross-user isolation, missing JWT, revoked consent, service-role boundaries.
- **API integration:** Validation, pagination, retries/idempotency, rate limits, AI unavailable fallback, import preview/commit lifecycle.
- **Mobile:** Accessibility, dynamic type, offline behavior, import review, consent and deletion flows on iOS/Android devices.
- **End-to-end:** Signup → manual records → dashboard → warning/simulator → correction/export/delete; CSV import with duplicates and malformed rows.
- **Release:** Dependency and secret scan, migration rehearsal, backup/restore procedure, privacy review, App Store/Play policy review, staged rollout and rollback.

## 10. Environments, deployment, and operations

Use separate development, staging, and production Supabase projects and AI credentials. Use migrations checked into source control; deploy Edge Functions and database changes through reviewed CI. Apply backward-compatible schema changes before clients that depend on them; do not run destructive migrations without a tested recovery plan. Keep production data out of development; use synthetic fixtures.

Mobile builds: Expo development builds for native capabilities, internal QA distribution, then staged store release. Protect signing credentials. Feature flags can disable AI and future integrations remotely; defaults should be safe if flag service is unavailable.

Define SLOs and alert thresholds before launch for API availability, error rate, import failure, and AI latency/cost. Monitor aggregate health without collecting transaction contents. Maintain runbooks for vendor outage, suspected data exposure, failed migration, and account deletion/export failures. Backups need encrypted storage, restricted access, retention limits, and periodic restore rehearsal.

## 11. Assumptions and open decisions

- English (Ghana), GHS, and `Africa/Accra` are initial defaults, editable by the user.
- Financial records are self-reported or CSV-imported and may be incomplete or stale.
- Cloud AI is used only through a server-side API and only after explicit consent; provider and terms are unselected.
- Freemium packaging, premium feature boundaries, pricing, billing provider, and store entitlements remain product decisions.
- “Mobile Money readiness” means data model and UX can represent manually entered Mobile Money activity; it does not mean an integration exists.
- Before production, validate Ghana legal/privacy obligations, age/consent language, data retention, AI provider terms, incident process, and app-store requirements with qualified specialists.

