# AI Bug-Finding Audit for Additv Prototype

## Goal
Add a repeatable, AI-driven bug-finding audit to the Additv prototype so you can run it before demos or releases and get a structured report of broken flows, UI glitches, and edge cases.

## What we will build

1. **Playwright test harness** installed in the project (headless browser, no backend required).
2. **Scenario definitions** covering the main user journeys in the prototype:
   - Login & role routing (advertiser vs admin)
   - Dashboard / campaign list filters & search
   - Create campaign wizard (Details → Creative → Schedule → Screens → Preview → Payment)
   - Payment gateway with wallet/coupon/saved card flows
   - Live campaign management (pause, resume, replace creative, stop, refund)
   - Content library upload/import
   - System admin moderation queue
   - Team management & permissions
   - Reports / performance dashboard
3. **AI-driven audit script** that:
   - Runs each scenario step-by-step,
   - Captures console errors and network failures,
   - Takes screenshots at each step,
   - Flags unexpected UI states (NaN, empty lists, disabled buttons that should be enabled, error banners, etc.),
   - Outputs a Markdown report with file paths to evidence.
4. **npm script** `npm run audit` so you can rerun the audit whenever the prototype changes.

## What is out of scope
- Production-grade CI/CD gating (this is a prototype).
- Real backend or API testing (frontend only).
- Automated fixing of discovered bugs; the audit only reports them.

## Deliverables
- `tests/audit/` directory with Playwright config and scenario files.
- `tests/audit/run-audit.ts` or equivalent that executes the flows and produces `tests/audit/report.md` plus `tests/audit/screenshots/`.
- Updated `package.json` script `audit`.
- One initial report run against the current prototype state.

## Technical notes
- Keep the harness pure client-side: point the browser at `http://localhost:8080` while `npm run dev` is running.
- Use the seeded demo accounts from `src/lib/auth-context.tsx` (`advertiser@demo.com / Demo@1234`, `admin@adittv.com / Admin@1234`).
- For deterministic payment outcomes, use the documented demo inputs (`success@demo`, `4111111111111111`, etc.).
- The audit will be read-only to the codebase; it will not change app logic.
