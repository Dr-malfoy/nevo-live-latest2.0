# Navo Live — Phase 1 (White UI + API wiring)

Requirements 1–4 and 7 from `Nevo.txt`, plus the backend endpoints those screens needed.
Everything else in the repo is untouched and still works the same way.

---

## ⚠️ Two things you need to know first

**1. `Nevo.txt` is cut off.** It says "FINAL DOCUMENT 1 TO 12" but the file ends
mid-sentence inside section 8(I). **Sections 9, 10, 11 and 12 are missing** — send
them and I'll build them.

**2. The zip was missing the monorepo root.** `packages/` shipped without the repo
root, so `tsconfig.base.json` (which `backend/tsconfig.json` and `shared/tsconfig.json`
both extend) and the root `package.json` with the npm workspaces were not included.
I reconstructed a base config locally to typecheck the backend — it is **not** in the
zip, because yours already exists. Nothing to do on your side.

---

## What's done

### #1 — Country filter
Bar of `[All 🌍] [Bangladesh 🇧🇩] [India 🇮🇳] …` on **Home, Popular and Discover**,
with multi-select and a searchable bottom sheet.

- Chips are built from countries that **actually have a live host right now**, so the
  bar never offers a filter that returns an empty feed.
- Selection lives in one persisted store (`stores/countryStore.ts`), so it carries
  across tabs and survives a reload.
- If every selected country goes offline mid-session the filter resets to All, rather
  than leaving you staring at an empty feed with no explanation.

| | |
|---|---|
| `GET /api/streams/feed?country=BD,IN,PK` | filtered feed (also accepts repeated `?country=`) |
| `GET /api/streams/countries` | live countries + stream counts, for the chips |
| `GET /api/users/search?country=BD,IN` | the filter applies to people search too |

`country` is denormalised onto `LiveStream` at create time and indexed
(`{status, country, startedAt}`), so filtering is one indexed match instead of a
`$lookup` into users on every feed request. Changing your country in the editor
also updates any live session you have running, so the filter can't go stale
mid-broadcast.

### #2 — Friends / Following / Followers / Visitors
All four counts on the profile, each opening a full list with picture, badges and a
Follow button. The visitor list shows "Visited 2h ago".

- **Friends** = mutual follow, computed server-side.
- **Visitors** = distinct viewers in the last 7 days. New `ProfileVisit` collection,
  upserted per (visitor, profile) pair — re-visiting bumps the timestamp instead of
  inserting a row, so the count is *people*, not page views. Rows expire on their own
  through a **TTL index**, so no cleanup job is needed.
- **Visitors are private.** The API rejects anyone but the profile owner (403), and the
  tab is hidden when you're viewing someone else.
- Counts come from the server, not the locally cached follow arrays — those go stale
  the moment somebody follows you.

| | |
|---|---|
| `GET /api/users/:id/stats` | `{ friends, following, followers, visitors }` |
| `GET /api/users/:id/friends` | mutual follows |
| `GET /api/users/:id/visitors` | owner-only, each row carries `visitTime` |
| `GET /api/users/me/stats` · `/me/friends` · `/me/visitors` | same, for the logged-in user |

Viewing someone's profile records the visit automatically — as a fire-and-forget write,
so a failed visit log can never break the page load.

### #3 — Badges over the name, role tag under it
`🟢 Mehedi Hasan 🇧🇩 [Lv.15] [VIP3]` with `HOST` underneath.

- Online dot is real presence: `lastActiveAt` is written by the auth middleware,
  throttled to **one write per user per minute** so it doesn't add a DB write to
  every single API call. Online = active in the last 5 minutes.
- Role tags: **HOST** red · **AGENT** blue · **COIN SELLER** gold · **OFFICIAL** blue tick.
  A user can hold several at once (an agent who also sells coins shows both).
- VIP1–VIP4 maps from the noble tier, and **expired nobles don't render a badge**.
- Level tiers per your spec: 1–10 Beginner · 11–30 Rising · 31–50 Popular · 51+ Superstar,
  each with its own colour, plus a progress bar to the next tier.

All of it lives in one `<UserNameplate>` so the badges stay identical everywhere they
appear — feed, profile, lists, search.

### #4 — `›` arrow → full details page
Every user row ends in a `›` that opens the details page: big picture, name + level +
VIP + role tags + online state, age, country with flag, gender, bio, `#tags`, the four
stats, level progress and a badge gallery.

New profile fields (`country`, `gender`, `birthday`, `bio`, `tags`) come with an edit
sheet. **Age is derived from `birthday` server-side and only the age is ever sent to
other users** — the birth date itself stays private.

### #7 — White theme
Background `#FFFFFF`, text `#000000`, secondary `#666666`, black buttons with white
text, dark mode off (`color-scheme: light`).

- New token set in `tailwind.config.js`: `surface` / `ink` / `line` / `accent`, plus
  `role`, `status` and `vip` colours.
- The legacy `dark-*` scale is **kept but inverted**, so any screen I haven't hand-rewritten
  yet still renders on a light surface instead of breaking.
- **Live room, 1-on-1 call and the three casino games are deliberately left dark** — they
  are overlays on top of video, where white-on-dark is the correct choice. The white
  theme is the app chrome, not the video player.

Hand-rewritten: design system, Header, BottomNav, Go Live button, all UI primitives,
Home, Popular, Discover, Profile, PublicProfile, Connections lists, StreamCard.
Everything else was converted by a scripted pass and visually checked.

---

## Two pre-existing bugs I fixed on the way

- **`app-user/src/game/teenpatti/components/Card.tsx`** imported `../../types/teenpatti`,
  which resolves to `src/game/types/…` — one `../` short. It never compiled.
- **`app-user/src/pages/Wallet.tsx`** labelled its tabs by testing for a `'sell'` tab that
  doesn't exist, so **"Withdrawals" and "History" both rendered as "History"**.

## Pre-existing type errors I did NOT touch

These were already in the code and are unrelated to this work. `vite build` succeeds
(esbuild strips types), so the app runs — but `tsc` reports them:

`components/live/LiveRoom.tsx` (StickerOverlay props) · `lib/firebase.ts`
(`signInWithCredential`) · `pages/Match.tsx` (`joinMatch`/`leaveMatch` missing from
SocketState) · `pages/Sell.tsx` (`getSellRequests`, `createSellRequest` missing from the
payment API) · `stores/socketStore.ts` (implicit `any`).

Say the word and I'll clean these up.

---

## Deploying this

No migration script needed — every new field has a default and Mongoose adds it on next
write. Two notes:

1. **Existing users have no country**, so they won't appear under any country chip until
   they set one (the chips only list countries with live hosts, so nothing looks broken).
   If you want to backfill from phone prefixes, I can write that script.
2. **Existing live streams have no `country`.** They show under "All" and drop out of
   country-filtered views until the host restarts the stream. It self-corrects within one
   stream cycle.

Indexes are created automatically by Mongoose on boot: `ProfileVisit` (unique pair,
profile+time, TTL) and `LiveStream {status, country, startedAt}`.

---

## Verified

- `tsc --noEmit` on backend: **clean**
- `tsc --noEmit` on app-user: **no new errors** (only the pre-existing ones above)
- `vite build`: **passes**
- Screens rendered and checked in a real browser at 390×844 with a stubbed API:
  login, home, profile, connections (all four tabs), public profile, discover,
  wallet, settings, game hub.

## Next phase

**#5 Agent dashboard** (7 icons, Make Money / Manage / Data, withdraw methods,
coin trading with the 6-digit password, ranking, rewards, My Agency) — this is the
biggest remaining piece.
**#6 Asset password** (4-digit, mandatory for withdraw, 3 wrong tries = 30 min lock,
reset via email OTP + phone OTP + NID).
**#8 Live features** (join highlight, colourful VIP messages, host daily earning,
game-win messages, filters, mini floating window, live settings menu).
**#9–12** — as soon as you send the rest of the document.
