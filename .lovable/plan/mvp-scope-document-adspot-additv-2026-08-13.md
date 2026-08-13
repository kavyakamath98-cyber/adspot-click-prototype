# MVP Scope Document — AdSpot / Additv

Produce a locked, single-source-of-truth scope document derived from the current prototype: every capability that exists today, every capability explicitly out of scope, plus testable acceptance criteria per feature.

## Deliverables

1. `docs/MVP-SCOPE.md` — versioned in the repo, full document in Markdown.
2. A downloadable formatted copy (DOCX) written to the documents area, generated from the same content so both stay identical.

No application code, routes, components or mock data change.

## Document structure

1. **Purpose and status** — what the document locks, version, date, how changes are handled (change-request only after lock).
2. **Product summary** — self-serve hyperlocal DOOH booking for small businesses in India; prototype is client-side with mock data.
3. **Personas and roles** — Advertiser Admin, Advertiser User (per-campaign read/write), Platform Moderator (system admin).
4. **Module-by-module scope.** Each module has three blocks: *Supported*, *Not supported (MVP)*, *Acceptance criteria* (numbered, testable, in Given/When/Then-style plain sentences).

   Modules to cover, matching what exists in the prototype:
   - Authentication and accounts — signup (single vs separate structure), login, forgot/reset password, seeded demo accounts, session persistence, route guards, moderator routing.
   - Team and permissions — member invite with campaign permission matrix, role change, remove, resend invite, ownership transfer, read-only enforcement on write actions.
   - Home / dashboard — KPI summary, search, status filters, list paging.
   - Campaign creation wizard — Details, Creative, Schedule, Screens, Preview, Payment; draft save/resume; earliest start date rules.
   - Creative management and content library — upload, import from URL, format/size/duration checks, industry/sub-industry taxonomy, restricted sub-industry handling, statuses and reviewer feedback.
   - Scheduling and availability — date range, days of week, five day-part slots, per-screen availability (available / partially / fully booked), free-slot popover.
   - Screen inventory and targeting — pincode + radius, location tag / venue type / dimension filters, multi-select with live totals.
   - Pricing, wallet and payments — budget computation, GST at 18%, simulated checkout (UPI, card, netbanking, wallet), deterministic demo inputs, demo controls, session countdown, transaction history, receipts.
   - Campaign lifecycle — pending approval, deferred payment unlock, live, pause (duration + reason), resume modes, extend, stop, cancel.
   - Refunds — refund estimate, wallet vs bank destination, bank details capture, refund IDs, linkage to original payment ID.
   - Moderation console — queue and filters, review detail with campaign/account context, approve/reject with standard reasons and notes, bulk actions, review history, advertiser-side visibility of decisions.
   - Reporting — KPI row with deltas, trends, impressions by day of week and by slot, 7x6 heatmap with drag selection, creative breakdown, CSV export.

5. **Cross-cutting scope** — supported browsers/viewports, responsive behaviour, accessibility level, copy language (English), currency and locale (INR, en-IN).
6. **Explicitly out of scope for MVP** — consolidated list: real backend/database, real payment gateway and settlement, real screen/player integration and proof-of-play, actual media transcoding, email/SMS delivery, invoicing/tax filing, GST-compliant statutory documents, third-party auth/SSO, audit log persistence, multi-currency, multi-language, mobile apps, real-time inventory sync, programmatic/RTB, AI creative generation.
7. **Known prototype-only simulations** — table mapping each simulated behaviour (approval timer, availability seeding, payment outcomes, analytics data) to what production would need.
8. **Assumptions and dependencies** — inventory data source, moderation SLA (24–48 hours), pricing model, refund policy inputs required from business.
9. **Sign-off block** — role, name, date columns.

## Technical notes

- Content is derived by reading the current source (routes, `src/lib/mockData.ts`, `src/lib/app-context.tsx`, `src/lib/auth-context.tsx`, `src/lib/payments.ts`, `src/data/industryTaxonomy.ts`) so every "Supported" line reflects real behaviour, and concrete constants (slot times, GST rate, refund destinations, rejection reasons, demo credentials) are quoted exactly.
- DOCX generated with the `docx` library, US Letter, Arial, styled headings, and tables for the supported/not-supported matrices; rendered to images and visually checked before delivery.
