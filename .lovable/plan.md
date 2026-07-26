## 1. Sidebar — collapsible "Campaigns" group

Edit `src/components/AppSidebar.tsx`:

- Structure into two top-level sections:
  - **Campaigns** (collapsible group, default open, using shadcn `Collapsible` + `SidebarGroup`/`SidebarGroupLabel` with a chevron trigger):
    - Dashboard → `/`
    - Create Campaign → `/campaigns/new`
  - **Library** (standalone item): Content Library → `/library`
- Group stays auto-open when a child route is active. When sidebar is collapsed to icon-only, render the two campaign items as flat icon buttons (Collapsible group header hidden) so they remain reachable.
- Dashboard (`/`) remains the default landing route — no routing change needed.

## 2. Dashboard empty state (no campaigns)

Edit `src/routes/index.tsx`. Today the dashboard always renders the welcome banner + stat cards + filters + list; `EmptyState` only shows when the filtered list is empty but stats/filters still render.

New behavior when `campaigns.length === 0` (true empty account, not a filter miss):

- Hide the stat-card row and the status-filter chips + search (nothing to filter).
- Keep the welcome banner, but swap subcopy to onboarding-focused: "You haven't launched any ads yet. Let's put your business on a screen near you."
- Replace the campaigns grid with a larger, friendlier **first-run panel** containing:
  - A short 3-step "How it works" strip (Choose location → Pick creative & screens → Launch), each as an icon + one-line label.
  - Primary CTA: "Create your first campaign" → `/campaigns/new`.
  - Secondary link: "Browse your content library" → `/library` (muted, since library may also be empty; still useful entry point).
- Keep the existing filter-miss `EmptyState` (used when campaigns exist but filters return zero) unchanged.

## Out of scope

- No color/typography changes, no data model changes, no other routes touched.

## Technical notes

- Use `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible` wrapping a `SidebarGroup`; chevron rotates via `data-[state=open]` class. This is the shadcn-documented pattern for collapsible sidebar groups.
- Detect true-empty via `campaigns.length === 0` before the `useMemo` filter; branch the render early so infinite-scroll effects don't run.