# Investor Pitch Deck (4 slides, .pptx)

Generate a polished 4-slide PowerPoint for fundraising, built from the locked MVP scope doc, using the pptxgenjs skill. Saved as a downloadable file in Files (e.g. `Adittv-Investor-Pitch.pptx`), matching the Additv mint-green brand (mint primary, dark charcoal/ink for title slides).

## Slide 1 — Cover / The Problem
- Adittv title + one-line tagline: "Self-serve hyperlocal DOOH advertising for small businesses in India"
- Problem statement: local businesses can't access DOOH — big minimum spends, sales calls, agencies, no idea what ran or who saw it
- Placeholder callout: `[TAM / market size — to fill]` and `[Founder names & contact — to fill]`

## Slide 2 — The Solution & Product Overview
- Solution: book screens near your customers in minutes, no sales call — sign up → upload creative → target pincode/radius → schedule → pay → live
- Product snapshot: 6-step campaign wizard, screen inventory across venue types (residential lobbies, elevators, clinics, cafes, malls, townships), daypart targeting, live management (pause/replace/extend/stop with wallet refunds)
- Placeholder: `[Screens live / cities covered — to fill]`

## Slide 3 — Platform Features & Business Model
- Feature grid (from locked scope): content library + human moderation, role-based team access, performance reporting (day × slot heatmap, CSV export), wallet + full payment stack (UPI/cards/netbanking/wallets, coupons, refunds)
- Business model: per-day per-screen pricing + 18% GST, wallet & promotional credits
- Phase 1 → future: cameras on screens collect anonymized viewership data, processed with AI to build audience cohorts for targeted ads and segmentation in future phases
- Placeholder: `[Pricing benchmarks / unit economics — to fill]`

## Slide 4 — Roadmap & The Ask
- Now (MVP): self-serve booking, moderation console, payments & refunds, reporting
- Next: AI audience cohorts & segmentation, camera-based analytics, screen network expansion
- Blank sections with clear headings: **Traction to date**, **Funding ask & use of funds**, **Team** — left as labeled placeholders for the user to fill

## Technical
- pptxgenjs script in /tmp, mint-green palette, strong title/section typography, visual elements on every slide (no plain bullet dumps), 16:9
- Validate with `validate_document.py --auto-repair`, render to images via LibreOffice and visually QA each slide, fix, and re-verify before delivery
