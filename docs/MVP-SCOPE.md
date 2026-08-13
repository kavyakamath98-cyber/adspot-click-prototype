# AdSpot Click — MVP Scope Document

**Product:** AdSpot Click (in-app brand: Additv) — self-serve hyperlocal DOOH advertising for small businesses in India
**Version:** 1.0 (locked)
**Date:** 13 August 2026
**Status:** Locked scope — single source of truth for MVP capabilities

---

## 1. Purpose and status

This document defines exactly what the MVP of AdSpot Click supports and what it does not. It is derived from the approved clickable prototype and is the single reference for build, QA, and sign-off.

- Anything listed under **Supported** is in scope and must pass its acceptance criteria.
- Anything listed under **Not supported (MVP)** is out of scope and must not be built.
- After sign-off, changes are made only through a written change request approved by the product owner. Silent scope additions are not permitted.
- The current prototype is entirely client-side (React + Context state, mock data, no backend). Section 7 maps every simulated behaviour to what production must implement.

---

## 2. Product summary

AdSpot Click lets a small business owner book advertising on digital screens near their customers — residential lobbies, elevators, clinics, cafes, cafeterias, townships and malls — without a sales call.

The core journey is: sign up → upload creative → choose a location and radius → choose dates, days and time slots → pick screens → preview → pay → creative is moderated → campaign goes live → manage and report.

Two audiences use the platform:

- **Advertisers** — business owners and their team members.
- **Platform moderators** — Additv staff who approve or reject creatives before they run.

---

## 3. Personas and roles

| Role | Who | Access |
| --- | --- | --- |
| Advertiser Admin | Account owner (first signup) | Full access to all campaigns, wallet, payments, reports, team management |
| Advertiser User | Invited team member | Access limited to campaigns explicitly granted, with per-campaign `read` or `write` permission; no team management, no billing changes |
| Platform Moderator | Additv staff, identified by email/domain | Moderation console only; sees creatives across all advertiser accounts; cannot access advertiser campaign management |

Account structure is chosen at signup: **single** (owner works alone) or **separate** (owner plus invited team with roles).

---

## 4. Module scope

### 4.1 Authentication and accounts

**Supported**

- Email + password signup with account structure choice (single / separate roles).
- Login, logout, session persistence across page reloads.
- Forgot password → reset link token → set new password.
- Password strength rules enforced on signup and reset.
- Route guards: unauthenticated users are redirected to login; authenticated advertisers cannot open the moderation console; moderators land on the console and cannot open advertiser screens.
- Seeded demo accounts: `advertiser@demo.com / Demo@1234` (advertiser admin) and `admin@adittv.com / Admin@1234` (moderator).

**Not supported (MVP)**

- Social / SSO login, OTP or mobile-number login, two-factor authentication.
- Email verification of new accounts, real password-reset emails.
- Account deletion, account merge, multiple accounts per email.

**Acceptance criteria**

1. A new email + valid password creates an account and lands the user in the app already signed in.
2. Signing up with an email that already exists shows "An account with this email already exists" and does not create a second account.
3. Wrong email or password on login shows "Incorrect email or password" and does not create a session.
4. Requesting a reset for a known email produces a working one-time reset token; reusing the token afterwards shows an invalid/expired message.
5. Opening any private route while signed out redirects to `/login`.
6. Signing in as the moderator account lands on `/system-admin`; navigating to an advertiser route as a moderator redirects back to the console.

---

### 4.2 Team and permissions

**Supported**

- Members table listing email, role, status (Invited / Active) and date added.
- Invite user modal: email, role (Admin / User), and a per-campaign permission matrix with values `none`, `read`, `write`.
- Resend invite, change role, edit permissions, remove member, transfer ownership.
- Read-only enforcement: users without `write` on a campaign see write actions disabled with an explanatory tooltip.
- Admins bypass the permission matrix and have write access to every campaign.

**Not supported (MVP)**

- Custom roles beyond Admin / User, permission groups or templates.
- Approval workflows between team members (maker–checker).
- Real invite emails; invites are accepted through a generated token in the prototype.
- Per-module permissions (for example, "wallet only") — permissions are campaign-scoped only.

**Acceptance criteria**

1. Only an Admin can open the team page; a User attempting to open it is blocked.
2. Inviting an email already on the account shows "This person is already on your team".
3. An invited member appears immediately with status "Invited" and becomes "Active" after setting a password.
4. A User with `read` on a campaign can open it but every write control is disabled with a tooltip explaining why.
5. A User with `none` on a campaign does not see that campaign in lists.
6. Transferring ownership makes the target member Admin and is reflected on the members table immediately.

---

### 4.3 Home / dashboard

**Supported**

- Welcome banner with account name and wallet balance.
- Summary KPIs across campaigns.
- Campaign list with free-text search, status filters and incremental loading.
- Primary action to start a new campaign.

**Not supported (MVP)**

- Configurable dashboard widgets, saved views, or per-user layout.
- Cross-account or agency roll-up dashboards.

**Acceptance criteria**

1. Wallet balance shown on the dashboard always matches the wallet used at checkout.
2. Searching filters the campaign list on name as the user types.
3. Status filters combine with search; clearing both restores the full list.

---

### 4.4 Campaign creation wizard

**Supported**

- Six ordered steps: **Details & Targeting → Creative → Schedule → Screens → Preview → Payment**.
- Step 1: campaign name, location search / pincode, radius in km, map-style centre.
- Save as Draft at any point before payment; resuming a draft restores the full wizard state (targeting, creative, schedule, screens).
- Editing an existing campaign reuses the same wizard in all states (pending approval, approved/scheduled, live, paused).
- For live campaigns, "Save as draft" is removed; live controls (replace creative, adjust schedule, pause/resume, stop) are surfaced inside the edit flow.
- Deferred payment: when a campaign uses a creative that has not yet been approved, the campaign is submitted for approval first and payment is locked until approval; the wizard shows an estimated total instead of a pay action.
- Swapping to an already-approved creative unlocks payment immediately.

**Not supported (MVP)**

- Multiple creatives rotating within one campaign, A/B testing, or sequential storytelling.
- Campaign templates, duplication, or bulk campaign creation / CSV upload.
- Frequency capping, audience or demographic targeting, dayparting beyond the five fixed slots.
- Automated bid or budget optimisation.

**Acceptance criteria**

1. A draft saved after step 1 reopens on step 1 with all entered values intact and no `NaN` or "Currently Live" labels anywhere.
2. Moving forward is blocked with an inline message when a required field on the current step is missing.
3. A campaign submitted with a new (unapproved) creative is created in **Pending Approval** with payment locked.
4. Once the creative is approved, the campaign shows a payment action and the total matches the last saved estimate.
5. Changing the creative on a pending campaign back to an unapproved one re-locks payment.
6. Editing a live campaign never interrupts delivery of the currently live creative.

---

### 4.5 Creatives and content library

**Supported**

- Content library listing all creatives for the account with status: Pending, Approved, Rejected.
- Upload from device (image or video) and **Import from URL** with format, reachability/timeout and size/dimension checks.
- Client-side validation of file type, file size and dimensions against the five standard screen presets.
- Two-level classification: **Industry → Sub-Industry**, from a fixed taxonomy, using dependent searchable selects.
- Restricted sub-industries are flagged and will be rejected in review: **Alcoholic Beverages**, **Tobacco**, **Political & Election Advertising**.
- Empty-library first-run experience on the Creative step with a clear upload call to action.
- Moderation disclaimer shown on the Creative and Payment steps: new creatives take **24–48 hours** to review.
- Advertiser-visible review outcome: status, rejection reason, reviewer note and review date.
- Delete a creative from the library.

**Not supported (MVP)**

- Server-side transcoding, re-encoding, compression or auto-resizing to fit a screen.
- Creative editor, template builder, AI generation, or stock library.
- Version history per creative, or rollback to a previous version.
- Automated brand-safety scanning by machine; classification-based flags plus human review only.
- Audio, HTML5, interactive or dynamic feed-driven creatives.

**Acceptance criteria**

1. A first-time user with an empty library sees the empty state with an upload button on the Creative step, not an empty list.
2. Uploading an unsupported format or oversized file is rejected before submission, with the reason shown.
3. Import from URL rejects a URL that is unreachable, times out, or does not resolve to a supported media type.
4. Selecting a restricted sub-industry surfaces the restriction message at upload time.
5. Every creative displays exactly one status; a rejected creative shows the reason, and the reviewer's note when the reason is "Other".
6. A creative created today shows the 24–48 hour review disclaimer on both the Creative and Payment steps.

---

### 4.6 Scheduling and availability

**Supported**

- Date range selection (start and end date).
- Earliest start date is **today + 2 days** when the campaign uses a new creative, to allow for review.
- Day-of-week multi-select, limited to the days that actually occur in the chosen date range.
- Time-slot multi-select across five fixed day-parts: **6:00–9:00 AM, 9:00 AM–12:00 PM, 12:00–4:00 PM, 4:00–8:00 PM, 8:00–11:00 PM**.
- Availability is computed against the chosen dates, days and slots; each screen is shown as **Available**, **Partially booked** or **Fully booked**.
- Info icon per screen opens a popover listing the **free** slots for the selected date range.
- Duration and cost fields stay blank until both dates are chosen.

**Not supported (MVP)**

- Custom or minute-level time windows outside the five fixed slots.
- Recurring/always-on campaigns, or automatic renewal.
- Holding or reserving inventory before payment; availability is confirmed at booking.
- Timezone selection — all scheduling is India Standard Time.

**Acceptance criteria**

1. With a new creative selected, dates earlier than today + 2 days cannot be chosen.
2. Choosing a Monday-to-Wednesday range offers only Mon, Tue, Wed as selectable days.
3. Changing dates, days or slots immediately recomputes each screen's availability label.
4. A fully booked screen cannot be added to the selection.
5. The info popover lists only slots that are free for every selected date, and matches the availability label.
6. Duration and estimated cost remain blank until both start and end date are set.

---

### 4.7 Screen inventory and targeting

**Supported**

- Fixed mock inventory of **52 screens** across **7 pincodes** in Bangalore (560001, 560034, 560038, 560095) and Mumbai (400050, 400053, 400076).
- Screen attributes: venue name, venue type, location tag, city, pincode, coordinates, dimensions, price per day.
- Venue types: Residential Lobby, Elevator, Clinic, Cafeteria, Cafe, Township, Mall.
- Five standard dimension presets: 1920×1080, 1080×1920, 1280×720, 720×1280, 300×250.
- Targeting by pincode/location plus radius in km.
- Filters for location tag and dimension with **Select all / Clear all**, plus search; filters laid out on a single row.
- Multi-select screens with a live running total of screens and cost.

**Not supported (MVP)**

- Real map rendering with pan/zoom, drawing custom polygons, or drive-time targeting.
- Live inventory sync with screen operators or a supply-side platform.
- Screen photos, footfall data, audience measurement panels, or third-party verification.
- Adding, editing or onboarding screens from within the product.

**Acceptance criteria**

1. Changing the radius updates the eligible screen list without a page reload.
2. Select all / Clear all set and clear every option in that filter group.
3. The running total equals the sum of selected screens' price per day × campaign days, and updates on every change.
4. Filters, search and availability combine; clearing all filters restores the eligible list.

---

### 4.8 Pricing, wallet and payments

**Supported**

- Budget computed from selected screens × campaign days (and chosen slots), shown as a live estimate.
- **GST at 18%** shown separately from the base amount, with a clear total.
- Prepaid wallet with balance, top-up, and use of the wallet balance towards campaigns.
- Simulated checkout modal branded "AdSpot Click", with order ID (`order_XXXXXXXXXXXXXX`), base amount, GST and total.
- Payment methods: **UPI** (ID validation, QR placeholder, app shortcuts), **Card** (card-type detection, Luhn check, expiry and CVV validation), **Netbanking** (fixed list of major Indian banks), **Wallets** (Paytm, PhonePe, Amazon Pay, Mobikwik).
- 10-minute checkout session countdown; the session expires when it reaches zero.
- Outcomes after a 1.5–3 second delay: Success (payment ID issued), Failure (with reason such as insufficient funds, declined, bank not responding, timed out) or Cancelled (with confirmation).
- Deterministic demo inputs: `success@demo` and card `4111 1111 1111 1111` succeed; `failure@demo` and card `4000 0000 0000 0002` fail.
- Demo controls to force Success, Failure or Timeout.
- Transactions list with payment ID, order ID, amount, GST, method, status, timestamp and purpose; filterable.
- Printable receipt with GST breakdown.

**Not supported (MVP)**

- Any real payment gateway, real money movement, settlement or payouts.
- Saved cards, tokenisation, mandates, auto-debit, EMI, pay-later or credit lines.
- Statutory GST invoicing, GSTIN capture and validation, TDS or e-invoicing.
- Coupons, discounts, promotional credits or referral rewards.
- Multi-currency or international payment methods.

**Acceptance criteria**

1. Total always equals base amount + 18% GST, rounded consistently across the wizard, checkout, receipt and transaction list.
2. An invalid UPI ID, a card failing the Luhn check, an expired card or a wrong-length CVV blocks submission with a field-level error.
3. A successful payment issues a `pay_` payment ID, records a transaction and credits/debits the wallet correctly.
4. A failed payment records no transaction, leaves the wallet unchanged and shows a specific failure reason.
5. Cancelling requires confirmation and returns the user without charging.
6. Letting the countdown reach zero closes the session and prevents submission.
7. Demo inputs and demo controls always produce their stated outcome.
8. Every completed payment can be opened as a printable receipt showing base, GST and total.

---

### 4.9 Campaign lifecycle

**Supported**

- Statuses: **Draft, Pending Approval, Approved / Scheduled, Live, Paused, Rejected, Completed**.
- Simulated review moves a pending campaign to Approved/Scheduled or Rejected after a delay; rejection shows the reason.
- Payment unlocks only after the creative is approved (deferred payment).
- **Replace creative** on a live campaign: the currently live creative keeps running until the replacement is approved; if the replacement is rejected, the original keeps running and the rejection is surfaced.
- **Pause** with a duration (number + Days / Weeks / Months, or Indefinitely) and an optional reason; the campaign detail shows "Paused until <date>" or "Paused indefinitely" plus the reason.
- **Resume** with a choice to keep the original end date or shift the end date by the paused duration.
- **Extend** a campaign, with the incremental cost charged through checkout.
- **Stop** a live campaign with a refund estimate; **Cancel** a pending campaign with a full refund and no fee.
- Every campaign has a detail page with targeting, schedule, screens, creative, spend and history.

**Not supported (MVP)**

- Automated pacing, mid-flight optimisation or budget reallocation.
- Partial-day or per-screen pause/stop; actions apply to the whole campaign.
- Scheduled future edits (for example, "change creative next Monday").
- Proof-of-play verification or make-goods for missed plays.

**Acceptance criteria**

1. A pending campaign that is approved becomes Approved/Scheduled and exposes a payment action.
2. A rejected campaign displays the rejection reason on the list and detail views.
3. Replacing a creative on a live campaign never blanks the screen; the original creative continues until approval.
4. Pausing for "2 weeks" shows "Paused until" the date exactly 14 days ahead, along with the reason if entered.
5. Resuming with "shift end date" extends the end date by the actual paused duration; "keep end date" leaves it unchanged.
6. Cancelling a pending campaign refunds the full amount with no deduction.
7. Stopping a live campaign shows a refund estimate based on remaining unserved days before confirmation.

---

### 4.10 Refunds

**Supported**

- Refund estimate for stopped campaigns, derived from the remaining unserved portion of the campaign budget.
- Destination choice: **Credit to wallet** (instant) or **Transfer to bank account** (5–7 working days).
- Bank transfer form: account holder name, account number, IFSC and bank name, with validation; account number is stored masked.
- Refund ID (`rfnd_XXXXXXXXXXXXXX`) generated and displayed.
- Each refund references the original payment ID for traceability, and appears in the transactions history with status Completed or Processing.

**Not supported (MVP)**

- Partial or manual-amount refunds chosen by the advertiser.
- Refunds back to the original payment instrument (card/UPI reversal).
- Bank account verification (penny drop), or storing accounts for reuse.
- Dispute, chargeback or escalation workflows.

**Acceptance criteria**

1. The refund amount shown before confirmation equals the amount recorded after confirmation.
2. Wallet refunds credit the wallet immediately and show status Completed.
3. Bank refunds show status Processing with the 5–7 working days message.
4. An invalid IFSC or account number blocks submission with a field-level error.
5. Every refund record shows both its `rfnd_` ID and the original `pay_` ID.

---

### 4.11 Moderation console (platform admin)

**Supported**

- Moderator-only route `/system-admin`, entered automatically on moderator login.
- Queue of creatives across **all** advertiser accounts, with tabs for Pending / Approved / Rejected / All.
- Search by creative or advertiser, filter by industry, sort oldest / newest.
- Review detail showing: creative preview, name, type, dimensions, industry and sub-industry, advertiser account, uploader, upload date, and full review history (action, reason, note, reviewer, timestamp).
- Campaign context on the review: campaign name, target cities and pincodes, location tags, screen types, screen count and campaign dates.
- Approve, or reject with a fixed reason list — **Alcohol Promotion, Sensitive Content, Adult Content, Brand Safety, Other** — where "Other" requires a note of at least 10 characters.
- Bulk approve / bulk reject on a multi-select of the queue.
- Decisions propagate to the advertiser: campaign status, payment unlock, rejection reason and reviewer note become visible on the advertiser's library and campaign pages.

**Not supported (MVP)**

- Automated content classification, OCR, logo or nudity detection.
- Moderator roles, queues, assignment, SLA timers or escalation tiers.
- Editing or annotating a creative, requesting changes with markup.
- Appeals workflow or advertiser-initiated re-review requests (advertisers re-upload instead).
- Moderator-side reporting or productivity analytics.

**Acceptance criteria**

1. Only moderator accounts can open the console; advertisers are redirected away.
2. The Pending tab lists every unreviewed creative from every advertiser account.
3. Rejecting with "Other" is blocked until a note of 10 or more characters is entered.
4. Approving a creative unlocks payment on the linked pending campaign within the same session.
5. Rejecting a replacement creative leaves the live campaign running on its original creative.
6. Every decision appends an entry to the review history with reason, note, reviewer and timestamp.
7. Bulk actions apply to every selected creative and clear the selection afterwards.

---

### 4.12 Reporting and analytics

**Supported**

- Performance page with a KPI row (impressions, plays, spend, screens, and related metrics) including period-over-period deltas.
- Trend charts over time.
- Six analytics day-parts: **Early Morning, Morning, Afternoon, Evening, Prime Time, Late Night**.
- "Impressions by day of week" bar chart and "Impressions by slot of day" bar chart.
- 7 × 6 day × slot heatmap with drag-selection of a rectangular block.
- Every metric on the page recomputes under the active day/slot selection.
- Creative-level breakdown.
- **Export CSV** of the current view.

**Not supported (MVP)**

- Real measurement — impressions and plays are modelled, not device-reported.
- Custom report builder, scheduled email reports, or saved report views.
- Attribution, footfall lift studies, conversion tracking or ROI modelling.
- API or BI-tool access to reporting data.
- Audience demographics or third-party measurement integrations.

**Acceptance criteria**

1. Selecting a block on the heatmap updates every KPI, chart and table on the page.
2. Clearing the selection restores the unfiltered totals.
3. The CSV export contains exactly the rows and columns of the current filtered view.
4. Day-of-week and slot charts sum to the same total as the KPI row for the same selection.

---

## 5. Cross-cutting scope

**Supported**

- Latest two stable versions of Chrome, Edge and Safari, on desktop and mobile web.
- Responsive layout from 360 px mobile width up to desktop; sidebar auto-collapses on narrow viewports.
- Language: English only. Currency: INR, formatted `en-IN`. Dates displayed `en-IN`. Timezone: IST.
- Design system: Mint Green palette, Inter typeface, shadcn/ui components.
- Toast notifications for the outcome of every user action.
- Keyboard-operable forms and dialogs; visible focus states; meaningful labels on interactive controls.

**Not supported (MVP)**

- Internet Explorer or legacy browsers; native iOS/Android apps.
- Dark mode, theming or white-labelling.
- Localisation into Indian regional languages, RTL support.
- Formal WCAG 2.1 AA certification, screen-reader audit, or offline/PWA support.

---

## 6. Explicitly out of scope for MVP

The following are deliberately excluded and must not be built without an approved change request:

1. Real backend, database, or persistent multi-device storage.
2. Real payment gateway integration, settlement, payouts to screen owners, invoicing and statutory GST documents.
3. Real screen/player integration, content distribution to devices, proof-of-play logs, device health monitoring.
4. Media transcoding, hosting, CDN delivery.
5. Transactional email, SMS or WhatsApp notifications.
6. SSO, social login, OTP login, two-factor authentication.
7. Persistent audit logs and compliance/regulatory reporting.
8. Multi-currency, multi-language, and markets outside India.
9. Native mobile applications.
10. Real-time inventory synchronisation with screen operators.
11. Programmatic buying, RTB, private marketplaces or agency trading desks.
12. AI creative generation, automated creative optimisation, or automated content moderation.
13. Customer support ticketing, live chat, or in-app help desk.
14. Contracts, e-signature, credit terms or post-paid billing.

---

## 7. Prototype-only simulations and production requirements

| Behaviour in the prototype | How it is simulated today | What production must provide |
| --- | --- | --- |
| Creative approval | Timer-based auto-decision, plus manual decisions in the moderation console | Persisted moderation queue, real reviewer accounts, notification on decision, SLA tracking |
| Screen availability | Deterministic seeded bookings generated in code | Real booking ledger with atomic reservation and conflict prevention |
| Payments | Local mock gateway with generated IDs and deterministic demo inputs | Certified payment gateway, webhooks, reconciliation, refund API |
| Wallet | In-memory balance in React state | Ledgered balance with double-entry accounting and statements |
| Analytics | Deterministically generated impressions and plays | Player-reported proof-of-play ingested and aggregated |
| Auth and sessions | localStorage-backed mock auth | Server-side sessions, hashed credentials, rate limiting, password reset via email |
| Team invites | Token generated in the browser | Emailed invitation links with expiry |
| Media handling | Object URLs and remote URLs, validated client-side | Server-side upload, virus scan, validation, transcode and CDN hosting |
| Refund to bank | Status flag set locally | Payout rails, bank verification, reconciliation |

---

## 8. Assumptions and dependencies

1. Screen inventory (52 screens, 7 pincodes) is representative sample data; production inventory, pricing and availability will be supplied by the operations team.
2. Moderation SLA of 24–48 hours is a business commitment and drives the earliest start date of today + 2 days.
3. Pricing model is flat price-per-screen-per-day; any slot-based or demand-based pricing is a change request.
4. GST is applied at a flat 18% on the base amount; tax treatment must be confirmed with finance before launch.
5. Refund policy — full refund on cancelling a pending campaign, pro-rated refund on stopping a live campaign — must be confirmed by business and reflected in the terms of service.
6. Restricted categories (alcohol, tobacco, political advertising) are set by policy and may be amended only with legal sign-off.
7. Screen dimension presets are limited to the five listed; any new preset requires inventory and validation changes.

---

## 9. Sign-off

| Role | Name | Date | Signature |
| --- | --- | --- | --- |
| Product Owner | | | |
| Engineering Lead | | | |
| Design Lead | | | |
| Business / Commercial | | | |
| QA Lead | | | |

Once signed, this document is the locked MVP scope. Further changes follow the change-request process in Section 1.
