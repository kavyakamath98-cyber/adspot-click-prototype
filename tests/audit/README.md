# AI Bug-Finding Audit

This directory contains a Playwright-based bug-finding audit for the Additv prototype.

## Run the audit

The dev server must be running first:

```bash
bun run dev
```

In another terminal:

```bash
npm run audit
```

This will:

1. Launch a headless browser.
2. Run the scenario suite in `scenarios.spec.ts`.
3. Capture screenshots and console errors.
4. Generate `tests/audit/results/report.md`.

## View results

- Screenshots: `tests/audit/results/screenshots/`
- JSON results: `tests/audit/results/results.json`
- Markdown report: `tests/audit/results/report.md`

## Regenerate report without re-running tests

```bash
npm run audit:report
```

## Scenarios covered

- Authentication & role routing (advertiser vs admin)
- Dashboard campaign list and search
- Create campaign wizard (all 6 steps)
- Empty content library CTA
- Live campaign detail controls
- Payment-pending campaign and wallet payment
- Transactions / payment methods pages
- Content library upload dialog
- System admin moderation queue + review modal
- Team management / invite modal
- Reporting dashboard with heatmap
