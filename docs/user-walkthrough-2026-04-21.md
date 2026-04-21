# User-Walkthrough Report — 2026-04-21

Scope: live end-user walkthrough of `https://boiler-brain-ai.netlify.app/` driven through Claude in Chrome. Goal was to complement Windsurf's code-level audit with a "what actually happens when you use the thing" view. The app was walked as an engineer would: Diagnose chat → Manuals → CP12 → Tools → Flue Gas Analyser → mobile viewport → PWA/offline.

This report is organised by severity: launch blockers first, then UX bugs, then polish. Every item below was observed live, not inferred from code.

---

## Launch blockers

### 1. Chat has no retrieval — the RAG value prop is false

Asked three progressively specific questions about fault code EA 227 on a Worcester Greenstar 30CDi:

1. "What does EA 227 mean on a Worcester Greenstar 30CDi?"
2. "Quote the exact sentence from the installation manual."
3. "What page of the installation manual is it on?"

Q2 returned a fabricated "flame not detected" quote attributed to the Worcester manual. Q3 said "towards the back of the manual". No visible citation, no chunk ID, no source card, no network call to a retrieval endpoint in the trace.

Fix priority: blocker. Wire `/api/chat` to `manual_content_chunks` retrieval (page_number present), enforce "no chunks → skip LLM", render source cards with manual name + page number.

### 2. Download button in Manuals is silently broken

Click fires `fetch(manufacturerUrl)` and discards the response. No `window.open`, no blob, no toast. Verified by intercepting `window.fetch` + `window.open` at runtime — exactly one fetch, zero opens. The backing Express route `server/routes/manualRoute.js:147` is dead code.

### 3. Preview opens dead manufacturer URLs

First Worcester manual tested (`8716121937/47447`) returns the manufacturer's "Oops!" page. URLs in the DB rot frequently.

### 4. CP12 per-step validation is completely missing

Clicking Next on any CP12 step advances without validating. Every step shows green ✓. All 12 required-field errors pile up at the final "Preview & Generate PDF" modal.

### 5. CP12 allows 0-appliance certificates to be attempted

Appliances step shows `0/10` as valid by default. Full form traversal with zero appliances lets you reach the final modal.

---

## UX / bug report (non-blocking but important)

- **Bottom navigation highlights two tabs simultaneously** — Diagnose is always styled as if active because `MobileNavigation.jsx:121-146` renders an always-visible blue-pill hero treatment; active/inactive differ only by a 1px translateY and slightly darker gradient. Fix is visual, not a route matcher.
- **"6-step flow" copy contradicts landing card** — copy says "6-step flow" but card numbers 3.
- **"1GassApp" appears three times on home header** — logo, centred title, greeting card.
- **Stats inconsistencies** — Home says "20+ Brands", Manual Finder says "60+ Brands". Drive both from `SELECT COUNT(DISTINCT manufacturer)`.
- **"Found 200 manuals"** — unclear whether 200 is the real count or a limit cap.
- **Flue Gas Analyser sample shows "Invalid Date" and "Test: unknown"** — fix fixture.
- **Flue Gas "Within safe limits" banner is pale-green on pale-green** — WCAG AA contrast failure.
- **Tools subpage doesn't highlight Tools tab** — `/tools/flue-gas` leaves Tools un-highlighted.
- **Next/Previous buttons hide behind the sticky bottom nav** on short CP12 steps — missing bottom padding.
- **No offline indicator** — Workbox precache works but no UI affordance for offline state.
- **Inter font loaded from Google Fonts** — returned 503 once during the session. Self-host.

---

## Things that work well

- Manual search is fast. Clicking "Worcester" chip fires `/functions/v1/manuals?manufacturer=worcester&limit=20&offset=0..180` pagination cleanly, 200 results returned.
- CP12 final-step validation modal (when it runs) is comprehensive with 12 well-worded error strings.
- Flue Gas Analyser surface is strong — three input methods, export instructions for Kane / TPI / Anton Sprint, Testo compatibility. Once "Invalid Date" is fixed this is a selling-point feature.
- Home dashboard reflows cleanly down to 614×669. Calculators & Tools grid handles viewport changes.
- PWA manifest correct: 10 icons, `display: standalone`, valid `start_url`, `viewport-fit: cover`.
- Zero app-side console errors across the walkthrough.

---

## Testing limitations

- Chrome desktop (1400×900) and Chrome-minimum mobile (614×669) only. True 375×812 iPhone viewport not tested.
- Did not complete a real CP12 PDF generation.
- Did not test Bluetooth pairing or real analyser CSV import.
- Did not walk admin-only surfaces (PIN bypass grants the admin tab, known issue).

---

## Suggested ordering for Windsurf

1. Chat retrieval + citations (core value prop).
2. Manuals Download button + dead-URL check.
3. CP12 per-step validation.
4. Bottom-nav active-route matcher + label legibility.
5. Polish batch.

---

*End of report.*
