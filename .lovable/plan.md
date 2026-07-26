You're right — both earlier changes regressed. `CAMPAIGN_ITEMS` currently reads Create → Performance → View, and `AppShell` still has no `title`/`back` props (it just renders a `SidebarTrigger`, wallet, and profile in the header, so every route prints its heading in the page body instead).

## Changes

### 1. Sidebar order (`src/components/AppSidebar.tsx`)
Reorder `CAMPAIGN_ITEMS` to:
1. Create Campaign
2. View Campaigns
3. Campaign Performance

### 2. Page header in top bar (`src/components/AppShell.tsx`)
Extend `AppShell` props:
```
AppShell({ children, title?, back? }: { children, title?: string, back?: { to: string; label?: string } })
```
Header layout becomes:
`[SidebarTrigger] [← back (if any)] [Title] [flex spacer] [Wallet] [Profile]`

- Back is an icon-only ghost `Button` using `<Link to={back.to}>` with `ArrowLeft`, tooltip = `back.label ?? "Back"`.
- Title renders as `<h1 className="text-base font-semibold truncate">` next to the trigger.
- If neither `title` nor `back` is set, header looks exactly as today.

### 3. Wire titles/back on each route
Remove the in-body page heading (and its container spacing) from each route and pass it into `AppShell` instead:

| Route | title | back |
|---|---|---|
| `/` (index) | "Home" | — |
| `/campaigns` | "Your Campaigns" | — |
| `/campaigns/new` | "Create Campaign" | `{ to: "/campaigns" }` |
| `/campaigns/$id` | campaign name | `{ to: "/campaigns" }` |
| `/library` | "Content Library" | — |
| `/reports/performance` | "Campaign Performance" | — |
| `/payments/methods` | "Payment Methods" | — |
| `/payments/transactions` | "Transaction History" | — |

Any existing inline back-buttons on these pages get removed so the back action lives only in the header.

Home stays the default landing route (already `/`), no router change needed.

No color, typography, or business-logic changes.
