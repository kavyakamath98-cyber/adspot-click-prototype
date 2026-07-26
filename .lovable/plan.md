# Plan: UX refinements across shell, dashboard, and wizard

## 1. Shell — replace hamburger with sidebar nav
- Wrap the app in shadcn `SidebarProvider` inside `src/components/AppShell.tsx`.
- New `AppSidebar` component with `collapsible="icon"`:
  - Items: Dashboard (`/`), Content Library (`/library`), Create Campaign (`/campaigns/new`).
  - Active state via `useRouterState` pathname.
  - Footer: profile block (Ramesh's Kitchen) with a "Sign out" item (keeps existing mock toast).
- Header changes: remove Dashboard/Library links and the hamburger dropdown. Keep only `SidebarTrigger` (left), wallet chip, and profile avatar (right). Remove the header "Create Campaign" button (per answer, hero CTA is the single primary).

## 2. Dashboard — equal-height cards + hero CTA
- In `src/routes/index.tsx` change the campaign grid item wrapper to `h-full flex flex-col` and make the `<Card>` `h-full` so all cards in a row match the tallest sibling. Rejection reason sits at the bottom via `mt-auto`.
- Confirm "Start a New Ad" in the welcome banner remains the sole prominent CTA.

## 3. Adjust Schedule modal — start-date validation
- In `src/routes/campaigns.$id.tsx` adjust-schedule dialog:
  - If `campaign.status === "live"` AND current `startDate <= today`, disable the start-date input (read-only) and show helper text: "Campaign has already started — start date can no longer be changed."
  - End-date min becomes `max(today+1, originalStart+1)`.
  - Keep editable start date for `approved_scheduled`/`draft`/`paused` where original start is still in the future.

## 4. Create Campaign wizard — creative step
File: `src/routes/campaigns.new.tsx` (Step 2 = creative selection).
- **Filters**: add a filter row above the creative grid — Industry multi-select (combobox) + Usage toggle (All / In Use / Unused) + search input. Client-side filter on the library array.
- **Infinite scroll**: `IntersectionObserver` sentinel, PAGE=12, reset on filter change (same pattern as dashboard).
- **"+" tile**: first grid cell is a dashed `+ Add creative` tile. Clicking opens the existing `AddCreativeDialog` from the library page — extract it to `src/components/AddCreativeDialog.tsx` so both routes reuse it. No navigation.
- **Sync + draft state**: on dialog submit inside the wizard, the new creative is appended to library (existing context does this) AND auto-selected in the wizard. If the user pays/submits while any selected creative is still pending brand-safety, the campaign is created with `status: "draft"` with a note "Awaiting creative approval". Add `pendingCreativeApproval` check in the submit handler.
- **Playtime input**: replace slider with a `Select` dropdown. Options: Image → 3s/5s/7s/10s (default 5s). Video → 10s/15s/20s/25s/30s (default 15s). Same field label, simpler control.

## 5. Wizard — screen selection step (Step 3)
Scale screen-type UI to many categories:
- Replace colored `LocationTagBadge` with a neutral text-only pill (single muted style) on each screen card.
- Add a searchable multi-select **combobox filter** ("Filter by location type") above the screen list, alongside the existing sort/pagination controls. Uses shadcn `Command` inside `Popover`. Selecting types AND-filters the list; empty = all.
- Keep the current colored badge component for legacy uses on the dashboard/detail page (unchanged there), but the wizard uses the neutral variant.

## 6. Wizard — preview step (Step 4)
- Compute unique `{width}x{height}` combinations from `selectedScreens` (dedupe by dimension key).
- Render one preview tile per unique dimension, labeled with the dimension and the count of matching selected screens ("1080×1920 · 3 screens").
- Keep fit/fill/stretch toggle applied to all tiles.
- If more than 6 unique dims (unlikely), cap at 6 with a "+N more" note.

## 7. Out of scope this turn
- No changes to color tokens, typography, mock data, or backend logic.
- Detail-page reporting/screens sections unchanged (previous turn's work stands).

## Technical notes
- New files: `src/components/AppSidebar.tsx`, `src/components/AddCreativeDialog.tsx`.
- Edits: `AppShell.tsx`, `routes/index.tsx`, `routes/library.tsx` (use extracted dialog), `routes/campaigns.new.tsx`, `routes/campaigns.$id.tsx`.
- Sidebar width uses `w-[var(--sidebar-width)]` syntax per Tailwind v4 note. `SidebarProvider` wraps the app; parent div uses `w-full min-h-screen flex`.
- Draft-on-pending logic: check `selectedCreativeIds.some(id => library.find(c=>c.id===id)?.status === "pending")` at submit and pass `initialStatus: "draft"` into `createCampaign`.
