# Safey — Product Requirements Document

**Version:** 1.0 (MVP definition)  
**Status:** Proposed; assumptions and open decisions are called out  
**Market:** Ghana first  
**Platform:** iOS and Android  
**Audience:** Adults aged 18+

## 1. Product summary

Safey is a personal finance companion for people in Ghana whose income and expenses do not always follow a predictable monthly rhythm. It helps users record money activity, understand their current picture, explore “what if” plans with a **Future Self Simulator**, and notice possible cash-flow pressure early through a **Financial Early-Warning System**.

The MVP uses manual entry and reviewed CSV imports. It does not connect directly to banks or Mobile Money providers. AI is an optional cloud-powered explanation layer over deterministic financial calculations; it is not the source of financial facts or decisions.

## 2. Problem and opportunity

Many budgeting products assume regular salaries, complete digital transaction feeds, and spending categories that do not reflect local use. People with freelance, small-business, seasonal, or mixed income can struggle to know what is available, plan around obligations, and recognize a squeeze before it happens. Users also need to trust how sensitive financial information is collected and used.

Safey addresses this by making incomplete records visible, supporting irregular cash flow, representing cash/bank/Mobile Money sources, and translating calculations into calm next steps. This is a product hypothesis to validate with Ghana-based adults; no market-size or outcome claim is assumed.

## 3. Target users and personas

### Primary: Ama, mixed-income worker

Ama earns from a regular job and occasional side work. She wants to plan for rent, transport, food, family support, and a variable income month. She needs to see a conservative picture without being told that the next month will match the last one.

### Primary: Kojo, independent earner

Kojo receives payments at inconsistent times through several channels, including Mobile Money. He wants a simple way to enter income and obligations, test a savings plan, and understand when funds could become tight.

### Secondary: Esi, small business owner

Esi mixes personal and business cash movements. She needs editable categories and sources and clear caveats that Safey is not accounting or tax software. The MVP does not promise business bookkeeping or tax compliance.

### Exclusions

The MVP is not designed for minors, institutional financial advisors, business accounting teams, credit underwriting, investment trading, or automated money movement.

## 4. Goals and measures

### User outcomes

- A new user can understand what Safey can and cannot see before adding financial data.
- A user can create a useful financial snapshot without linking an account.
- A user with variable income can compare a scenario and see its assumptions.
- A warning can be traced to records, dates, and a rule, and corrected if the records are wrong.
- A user can export or request deletion of their data.

### Product measures (targets set after baseline research)

- Activation: proportion of eligible signups who add enough records to produce a meaningful first summary.
- Time to first value: time from signup to first understandable dashboard or scenario.
- Import completion: preview-to-confirm rate and recoverable error rate.
- Trust: consent comprehension, privacy-control discovery, and user-reported clarity of forecasts/warnings.
- Retention: meaningful return use at 4 and 12 weeks, segmented by irregular-income pattern where users voluntarily self-identify.
- Quality: calculation correctness, warning precision/complaint rate, crashes, support incidents, export/deletion completion.

Do not optimize for raw transaction volume, alert opens, or subscription conversion at the expense of user understanding. Establish numeric targets only after usability research and an instrumented baseline.

## 5. Product principles

1. Support irregular and mixed income; do not require a salary cadence.
2. Separate observed records from estimates, projections, and AI-generated explanations.
3. Prefer explainable signals and user agency over opaque scores.
4. Avoid shame, guaranteed outcomes, or pressure tactics.
5. Collect the minimum data needed and make optional processing genuinely optional.
6. Localize currency, dates, categories, and source types for Ghana from the start.

## 6. Scope

### MVP in scope

- iOS and Android app for age-eligible adults (18+).
- Account creation/authentication and onboarding with clear privacy/AI explanation.
- Ghana-first defaults: GHS / GH₵, `Africa/Accra`, English (Ghana), editable settings.
- Manual transaction entry for income and expense, editable categories, notes, and user-created sources (cash, manually tracked bank, manually tracked Mobile Money, other).
- CSV import with column mapping, validation, duplicate review, preview, and explicit commit.
- Dashboard with recorded balance/activity summaries, as-of context, and data coverage cues.
- Basic budgets/obligations and irregular-income-aware cash-flow planning.
- Future Self Simulator with deterministic “what if” scenarios and transparent assumptions.
- Financial Early-Warning System based on explainable deterministic rules and adequate data coverage.
- Optional, consented AI explanations through a cloud API with deterministic fallback.
- Free and premium plan framework; exact package and price are subject to validation.
- Privacy settings, consent revocation, data export, and account deletion request flow.

### Explicitly out of MVP

- Direct bank or Mobile Money account connection or transaction synchronization.
- Initiating payments, transfers, savings deposits, or financial products.
- Credit scoring, loan recommendations, investment advice, tax filing, or accounting certification.
- Automated bill detection or creditor data feeds.
- Guaranteed forecasting, fraud detection, or financial-health diagnosis.
- Shared household accounts, minors, advisor dashboards, or business-team workspaces.
- Ghanaian-language localization beyond English (Ghana), until research and translation are completed.

## 7. Core journeys

### Journey A: First useful picture

1. User sees Safey’s purpose and limitations, confirms 18+ eligibility, and chooses/accepts GHS and Ghana timezone defaults.
2. User reviews privacy information. AI processing consent is separate and optional.
3. User creates a source (e.g. cash or manually tracked Mobile Money) and enters opening balance or initial transactions.
4. Home shows recorded amounts, coverage/as-of date, and one clear next action.
5. User can edit incorrect entries and continue without turning on AI.

### Journey B: CSV import

1. User selects a CSV and sees supported format/size guidance.
2. Safey parses a preview and asks the user to map date, description, amount, direction, currency, source, and category fields.
3. Safey reports valid, duplicate, and invalid rows, with examples and repair options.
4. User confirms exactly which valid rows to import.
5. Safey commits idempotently and presents a summary; user can inspect/edit imported records.

### Journey C: Explore a future scenario

1. User chooses a template such as delayed income, a one-off cost, or a weekly savings amount.
2. User enters or adjusts values and date assumptions.
3. Safey calculates baseline and scenario using the deterministic engine.
4. Results show range/uncertainty, time horizon, data coverage, and editable assumptions.
5. User saves, adjusts, or deletes the scenario. No external action is taken.

### Journey D: Respond to an early warning

1. Safey detects a rule-based signal from user records and obligations when coverage is sufficient.
2. The insight states the observed pattern, period, data basis, and uncertainty.
3. User opens “Why am I seeing this?”, edits source records, dismisses/snoozes, or considers a suggested planning action.
4. The system recalculates from corrected records; no credit, fraud, or eligibility decision is made.

## 8. Functional requirements

Priorities: **P0** required for MVP; **P1** expected if feasible; **Later** post-MVP.

### Onboarding, account, and consent

- **P0:** Explain purpose, limitations, age 18+ eligibility, data handling, and how to use manual entry before requesting financial details.
- **P0:** Allow GHS/Ghana defaults to be confirmed or changed; persist locale/timezone/currency.
- **P0:** Store consent by purpose and policy version. AI consent must be opt-in, revocable, and independent of core account use.
- **P0:** Provide sign-out and account deletion request flow. Require re-authentication/confirmation for sensitive actions.
- **P1:** Demo mode with sample data that is clearly synthetic and isolated from a real account.

### Financial records and categories

- **P0:** Create, read, update, and delete income/expense records with amount, currency, date/time, source, category, and optional note.
- **P0:** Represent amounts as GHS minor units; validate positive values, supported precision, and reasonable bounds.
- **P0:** Seed editable Ghana-relevant categories such as food/market, transport, utilities, rent/housing, health, education, family support, airtime/data, fees, savings, and income. Names and hierarchy must be user-tested; users can add categories.
- **P0:** Represent cash, manually tracked bank, manually tracked Mobile Money, and other sources without implying connectivity.
- **P0:** Label balances and summaries as based on recorded data and show an as-of date.
- **P1:** Search, filters, recurring user-entered transactions, and bulk edits.

### CSV import

- **P0:** Support documented CSV encoding, size, and row limits. Show field mapping and date/amount format interpretation.
- **P0:** Preview and validate without writing records. Detect likely duplicates using a disclosed heuristic and user confirmation.
- **P0:** Never execute formulas/macros; safely escape data in exports and rendered views.
- **P0:** Commit only user-confirmed valid rows; prevent accidental duplicate commits; report failures and allow recovery.
- **P1:** Save a mapping profile locally or in the user account with explicit control.

### Dashboard and planning

- **P0:** Summarize recorded inflows/outflows and entered balances by selected period/source; show missing-data caveats.
- **P0:** Allow user-entered upcoming obligations with date, amount, and recurrence where applicable.
- **P0:** Support irregular income without requiring a monthly salary or regular pay date.
- **P0:** Simulator templates: delayed income, one-off expense, recurring savings amount, and custom change. Show baseline vs. scenario, assumptions, horizon, and engine version.
- **P0:** All calculations are deterministic and reproducible; AI cannot supply/alter numeric results.
- **P1:** Scenario comparison and saved scenario history.

### Financial Early-Warning System

- **P0:** Generate a warning only from documented deterministic rules and sufficient input coverage.
- **P0:** Each warning shows severity, time period, evidence, data limitations, and suggested next step; user can correct source records and dismiss/snooze.
- **P0:** Suppress or qualify signals when data is sparse or stale. Avoid sensitive-trait inference and opaque risk scores.
- **P1:** User-configurable thresholds and quiet hours for notifications.

### AI assistance

- **P0:** Only call cloud AI through a server-side gateway; require active, separate consent and user-initiated purpose.
- **P0:** Restrict AI to explain computed outputs or help phrase scenario questions. Do not expose write actions, arbitrary database access, or payment functionality.
- **P0:** Clearly identify AI-generated content, ground numerical claims in engine output, and provide deterministic fallback for unavailable service.
- **P0:** Minimize context sent; treat notes/imported text as untrusted; define provider retention/training settings before production.
- **Later:** Conversational planning beyond narrow explanation flows, after usability, privacy, quality, and cost validation.

### Freemium and privacy

- **P0:** Provide an entitlement model that can gate premium features without blocking core data export/deletion or obscuring free limits.
- **P0:** Clearly show price, billing period, trial terms, and cancellation route before purchase; no price is specified in this PRD.
- **P0:** Export user data in a documented machine-readable format and make deletion request status visible.
- **P1:** In-app privacy dashboard for consent history and data-use explanation.

## 9. MVP acceptance criteria

MVP is acceptable for a controlled release when all of the following are true:

1. A Ghana-based adult can create an account, understand the data/AI choices, and use the product without enabling AI or connecting an account.
2. GHS amounts, dates, and user-entered sources are consistently represented; no screen describes a manual record as live provider data.
3. Income and expenses can be added, corrected, categorized, filtered, and deleted with clear feedback.
4. CSV import has a non-destructive preview, mapping, validation, duplicate review, explicit commit, and recoverable errors.
5. Dashboard summaries and simulator outputs match the deterministic engine and show coverage, as-of time, and assumptions.
6. Each warning is traceable to a versioned rule and displayed evidence; sparse/stale data cannot produce an unqualified warning.
7. AI is separately consented, called only server-side, cannot mutate records, and degrades to a useful non-AI response.
8. RLS prevents cross-user access on every user-owned data table; sensitive keys are absent from the mobile bundle.
9. Users can initiate export and deletion, and the implementation documents completion behavior and backup retention limits.
10. Core journeys are usable with screen reader, enlarged text, reduced motion, and tested iOS and Android layouts.
11. Pricing and premium entitlements are disclosed before checkout; billing implementation passes current store policy review.
12. Privacy notice, terms, support process, incident runbook, and Ghana applicability review are completed before public launch.

## 10. Non-functional requirements

- **Reliability:** Core ledger and deterministic planning remain available when AI is down. Define launch SLOs after staging measurements.
- **Performance:** Dashboard and local interactions should feel responsive on representative mid-range Android and current iPhone devices; establish measurable budgets during implementation.
- **Security:** RLS, authenticated server functions, input validation, rate limiting, secure token storage, least privilege, and dependency/secret review are release gates.
- **Privacy:** Data minimization, purpose-specific consent, transparent retention, export, deletion, and vendor due diligence.
- **Accessibility:** Platform screen-reader support, dynamic text, contrast, touch targets, reduced motion, and non-color status cues.
- **Localization:** English (Ghana) MVP, GHS, `Africa/Accra`; future strings and number/date formatting must remain localizable.
- **Maintainability:** Versioned APIs, migrations, calculation rules, and typed mobile/backend contracts.

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Manual entry creates incomplete or stale data | Make coverage visible, support quick entry/import, suppress unsupported insights |
| Users mistake forecast for certainty | Show range, assumptions, date horizon, and “based on records” language |
| CSV formats vary | Mapping preview, clear constraints, recoverable row-level errors, no silent import |
| AI exposes sensitive data or invents claims | Separate consent, minimize context, server-side allowlist, deterministic grounding/fallback, vendor review |
| Early-warning false positives create anxiety | Conservative rules, user-specific evidence, dismiss/correct, measure precision and complaints |
| Ghana-specific categories miss lived reality | Co-design and test with Ghana-based users; allow custom categories |
| Premium model reduces trust | Keep core visibility/privacy controls accessible; disclose price and limits clearly |
| Future integrations are unavailable or regulated | Keep them out of MVP; validate provider access, permissions, and legal requirements before commitment |
| Data breach or account takeover | RLS verification, secure auth, least privilege, incident response, data minimization |
| Store policies or vendor terms change | Verify current policies and vendor terms before launch and each material release |

## 12. Roadmap

### Phase 0 — Discovery and validation

Interview adults with regular and irregular income in Ghana; test terminology, categories, manual-entry burden, warning usefulness, privacy comprehension, and willingness to pay. Validate legal/privacy requirements and candidate AI/vendor terms. No integration commitments.

### Phase 1 — MVP foundation

Auth, consent, profile settings, manual ledger, categories/sources, reviewed CSV import, deterministic summaries, privacy/export/delete flows, accessible core interface.

### Phase 2 — Signature planning features

Future Self Simulator, versioned early-warning rules, evidence views, notification preferences, consented AI explanations, and measured freemium entitlements.

### Phase 3 — Improve from evidence

Refine import mappings, recurring planning, localization options, optional scenario sharing/export, and premium packaging based on retention and trust data.

### Phase 4 — Evaluate integrations (conditional)

Only after user validation and provider/legal/security validation, evaluate direct bank or Mobile Money access. This is an evaluation gate, not a promised release. Ship only with explicit user authorization, supported provider coverage, revocation, and a tested fallback.

## 13. Assumptions and open decisions

- Product name is **Safey**; logo concept is a lavender shield with a four-point star cutout.
- Audience is adults 18+ in Ghana; English (Ghana), GH₵/GHS, and `Africa/Accra` are initial defaults.
- Initial data comes from manual entry and user-reviewed CSV files; there is no bank/MoMo integration in MVP.
- Proposed stack is React Native + Expo + TypeScript, Supabase/PostgreSQL/Auth/RLS/Edge Functions, deterministic finance engine, and server-side AI tool orchestration.
- AI API, privacy terms, data region/retention, analytics, crash reporting, push provider, and billing implementation must be selected and reviewed before production.
- Freemium feature split, prices, trial, and premium entitlements are not yet specified.
- Warning thresholds, category taxonomy, forecast horizon/range model, and minimum data coverage must be validated with users and documented before launch.
- No regulatory approval, provider partnership, integration coverage, or financial outcome is claimed.

