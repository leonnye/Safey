# Safey — Product Design System

**Status:** Implementation-ready design direction (v1)  
**Audience:** Product design, mobile engineering, content design  
**Platform:** iOS and Android, React Native + Expo  
**Market:** Ghana first; adults aged 18+

## 1. Product design intent

Safey helps people feel more in control of money when income is irregular. The interface should turn financial uncertainty into a few clear, useful next steps. It should feel calm, discreet, capable, and locally grounded—not like a bank, trading terminal, or game.

The signature experiences are the **Future Self Simulator**, which models user-selected scenarios using deterministic calculations, and the **Financial Early-Warning System**, which surfaces explainable signs of possible cash-flow pressure. The product must never imply that a forecast is guaranteed.

### Design principles

1. **Clarity before cleverness.** Show the amount, period, and basis of every number.
2. **Respect irregularity.** Do not assume a monthly salary or penalize a user for a quiet week.
3. **Control stays with the person.** Explain data use, ask before optional processing, and make sensitive actions reversible where possible.
4. **Make uncertainty visible.** Distinguish recorded facts, estimates, and scenario outputs.
5. **Encourage without shame.** Use neutral language; avoid blame, streaks, fear, and pressure.
6. **Local by default.** Use GH₵, GHS, Africa/Accra dates, and categories that make sense in Ghana. Do not assume any particular bank or Mobile Money provider is connected.

## 2. Brand identity

### Logo

The Safey mark is a **lavender shield with a four-point star cutout**. The shield communicates protection and steadiness; the star signals insight and possibility. Keep the star as negative space where practical, retain legibility at small sizes, and never add a keyhole, lock, currency symbol, or provider mark that changes the concept. Use the standalone mark for app icons and compact navigation; pair with the Safey wordmark on onboarding and marketing surfaces. Provide monochrome and high-contrast variants.

### Visual direction

Use a premium near-black foundation, dark-violet surfaces, and restrained lavender light. Frosted-glass effects are accents for elevated cards and overlays, not a default treatment. Safey should take inspiration from the mood of the Kept reference without reusing its layouts, typography, illustrations, copy, or distinctive component styling. Keep surfaces legible under reduced transparency and on lower-end devices.

## 3. Design tokens

Tokens are semantic; components should consume semantic aliases rather than hard-coded colors. Values below are initial design values and should be tuned in device prototypes.

### Color

| Token | Value | Use |
|---|---|---|
| `color.canvas` | `#09080F` | Main app background |
| `color.surface` | `#11101A` | Primary cards and sheets |
| `color.surface.raised` | `#191725` | Elevated cards, menus |
| `color.surface.glass` | `rgba(32, 27, 48, 0.78)` | Select overlays only |
| `color.border.subtle` | `#2A2638` | Dividers and card outlines |
| `color.text.primary` | `#F6F3FC` | Main text |
| `color.text.secondary` | `#B8B2C8` | Supporting text |
| `color.text.muted` | `#8E879F` | Metadata; never essential content alone |
| `color.brand.lavender` | `#B9A3FF` | Primary action, focus, key highlights |
| `color.brand.lavender.deep` | `#8E71E8` | Pressed states and gradient anchor |
| `color.brand.violet` | `#5E46A8` | Supporting brand accent |
| `color.success` | `#73D6AE` | Positive status; pair with label/icon |
| `color.warning` | `#F4C46B` | Attention; pair with label/icon |
| `color.danger` | `#FF858D` | Urgent status; pair with label/icon |
| `color.info` | `#91B9FF` | Informational status |
| `color.overlay.scrim` | `rgba(4, 3, 8, 0.68)` | Modal backdrop |

Never encode meaning by color alone. Test text and controls for WCAG 2.2 AA contrast; the muted token is for nonessential metadata and must not carry critical information. Provide a high-contrast mode and respect system contrast preferences.

### Typography

Use **Inter** (or a metrically compatible, bundled sans-serif if licensing or device constraints require it). Use tabular numerals for money values. Avoid thin weights for financial figures.

| Token | Size / line height | Weight | Typical use |
|---|---:|---:|---|
| `type.display` | 32 / 38 pt | 650 | Welcome and simulator headline |
| `type.heading1` | 26 / 32 pt | 650 | Screen title |
| `type.heading2` | 20 / 26 pt | 600 | Section title |
| `type.heading3` | 17 / 23 pt | 600 | Card title |
| `type.body` | 16 / 24 pt | 400 | Default body and form controls |
| `type.body.emphasis` | 16 / 24 pt | 600 | Emphasized body |
| `type.body.small` | 14 / 20 pt | 400 | Supporting explanation |
| `type.caption` | 12 / 16 pt | 500 | Metadata and labels |
| `type.money.large` | 36 / 42 pt | 650 | Primary balance or forecast |

Support dynamic type/font scaling. Long monetary values should wrap or scale within documented bounds, never truncate cents or currency context silently. Prefer `GH₵ 1,250.00` for display and store ISO currency code `GHS`; use consistent locale formatting and document whether decimals are shown.

### Layout, shape, and motion

| Token | Value |
|---|---:|
| `space.1` … `space.8` | 4, 8, 12, 16, 20, 24, 32, 40 pt |
| `radius.small` | 10 pt |
| `radius.control` | 14 pt |
| `radius.card` | 20 pt |
| `radius.sheet` | 28 pt |
| `radius.pill` | 999 pt |
| `stroke.default` | 1 pt |
| `tap.minimum` | 44 × 44 pt (iOS) / 48 × 48 dp target (Android) |
| `elevation.card` | Low, diffuse shadow; avoid hard black drop shadows |

Use 16–20 pt screen gutters on phones, a 4 pt spacing grid, and safe-area-aware layouts. Motion is purposeful and brief: 160–240 ms for state changes, 250–350 ms for sheet transitions. Respect Reduce Motion; never animate a warning in a way that feels alarming. Lavender glow may be used behind the primary focus point at low opacity, not beneath dense text.

### Data visualization

Use a consistent palette across charts: actual/recorded = lavender, scenario = blue-violet dashed, threshold = amber, urgent = coral. Always include labels, units, a textual summary, and an accessible data alternative. Use direct labels or legends; do not rely on color or hover. Keep chart axes honest (no misleading truncated scales without clear disclosure). Use patterns or line styles to distinguish series.

## 4. Component guidance

- **Primary button:** Filled lavender, dark text only if contrast passes; otherwise near-black text tested against the token. One dominant action per screen. Include loading, disabled, pressed, and focus states.
- **Secondary button:** Transparent surface with visible border; tertiary actions are text buttons with generous hit areas.
- **Money field:** Numeric keypad, explicit currency label, clear/edit affordance, optional decimal handling, and helper text for whether value is a balance, inflow, or outflow. Never infer currency from device locale without a user-visible confirmation.
- **Account/source card:** User-defined source label and type (cash, bank, Mobile Money, other); show connection status only if a real authorized integration exists. Initial MVP labels are manual records, not connected accounts.
- **Transaction row:** Amount sign and semantic label, merchant/note if entered, category, date, and source. Offer edit/delete and undo where practical.
- **Insight card:** Severity label + icon, short observation, time window/data basis, one recommended next step, and “Why am I seeing this?” details. Include dismiss/snooze where appropriate; a dismissed insight must not silently recur without a meaningful state change.
- **Forecast chart/card:** Actuals, assumptions, forecast range, and scenario controls clearly separated. State last-updated time and missing-data caveat.
- **Glass card:** Use on a raised layer only, with a solid fallback and adequate contrast. Do not put dense forms or small legal text over translucent backgrounds.
- **Navigation:** Bottom tabs: **Home**, **Activity**, **Plan**, **Insights**, **Profile**. Keep tab names visible and support screen-reader labels.
- **Feedback:** Inline validation, skeleton loading, empty states, retry, and offline/save status. Avoid toast-only delivery for critical financial changes.

## 5. Screen guidance

### Onboarding and consent

Explain Safey in plain language, establish Ghana/GHS defaults with an editable choice, collect age eligibility confirmation (18+), and show privacy/AI explanations before collecting financial data. Allow a user to explore a demo without entering real transactions. Explain that estimates depend on records provided. Obtain consent before cloud AI processing; do not bundle optional AI consent with account creation. Do not request bank/MoMo credentials in the MVP.

### Home

Show a compact “Where you stand” summary: available balance based on user-entered records, next known obligations, and recent trend. Label the as-of date and any incompleteness. Provide a clear add-income/add-expense action. Show one prioritized warning or simulator prompt, not a wall of cards. Never describe manually entered balance as a live account balance.

### Activity

List income and expenses with filters, categories, and source. CSV import includes a review/mapping step, duplicate preview, and confirmation before saving. Import errors must be recoverable without losing the original file or already-confirmed rows.

### Plan and Future Self Simulator

Offer understandable scenario inputs such as “income arrives later,” “save GH₵ X per week,” or “one-off expense.” Display the baseline and scenario side by side, the assumptions used, a time horizon, and a range where uncertainty exists. The simulator is educational planning support, not a promise or personalized investment recommendation. Make reset and edit controls obvious.

### Insights and Financial Early-Warning System

Sort by urgency and recency. Explain each signal with the observed pattern, calculation window, data coverage, and suggested action. Use “may,” “based on the records you entered,” and specific dates. A warning is not a credit, health, or fraud decision. Provide a path to correct inaccurate records.

### Settings, privacy, and subscription

Expose currency/region, notification preferences, AI consent, export, account deletion, and subscription state. Clearly distinguish free from paid features and price/period before checkout. Never make cancellation or privacy controls harder to find than enrollment.

## 6. Accessibility, localization, and states

- Target WCAG 2.2 AA contrast and platform accessibility guidance; verify with assistive technology.
- Screen-reader names must include the meaning and value of each chart or financial control. Announce validation and important state changes politely.
- Support text enlargement, bold text, reduced motion, voice control, and touch targets. Do not communicate warning severity using color alone.
- MVP locale is English (Ghana); architect strings for future localization. Use Africa/Accra timezone for day boundaries and make dates explicit in imports. Preserve source currency and dates from CSV for review; normalize only after confirmation.
- Required states: first use, no data, partial data, stale data, offline, loading, import preview, invalid import, calculation unavailable, AI unavailable, permission denied, subscription unavailable, and account deletion pending/completed.

## 7. Content style

Use short, direct, nonjudgmental wording. Prefer “Your records show…” over “You spent too much.” Define terms such as “cash flow” in context. Avoid guaranteed outcomes, fear-based urgency, financial jargon, and unqualified “safe” claims. Always pair a forecast with its date range and assumptions. Distinguish **recorded**, **estimated**, and **scenario** values in labels.

## 8. Design QA checklist

- Does every financial number have currency, time context, and a source/basis?
- Can the user tell actual records from a projection at a glance?
- Can a person with irregular income use the screen without a monthly-pay assumption?
- Are warnings explainable, correctable, and free from shame?
- Does the flow still work with large text, screen reader, reduced motion, and low connectivity?
- Are import mappings and resulting changes reviewable before save?
- Is frosted glass decorative and readable rather than essential to legibility?

