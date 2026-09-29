# Navo Live — Batch 2

Your brief: build the frontend, connect the APIs that exist, and document the ones that
don't. That's what this is.

---

## First, the honest scope picture

`nova other.txt` covers **#14 → #72 — about 50 screens.** Add the first document and it's
~60. That is not one delivery; building it properly is weeks of work. So this batch is:

1. **`API-SPEC.md` — the complete specification for all of #14–#72.** Every screen mapped
   to the API it needs, marked ✅ exists / 🟡 partial / 🔴 new, with full request/response
   shapes and rules for everything new. Your backend dev can start on all of it today,
   in parallel with the frontend.
2. **Eight screens built**, chosen because they run on APIs that already exist.

**Still missing from both documents: #9, #10, #11, #12, #13, #39, #56, #60.** Send those
and I'll spec and build them.

---

## The pattern that makes this work

Screens are written against the **final** API contract from `API-SPEC.md`, not against
what exists today. A small helper (`src/api/pending.ts`) turns a 404 from an unbuilt
endpoint into `null`, so that section hides or falls back instead of throwing an error at
the user.

**When the backend ships an endpoint, nothing in the frontend changes — it just starts
returning data.** No rewrite, no second pass.

Every API method that isn't live yet is marked in the source:

```ts
/* ── Not built yet — specified in API-SPEC.md (#16 / #65) ────────── */
getOfficialRows: () => client.get<ApiResponse<OfficialChatRow[]>>('/chats/official'),
```

---

## Screens in this batch

### #65 / #16 — Message page
Title bar → live/online strip → the four coloured official rows → private chats.
Unread badges, mute state, voice/gift previews, and the "⭐ Activating 1/3" streak tag.
Swipe a row left for Mute / Delete — the swipe only engages once horizontal movement
clearly beats vertical, so it never steals a scroll.

Live chat list is **real** (existing API). The strip, official rows, mute and delete need
the new endpoints and hide until then.

### #21 — Private chat
Date separators, white bubbles left / indigo right, voice bubbles with a real scrubber,
gift bubbles with the gift image, quick-reply chips that send on tap, and the Poppo input
bar (voice circle · "Say something" · emoji · plus).
Sending, voice recording, gifting and calls all run on the existing API.

### #15 — Diamond → income dashboard
The five income sources with a 24h / 7d / 30d range switch, and the three action buttons.

`/income/summary` doesn't exist yet, so **the totals are computed client-side from your
real `/transactions` ledger** — the screen shows true numbers today, with a line saying
Livestream and Party are reported together until the server can split them. It switches to
the server summary automatically once that endpoint lands.

### #20 — Top-Up Coins
Balance card, the Bangla scam-warning banner, Recharge / Google Pay / c2c tabs, USDT and
USDC with their coin ratio, and the BEP20 / TRC20 / ERC20 network picker with address, QR
and a live coin conversion.

**Deposit addresses are never faked.** Until `/payment/crypto-options` ships, the address
panel says so and points at the c2c tab. The existing BDT/agent recharge flow at
`/recharge` is untouched and is what the c2c tab opens.

### #23 — Withdraw methods
All 8 methods with fee, arrival time and bind state, plus a bind sheet whose fields change
per method (wallet address / phone / email / full bank details).

> ⚠️ Requirement **#6 (asset password)** gates this screen and is **not built yet**.
> Withdraw should not go live until a 4-digit password with a 3-try / 30-minute lock is in
> place. Same for buying a Rare ID, which permanently changes a user's ID.

### #24 — Transfer points
Receiver lookup that shows the nickname before you confirm, the ×100,000 unit input, both
rules enforced in the UI (min 500K, multiple of 100K, agent-only), and a confirm dialog
that says plainly it can't be undone. The server must enforce all of it too — that's in
the spec.

### #64 — Search
Search history (kept in `localStorage` — per-device, no round-trip), the For You grid off
the live feed, and the ranking tabs stubbed until the ranking API exists.

### #29 — Me center menu
Both grouped cards. Rows whose backend isn't ready are marked **SOON** and aren't tappable
— better than sending someone to an empty screen. Each lights up as its API lands.

Profile also rewired per **#22F**: Coins → Top-Up, Points → Income.

---

## Two bugs fixed along the way

- **Income would have shown all zeros** if the server ever answered 200 with the wrong
  shape (a stub, a proxy, a misdeploy). It now validates the payload before trusting it
  and falls back to the ledger otherwise.
- Carried over from batch 1: the teenpatti `Card.tsx` import path, and Wallet showing
  "History" twice.

---

## Verified

- `tsc --noEmit`: clean on backend, no new errors on app-user
- `vite build`: passes
- All eight screens rendered in a real browser at 390×844 against a stubbed API, **with
  unbuilt endpoints returning 404** — so the fallbacks you see are the real ones users
  will get.

---

## What I'd build next

The dependency order matters more than the section numbers:

1. **Store + bag** (#45–49, #51) — frames, rides, bubbles and themes are referenced by the
   party room, chat, profile and level rewards. Everything else decorates with these.
2. **Task engine** (#31, #32, #69, #30) — one engine, four screens.
3. **Ranking service** (#28, #35–38, #71) — one endpoint, six screens.
4. **Party room 16 seats + PK** (#17, #18, #19) — the biggest single screen in the doc.
5. **Agent dashboard** (#34, #52, #54).

Tell me which one to take, or send #9–13 / #39 / #56 / #60 and I'll fold those in first.

Three rules worth holding to across all of it, and they're in the spec: **the server
decides every outcome that moves a balance** (spin slice, PK winner, task completion, call
minutes); **every balance change is an atomic guarded `$inc`**; **anything ranked or
aggregated is precomputed on a schedule**, not built per request.
