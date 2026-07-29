# Draft persistence, empty-library flow, and duration fix

Three fixes to the Create Campaign wizard, plus a way to preview the app as a brand-new advertiser without losing the existing seeded demo.

## 1. Save-as-Draft persists the full wizard state and resumes at the same step

Today `buildCampaign` already writes every wizard field (name, targeting, creative, screens, fitMode, playSec, schedule, recurrence, budget) into the campaign row, and re-opening the wizard with `?draftId=…` hydrates them from `source`. What's actually missing is the "come back to the exact step" behavior — `step` state always initializes to `1`, so a returning user lands on Step 1 even though their data is intact and mostly hidden behind the stepper.

Changes in `src/routes/campaigns.new.tsx`:

- Add `lastStep?: Step` to the `Campaign` interface in `src/lib/mockData.ts` (optional, backward compatible).
- `buildCampaign` writes `lastStep: step` on every draft save.
- On mount, when `source` is a draft: initialize `step` to `source.lastStep ?? 1` and seed `visited` with every step from 1 through that value so the user can freely move between the steps they had already reached.
- Persist `lastStep` also when the user navigates between steps while a draft exists (call `updateCampaign(draft.id, { lastStep: step })` inside `goStep`) so leaving mid-flow without hitting "Save as Draft" also remembers position.
- Verify each field the user has already entered rehydrates: `name`, `pincode`, `radius`, `locationLabel`, `centerLat/Lng`, `selectedCreativeId`, `playSec`, `selectedScreens`, `fitMode`, `startDate`, `endDate`, `recurrence`. These already read from `source` — no change needed beyond confirming behavior after the schedule change below.

## 2. Duration shows blank until real dates are chosen

Root cause: Step 5 initializes `endDate` to `today + 8 days` even on a brand-new wizard, so the summary cards render "8 days" everywhere before the user visits Schedule.

Changes in `src/routes/campaigns.new.tsx`:

- Change `startDate` and `endDate` state to `string | undefined`, defaulting to `undefined` on a fresh wizard (still hydrate from `source` for drafts/resubmits).
- `days` becomes `number | undefined` — only computed when both dates are set.
- Summary rows (Step 1 sidebar, Step 5 summary, Step 6 review) render `"—"` when `days` is undefined; cost rows render `"—"` when either `days` or screen selection is missing.
- `scheduleValid` and `meetsMinimums` treat undefined dates as invalid, so Step 5 can't be completed until the user picks both.
- The Step 5 date inputs, when empty, show the native placeholder; picking a start date auto-fills end date to `start + 7 days` (only on that first user interaction, not on mount) so the existing "minimum 3 days" nudge still works naturally.

## 3. First-time user flow (empty Content Library)

The wizard currently assumes the library has content. When it doesn't, Step 2 renders an empty grid with just the "+" tile — technically functional but not obviously the path forward, and no unapproved-content disclaimer surfaces.

Changes in `src/routes/campaigns.new.tsx` (Step 2 component):

- When `creatives.length === 0` (before any filtering), replace the grid with a dedicated empty state: a single large card explaining "You haven't uploaded any creatives yet" plus a primary "Upload your first creative" button that opens the existing `AddCreativeDialog`. Filters/search are hidden in this state.
- After upload, the new creative is auto-selected (`setSelectedCreativeId(created.id)`), matching how the "+" tile behaves today.
- Once a creative is selected and `!selectedCreative.previouslyApproved`, show a persistent inline disclaimer directly under the selected-creative card:
  > "This creative hasn't been reviewed yet. New creatives typically take 24–48 hours to get approved."
- Reuse the same disclaimer copy in Step 5 (there's already a similar note at line ~1347; align its wording to the exact string above so both steps match). It renders whenever `isNewCreative` is true.

Start-date restriction is already correct: `minStartDate` returns `today + 2 days` when `isNewCreative`, and the date input uses `min={minStartDate}`. Confirmed no change needed — the 2-day floor stays as the hard enforced bound and the 24–48h copy sits above it as user-facing communication.

Rest of the wizard (screens, preview, budget, payment, submission) is unchanged for this scenario.

## 4. Previewing both perspectives

The demo currently seeds `INITIAL_CAMPAIGNS` and `INITIAL_CREATIVES` from `mockData.ts`. To let a reviewer see the first-time-user flow without deleting the seeded demo:

- Add a "Demo mode" switcher in the profile dropdown in `AppShell.tsx`:
  - "Ramesh's Kitchen (returning advertiser)" — current seeded state.
  - "New advertiser (empty account)" — empty campaigns, empty creatives, fresh wallet at ₹25,000.
- Implement as a `mode` field in `AppProvider` (`"returning" | "new"`). On switch, reset `campaigns`/`creatives` to either the seeded arrays or empty arrays, and reset `wallet` to `25000`. Purely in-memory; no persistence needed for a prototype.
- Default mode remains `"returning"` so existing screenshots and flows are untouched.

## Technical notes

- All changes are frontend-only, no backend, no schema migrations (Campaign interface gains one optional field only).
- No color, typography, or layout tokens change.
- Files touched: `src/routes/campaigns.new.tsx`, `src/lib/mockData.ts` (add `lastStep?`), `src/lib/app-context.tsx` (add demo-mode switch), `src/components/AppShell.tsx` (profile menu entry).
