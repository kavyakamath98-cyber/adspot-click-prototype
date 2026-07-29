# Schedule-driven screen availability

Today the wizard treats each screen's availability as a fixed label (`available` / `partial` / `booked`) baked into mock data, and the schedule is picked in Step 5 — after screens are chosen. So availability has nothing to do with the dates the user wants. This plan makes dates the driver.

## New step order

```text
1. Campaign name + location & radius
2. Pick a creative + playtime
3. Schedule  <- dates, recurrence, location-type filter, dimension filter
4. Screens   <- only screens with availability in those dates
5. Preview
6. Review & pay
```

Schedule moves ahead of screen selection. The location-type and screen-dimension filters move onto the schedule step, so by the time the user reaches screens they have already told us where, what size, and when — and the screen list is simply "here is what is free".

## Availability becomes date-based

Each mock screen gets a small set of existing bookings (date ranges). Against the user's chosen start/end date a screen resolves to:

- **Available** — no overlap with existing bookings.
- **Partially available** — free on some of the chosen days only. Selectable, with a note that the ad runs on the free days.
- **Fully booked** — no free days in the window. Shown greyed out and not selectable.

The screen step shows a summary line such as "28 of 41 screens are free for 12–20 Aug".

## Info icon on booked / partly booked screens

Every screen that is not fully free gets a small info icon next to its status. Clicking it opens a popover listing that screen's free slots inside a sensible window (the chosen dates plus the following few weeks), e.g.

```text
Free 12–14 Aug
Booked 15–18 Aug
Free 19–31 Aug
```

so the user can adjust their dates rather than hitting a dead end.

## Other adjustments that follow

- Changing dates after screens are selected re-checks the selection and drops any screen that is now fully booked, with a toast explaining it.
- Cost still uses days x screens x price/day; partially available screens are priced on their free days only.
- The 48-hour review buffer for brand-new creatives still applies to the earliest start date, now enforced one step earlier.
- Draft save/resume keeps working with the new step numbering.

## Technical notes

- `src/lib/mockData.ts`: add `bookings: { start: string; end: string }[]` to `Screen` (deterministic, seeded per screen); add helpers `availabilityIn(screen, start, end)` and `freeSlots(screen, from, to)`. The static `availability` field is derived from these instead of hardcoded.
- `src/routes/campaigns.new.tsx`: swap `Step3` (screens) and `Step5` (schedule) in the step map and `STEP_LABELS`; move the location-tag and dimension filter controls from the screen step into the schedule step and lift that filter state into the wizard; pass `startDate`/`endDate` into the screen step; gate `canReachStep` so screens require valid dates.
- Screen rows use a shadcn `Popover` with an info trigger for the slot breakdown; fully booked rows stay disabled.
- No backend, no schema, no new dependencies — mock data and presentation only.
