## Changes

### 1. AddCreativeDialog — constrain height

`src/components/AddCreativeDialog.tsx`: change `DialogContent` from `max-w-lg` to `max-w-lg max-h-[85vh] overflow-y-auto` so the dialog is a clearly bounded modal, not a full-height sheet. Body content scrolls inside if needed; header/footer stay visible via existing shadcn layout.

### 2. Save as Draft — no redirect

`src/routes/campaigns.new.tsx`: in the Save-as-Draft handler, remove the `navigate({ to: "/" })` (or `/campaigns`) call. Keep the existing `toast.success("Draft saved")`. User stays on the wizard step they were on.

### 3. Pick a Creative (Wizard Step 2) — better search/filter UX

In `src/routes/campaigns.new.tsx` Step 2 header row:

- Layout: `Search input (narrower, ~w-64)` — gap — pushed right: `Industry` multi-select filter + `Usage` filter, each as a labeled dropdown/popover (shadcn `Select` or `DropdownMenu` with checkboxes).
- Add a small section heading **"Your creatives"** above the grid so users understand what they're picking from.
- Rename the current "In use / All / Unused" segmented control to a proper **Usage** filter with clearer labels:
  - **All creatives** (default)
  - **In use in a live campaign**
  - **Not currently used**
  Each option gets a one-line helper in the dropdown so it's obvious what it means.
- Keep the "+" tile and industry chips on cards unchanged.
- Empty-state copy updates to reference active filters ("No creatives match these filters").

### 4. Screen dimensions — data + filter

Two parts:

**a. Mock data.** In `src/lib/mockData.ts`, normalize every screen's `width`/`height` so each screen uses one of these five presets:

| Preset | W×H |
|---|---|
| 1920×1080 (Full HD landscape) | 1920×1080 |
| 1080×1920 (Full HD portrait) | 1080×1920 |
| 16:9 (generic landscape) | 1280×720 |
| 9:16 (generic portrait) | 720×1280 |
| 300×250 (MPU) | 300×250 |

Distribute across existing ~50 screens so all 5 presets are represented. Keep every other field (location, tag, pricing) intact. Update the Step 4 preview simulator list to render these same 5 presets.

**b. Filter on Screen Selection (Step 3).** Add a **Dimensions** multi-select filter next to the existing location-tag filter, listing the same 5 presets with counts. Selecting one or more filters the screen list. Preset label shown on each screen card as a small pill (e.g., `1920×1080`).

## Out of scope

- No color/typography changes.
- No changes to Home, sidebar, campaign detail, reports, payments, or library beyond items above.
- No changes to pricing logic even though dimensions shift; existing per-screen prices stay as authored.
