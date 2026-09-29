# Navo Live — Backend Developer Guide

Everything the backend needs to support the two requirement documents
(`Nevo.txt` #1–#8 and `nova other.txt` #14–#72).

This file **replaces `API-SPEC.md`** — it is the single document to work from. It covers
what already exists, what was added recently, and every endpoint that still needs
building, with request/response shapes, model changes and the rules each one must enforce.

---

## 0. How to read this

**Status markers**

| Marker | Meaning |
|---|---|
| ✅ | Exists and works today |
| 🟡 | Exists but is missing fields or behaviour the screen needs |
| 🔴 | Does not exist — full spec given below |
| ⛔ | Requirement missing from both documents — cannot be specified yet |

**Conventions used everywhere**

- Base URL `/api`. Auth header: `Authorization: Bearer <jwt>` unless marked public.
- Success: `{ "success": true, "data": … }`
- Paginated: `{ "success": true, "data": [...], "pagination": { page, limit, total, totalPages } }`
- Error: `{ "success": false, "error": "message" }` with 400 / 401 / 403 / 404 / 409 / 429
- **Coins and diamonds are integers, never floats.** "Points" in the UI means diamonds.
- Timestamps are ISO-8601 UTC strings.

**Stack** (unchanged): Node 20 · TypeScript · Express · Socket.IO · MongoDB 7 / Mongoose ·
JWT + bcrypt + Google OAuth · Firebase storage · deployed on Render.

---

## 1. Current status of every requirement

**Frontend built: 18 of ~60 screens. Backend complete: 5 of ~60.**
This is an honest picture, not a progress bar.

### Document 1 — `Nevo.txt`

| # | Screen | Frontend | Backend |
|---|---|---|---|
| 1 | Country filter | ✅ | ✅ *(added — §3)* |
| 2 | Friends / Following / Followers / Visitors | ✅ | ✅ *(added — §3)* |
| 3 | Level, VIP, online dot, role tags | ✅ | ✅ *(added — §3)* |
| 4 | User card `›` → full details page | ✅ | ✅ *(added — §3)* |
| 5 | Agent dashboard, 7 icons | ❌ | 🟡 §4.7 |
| 6 | **Asset password for withdraw** | ❌ | 🔴 §4.2 — **blocks #23, #24, #49** |
| 7 | White theme | ✅ | n/a |
| 8 | Live room full features | 🟡 | 🟡 §4.11 |
| 9–13 | — | ⛔ | ⛔ **missing from the document** |

### Document 2 — `nova other.txt`

| # | Screen | Frontend | Backend |
|---|---|---|---|
| 14 | Gift animation system | 🟡 | 🟡 §4.11 |
| 15 | Diamond → 30-day income | ✅ *(ledger fallback)* | 🔴 §4.1 |
| 16 | Messaging system | ✅ | 🟡 §4.10 |
| 17 | Party room, 16 seats | ❌ | 🟡 §4.9 |
| 18 | Dynamic host logo | ❌ | ✅ *(frontend-only)* |
| 19 | Party room PK types | ❌ | 🔴 §4.9 |
| 20 | Top-up coins | ✅ | 🟡 §4.2 |
| 21 | Private chat 1-to-1 | ✅ | 🟡 §4.10 |
| 22 | Me / profile page | ✅ | 🟡 §4.12 |
| 23 | Withdraw methods | ✅ | 🟡 §4.2 |
| 24 | Transfer points | ✅ | 🔴 §4.1 |
| 25 | Invite more hosts | ❌ | 🟡 §4.4 |
| 26 | Invite friends — anniversary | ❌ | 🔴 §4.4 |
| 27 | Link referral templates | ❌ | 🔴 §4.4 |
| 28 | Agent ranking | ❌ | 🔴 §4.5 |
| 29 | Me center menu | ✅ *(rows marked SOON)* | 🔴 §4.12 |
| 30 | How-to-invite sheet | ❌ | 🔴 §4.4 |
| 31 | Reward / daily tasks | ❌ | 🟡 §4.3 |
| 32 | Reward — PK gift tasks | ❌ | 🔴 §4.3 |
| 33 | Wealth level privileges | ❌ | 🔴 §4.6 |
| 34 | Agent dashboard — Make Money | ❌ | 🟡 §4.7 |
| 35 | Host ranking — daily podium | ❌ | 🔴 §4.5 |
| 36 | Rocket host — weekly | ❌ | 🔴 §4.5 |
| 37 | Star host — weekly | ❌ | 🔴 §4.5 |
| 38 | Esports host — daily | ❌ | 🔴 §4.5 |
| 39 | — | ⛔ | ⛔ **missing** |
| 40 | Streamer center — live data | ❌ | 🔴 §4.8 |
| 41 | Fan club → fan group | ❌ | 🔴 §4.10 |
| 42 | Streamer center — inspiration | ❌ | 🔴 §4.8 |
| 43 | Wealth level Lv.60–100 | ❌ | 🔴 §4.6 |
| 44 | Settings page | 🟡 | 🟡 §4.12 |
| 45 | Store — Popular | ❌ | 🔴 §4.0 |
| 46 | Store — Ride / Bubble / Theme | ❌ | 🔴 §4.0 |
| 47 | Store — Avatar frames | ❌ | 🔴 §4.0 |
| 48 | Store — Theme & bubble tabs | ❌ | 🔴 §4.0 |
| 49 | Store — Rare ID (SSR/SR) | ❌ | 🔴 §4.0 |
| 50 | Party listing | ❌ | 🟡 §4.9 |
| 51 | Store — Honor tab | ❌ | 🔴 §4.0 |
| 52 | Agent — Data tab | ❌ | 🔴 §4.7 |
| 53 | Achievement poster | ❌ | 🔴 §4.6 |
| 54 | Agent — host & invite data | ❌ | 🔴 §4.7 |
| 55 | Livestream level | ❌ | 🔴 §4.6 |
| 56 | — | ⛔ | ⛔ **missing** |
| 57 | Short video feed | 🟡 | 🟡 §4.8 |
| 58 | ID invite tutorial | ❌ | ✅ *(uses `user.uid`)* |
| 59 | Fan group chat | ❌ | 🔴 §4.10 |
| 60 | — | ⛔ | ⛔ **missing** |
| 61 | Wealth level Lv.26 view | ❌ | 🔴 §4.6 |
| 62 | Video creator center | ❌ | 🔴 §4.8 |
| 63 | Watch history | ❌ | 🔴 §4.12 |
| 64 | Search page | ✅ | 🟡 §4.12 |
| 65 | Message page / chat list | ✅ | 🟡 §4.10 |
| 66 | Lucky spin | ❌ | 🔴 §4.13 |
| 67 | Diamond games list | ❌ | 🔴 §4.13 |
| 68 | Activity center | ❌ | 🔴 §4.13 |
| 69 | Reward — play games tasks | ❌ | 🔴 §4.3 |
| 70 | Diamond games home | ❌ | 🔴 §4.13 |
| 71 | Earnings leaderboard | ❌ | 🔴 §4.5 |
| 72 | 1-to-1 call pricing | ❌ | 🟡 §4.2 |

> **Please send #9, #10, #11, #12, #13, #39, #56 and #60.** `Nevo.txt` ends mid-sentence
> inside #8(I) and `nova other.txt` starts at #14, so those eight are not specified
> anywhere and cannot be built or estimated.

---

## 2. What the backend has today

Full inventory, so nothing gets rebuilt by accident.

**Auth** `/api/auth` — `send-otp` · `verify-otp` · `login` · `google` · `register` ·
`reset-password` · `dev`

**Users** `/api/users` — `GET/PUT /me` · `PUT /me/password` · `DELETE /me` ·
`/me/following` · `/me/followers` · `/me/stats` · `/me/friends` · `/me/visitors` ·
`GET /search` · `GET /:id` · `/:id/follow-status` · `/:id/stats` · `/:id/following` ·
`/:id/followers` · `/:id/friends` · `/:id/visitors` · `POST|PUT|DELETE /:id/follow`

**Streams** `/api/streams` — `feed` · `my-active` · `countries` · `GET /` · `POST /` ·
`GET /:id` · `:id/join` · `:id/leave` · `:id/heartbeat` · `:id/end`

**Rooms** `/api/rooms` — `GET /` · `POST /` · `GET /:id` · `:id/join` · `:id/leave`

**Chats** `/api/chats` — `GET /` · `unread-count` · `POST /` · `:chatId/read` ·
`GET|POST /:chatId/messages`

**Calls** `/api/calls` — `POST /` · `active` · `GET /:id` · `:id/accept` · `:id/join` · `:id/end`

**Gifts** `/api/gifts` — `GET /` · `POST /send`

**Payment** `/api/payment` — `methods` · `agents` · `admin-info` · `POST|GET /orders` ·
`GET|PUT /user-info` · `POST /withdraw` · `GET /withdrawals`

**Transactions** `/api/transactions` — `GET /`

**Moments** `/api/moments` — `GET /` · `POST /` · `GET /:id` · `DELETE /:id` ·
`:id/like` · `:id/comment`

**Agency** `/api/agency` — `search` · `link-by-agent` · `join` · `leave` · `my-agency` ·
`suggest` · `:agencyId/members`

**Agent** `/api/agent` — `dashboard` · recharge-requests (+approve/reject) ·
withdrawal-requests (+approve/reject/paid) · `POST|GET /orders` · `customers` · `wallet` ·
`GET|PUT /payment-info`

**Rewards** `/api/rewards` — `status` · `claim` *(7-day count reward only)*

**Verification** `/api/verification` — `my` · `submit` · `GET /` · `:id/approve` · `:id/reject`

**Notifications** `/api/notifications`, `/api/official-notifications` — list · unread-count · read

**Games** `/api/teenpatti`, `/api/roulette`, `/api/aviator` — `history` · `stats`

**Other** `/api/upload` · `/api/reports` · `/api/contact` · `/api/admin/*` (37 endpoints)

**35 Mongoose models** · **9 Socket.IO handler namespaces** (aviator, call, chat, match,
room, roulette, stream, teenpatti, index)

**Not present:** there is no `agent.service.ts` — agent logic sits in the controller. Worth
extracting before §4.7 grows it further.

---

## 3. Recently added (already in the repo)

Delivered with requirements #1–#4. Listed so you don't duplicate it.

**`User` model** — new fields: `country` (ISO alpha-2, indexed), `gender`, `birthday`,
`bio`, `tags[]`, `lastActiveAt` (indexed).

**`LiveStream` model** — `country`, denormalised from the host at create time, with a
compound index `{ status, country, startedAt }`. Kept in sync when a host changes country
while live.

**`ProfileVisit` model** — new. Unique on `(visitorId, profileId)`, plus
`{ profileId, visitTime }` and a **TTL index** that drops rows after 7 days, so the
collection stays bounded with no cleanup job.

**New endpoints**

| Endpoint | Purpose |
|---|---|
| `GET /api/users/:id/stats` | `{ friends, following, followers, visitors }` — friends = mutual follow |
| `GET /api/users/:id/friends` | mutual follows, paginated |
| `GET /api/users/:id/visitors` | **owner-only (403 otherwise)**, each row carries `visitTime` |
| `GET /api/users/me/stats` · `/me/friends` · `/me/visitors` | same for the current user |
| `GET /api/streams/countries` | `[{ code, count }]` — countries with a live host |
| `GET /api/streams/feed?country=BD,IN` | country-filtered feed |
| `GET /api/users/search?country=BD,IN` | country filter on people search |

**Presence** — `lastActiveAt` is written by the auth middleware, throttled to **one write
per user per minute** so it doesn't add a DB write to every API call. Online = active
within 5 minutes. Derived `online` and `age` are attached server-side; **`birthday` itself
is never sent to other users, only the computed age.**

**Visiting a profile records the visit** as a fire-and-forget write inside
`GET /api/users/:id`, so a failed visit log can never break a page load.

---

## 4. What still needs building

Grouped by subsystem, in the order I'd build them (§5 explains why).

### 4.0 Store & inventory — #45, #46, #47, #48, #49, #51

**Build this first.** Frames, rides, bubbles and themes are referenced by the party room,
chat, profile, level rewards and the bag. Almost everything else decorates with these.

**New model `StoreItem`**

```ts
{
  category: { type: String, enum: ['avatar_frame','ride','chat_bubble','party_theme','profile_card','rare_id','honor'], index: true },
  name: String,
  image: String,             // card art
  preview: String,           // animated preview
  displayId: String,         // rare_id only — the id being sold, e.g. "40004"
  rarity: { type: String, enum: ['SSR','SR',null] },
  priceCoins: Number,
  priceTickets: Number,      // the second currency (12 / 30 / 140)
  durationDays: Number,      // null = permanent
  badge: { type: String, enum: ['NEW','HOT',null] },
  giftable: { type: Boolean, default: false },
  requiredHonorLevel: { type: Number, default: 0 },
  dailyLimit: Number,        // #51 — "Limit: 688/5000"
  monthlyLimit: Number,      // #51 — Custom Ride "2/3"
  soldToday: { type: Number, default: 0 },
  soldThisMonth: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  order: Number,
}
```

**New model `UserInventory`** (the Bag — #22, #29)

```ts
{
  userId: { type: ObjectId, ref: 'User', index: true },
  itemId: { type: ObjectId, ref: 'StoreItem' },
  category: String,
  expiresAt: Date,           // null = permanent
  equipped: { type: Boolean, default: false },
  isNew: { type: Boolean, default: true },   // drives the red dot
  acquiredAt: Date,
}
```
Index `{ userId: 1, category: 1, equipped: 1 }`.

**Endpoints**

- `GET /api/store/items?category=&sort=hot|latest|level` — paginated
- `GET /api/store/honor` → `{ honorLevel, items[] }` (#51)
- `POST /api/store/buy` → `{ itemId, payWith: 'coins'|'tickets', giftToUserId? }`
- `GET /api/users/me/bag` → `{ items[], hasNew }`
- `POST /api/users/me/bag/:inventoryId/equip` → `{ equipped }`

**Rules — all server-side**

1. Deduct the balance with an **atomic guarded `$inc`**, never read-then-write.
2. `dailyLimit` / `monthlyLimit` enforced with a counter that resets on schedule.
   Sold out → `409 Sold out`.
3. `requiredHonorLevel` not met → `403 Honor Level N or above required`.
4. Equipping an item **unequips the previous item of the same category**.
5. `durationDays` set → write `expiresAt = now + durationDays`.
6. **Rare ID purchase changes `user.uid`.** This is destructive and irreversible:
   require the asset password (§4.2), re-check inside the transaction that the new uid is
   still free, write an `AuditLog` row, and **retire the old uid — never recycle it.**
7. Two currencies. Add **`tickets: { type: Number, default: 0 }`** to `User` and return it
   on `/api/users/me` — the store's bottom bar shows coins *and* tickets.

### 4.1 Money — #15, #24

#### `GET /api/income/summary?range=24h|7d|30d`

```json
{ "success": true, "data": {
  "available": 6808195, "total": 6808195, "unconfirmed": 0, "range": "30d",
  "sources": [
    { "key": "livestream",       "label": "Livestream",       "points": 19206 },
    { "key": "party",            "label": "Party",            "points": 746761 },
    { "key": "commission",       "label": "Commission",       "points": 93157180 },
    { "key": "transfer",         "label": "Transfer Points",  "points": 0 },
    { "key": "platform_rewards", "label": "Platform Rewards", "points": 0 }
  ] } }
```

- `available` = `user.diamonds`; `unconfirmed` = sum of positive `pending` rows;
  `total` = available + unconfirmed.
- Aggregate over the existing `Transaction` collection — the `type` values
  (`gift_receive`, `commission`, `transfer`, `game_win`, `daily_reward`) already carry
  most of the mapping.
- **One model change needed:** `gift_receive` cannot currently be split into Livestream vs
  Party. Add **`sourceType: { type: String, enum: ['live','party','call','other'] }`** to
  `Transaction` and set it in `gift.service.ts` when crediting. Until then the frontend
  reports the two together and says so on screen.

#### `GET /api/income/source/:key` — drill-down, paginated
`{ from: { _id, nickname, avatar, uid }, points, giftName, createdAt }`

#### `POST /api/income/exchange` — `{ points }` → diamonds to coins at the `PaymentConfig` rate. `points > user.diamonds` → `409`.

#### Transfer points — #24

- `GET /api/transfer/quote?receiverUid=59237509` → `{ receiver: { uid, nickname, avatar, isAgent } }`, 404 if unknown
- `POST /api/transfer` → `{ receiverUid, points }`
- `GET /api/transfer/history` — paginated

**Rules, all enforced server-side (the UI checks too, but that is convenience only):**

1. Minimum **500,000** points.
2. Exact multiple of **100,000** → else `400 Amount must be a multiple of 100,000`.
3. Receiver must be an agent → else `400 Only agent can receive`.
4. `diamonds >= points`, atomic — a double-tap must not double-spend.
5. **Non-refundable.** Write both `Transaction` rows (out + in) **in one transaction**, so
   the ledger can never be half-written.

### 4.2 Payments & payouts — #6, #20, #23, #72

#### #6 — Asset password (**build before #23, #24 and rare-ID purchase go live**)

Add to `User`:
```ts
assetPassword: { type: String, select: false },   // bcrypt hash of the 4 digits
assetPasswordFailCount: { type: Number, default: 0 },
assetPasswordLockedUntil: Date,
```

| Endpoint | Notes |
|---|---|
| `POST /api/security/asset-password` | set it the first time |
| `PUT /api/security/asset-password` | change, requires the current one |
| `POST /api/security/asset-password/verify` | returns a short-lived token (5 min) |
| `POST /api/security/asset-password/reset` | **full verify: email OTP + phone OTP + NID if present** |

**3 wrong attempts → lock for 30 minutes** (`assetPasswordLockedUntil`). Any endpoint that
moves value must reject with `403 ASSET_PASSWORD_REQUIRED` without a valid verify token.

#### #20 — Top-up

- `GET /api/payment/crypto-options` → `[{ currency, ratio, networks: [{ code, name, walletAddress, qrCode, minAmount }] }]`
  Admin-editable via `PUT /api/admin/payment-config`.
- `GET /api/payment/recent-recharges` → `[{ maskedUid, amountUsd, at }]`
  **Mask the uid server-side** (`17****71`) — never return the full id.

#### #23 — Withdraw methods

`GET /api/payment/withdraw-methods?country=BD` →

```json
[{ "key":"usdt_trc20","name":"USDT-TRC20","logo":"…","feeType":"percent","fee":1.5,
   "arrival":"1 hour","bound":true,"preferred":true,"fields":["walletAddress"] }]
```

Eight methods: `usdt_trc20` 1.5% / 1h · `epay` 10,000 pts / 1h · `binance_bep20` 1.5% / 1h ·
`payoneer` 10,000 pts / 24h · `bkash` 3% / 24h · `nagad` 3% / 24h · `rocket` 3% / 24h ·
`bank_bdt` tiered 3/5/8% / T+1.

`feeType` is `percent` | `points` | `tiered`. `fields` drives the bind form
(`walletAddress` / `accountId` / `email` / `phone` / bank set). Filter by `country` —
bKash, Nagad and Rocket are BD-only; crypto is global.

- `POST /api/payment/withdraw-methods/:key/bind` — body matches that method's `fields`
- `POST /api/payment/withdraw-methods/:key/preferred`

#### #72 — 1-to-1 call pricing

Add `callPricePerMinute: { type: Number, default: 10000, min: 10000 }` to `User`, and
`coinsPerMinute`, `minutesBilled`, `totalCoins`, `endReason` to `Call`.

- `PUT /api/users/me/call-price` → `{ coinsPerMinute }`, reject below 10,000
- `GET /api/calls/quote/:hostId` → `{ coinsPerMinute, balance, canCall, reason }`

**Metering — this must not live on the client:**

1. On accept, **deduct the first minute immediately** — a call under a minute still costs a
   full minute.
2. Then deduct every 60s from a **server-side interval keyed to the call**, not a client timer.
3. Each deduction is atomic `$inc: { coins: -price }` guarded by `coins >= price`. When the
   guard fails, end the call and emit `call:ended { reason: 'INSUFFICIENT_COINS' }`.
4. Credit the host **in the same transaction** that debits the caller.
5. Round **up** — 2 min 30 s bills 3 minutes.
6. Re-check affordability at `POST /api/calls`; the quote can be stale by the time they tap.

### 4.3 Task engine — #30, #31, #32, #69

One engine, four screens. `/api/rewards/status` today only covers the 7-day count reward.

**New model `TaskProgress`**
```ts
{ userId: ObjectId, taskKey: String, dateKey: String,   // 'YYYY-MM-DD' for daily tasks
  progress: { type: Number, default: 0 }, target: Number,
  state: { type: String, enum: ['todo','claimable','claimed'], default: 'todo' },
  claimedAt: Date }
```
Unique index `{ userId, taskKey, dateKey }`.

`GET /api/tasks?group=daily|interactive|fan_club|pk_mission|games|activity` →

```json
{ "todayEarnings": { "points":0, "coins":0 }, "resetsAt":"2026-09-19T00:00:00Z",
  "sections": [ { "key":"pk_gifts", "title":"Get PK gifts for free by completing daily tasks",
    "note":"PK Gifts expire in 72h after being claimed",
    "tasks": [ { "key":"likes_300", "label":"Give ≥300 likes in live",
      "progress":0, "target":300,
      "note":"Same live room likes count after 20+, progress updates every 20 likes",
      "reward": { "currency":"pk_flag", "amount":5 }, "state":"todo", "goTo":"/live" } ] } ] }
```

`POST /api/tasks/:key/claim` — credits and flips to `claimed`.

**Rules**

- **Progress is written by the features themselves** (gift send, comment, like, live
  minutes) — never by the client posting a progress number.
- **Credit only on claim**, never on progress. Crediting on progress lets a replayed
  request pay twice.
- PK gift rewards expire: `expiresAt = claimedAt + 72h` on the inventory row.
- #30's referral tasks: a new host's live time counts **at most 2 hours per day** toward
  task progress — enforce in the crediting job, not the client.

### 4.4 Referral — #25, #26, #27, #30, #58

**`User` needs one field: `invitedBy: ObjectId`, set only at registration and never
editable afterwards** (the red note in #58). Enforce in `auth.service.ts`, not just the UI.

| Endpoint | Purpose |
|---|---|
| `GET /api/referral/summary` | `{ myId, maxReward, claimed, inviteeCount, availableToday, perInvite }` |
| `POST /api/referral/claim` | claims `availableToday` |
| `GET /api/referral/rank` | Income Rank tab, paginated |
| `GET /api/referral/templates` | #27 cards: `{ id, title, thumbnail, badge, shareCount, downloadCount, shareUrl }` |
| `POST /api/referral/templates/:id/share` | increments the count, returns a personalised link |
| `GET /api/referral/materials` | the "My Material" tab |
| `GET /api/referral/tasks` | #30 task/reward table, served from the DB so rewards can be retuned without an app release |
| `GET /api/referral/ticker` | the scrolling "SushilaThapa3020 claimed $0.1" line |
| `POST /api/agency/invite` | #25 — `{ userId, hostCode }`, `409` if already in an agency |
| `GET /api/agency/invitations` | history: `{ invitee, status, sentAt }` |

### 4.5 Ranking service — #28, #35, #36, #37, #38, #71

**One endpoint serves six screens.** Do not build six.

`GET /api/rankings`

| Param | Values |
|---|---|
| `board` | `agent_count` · `agent_income` · `elite_agent` · `host_daily` · `rocket_host` · `star_host` · `esports_host` · `earnings` · `rich` · `gift` · `video` |
| `period` | `today` · `yesterday` · `week` · `month` |
| `country` | `BD` or `BD,IN,NP`; omit for global |
| `scope` | `global` (default) · `friends` (#71) |
| `gameKey` | optional, filters #71 by game |

```json
{ "resetsAt": "2026-09-19T00:00:00Z",
  "me": { "rank": 13, "distanceToNext": 12, "metricLabel": "Host" },
  "rows": [ { "rank":1,
    "user": { "_id","nickname","avatar","level","country","online" },
    "metric": 123, "metricLabel":"Host", "earnings": 2031195, "prize": 700000,
    "badge": "ROCKET HOST", "frame": "gold" } ] }
```

One shape for every board — only `metricLabel` and which optional fields appear change.
`resetsAt` drives every countdown in the documents (`07:23:59`, `05d 07:32:53`).

Metric per board: `agent_count` = effective hosts (live ≥ minimum hours in last 7 days) ·
`host_daily` / `rocket_host` / `star_host` = gold received · `esports_host` = **ACU
(average concurrent users)** · `earnings` = diamonds won.

`GET /api/rankings/:board/config` →
`{ poolTotal, prizes: [2000000,800000,500000], condition: "Live Duration ≥ 1 hour, no violations", countries: ["IN","NP","BD","BT"] }`

`GET /api/rankings/host_daily/history?date=2026-09-15` — #35 scrolls back through days.

> **Compute rankings on a schedule into a `RankingSnapshot` collection.** Aggregating
> millions of transactions on every page open will not hold up.

> **#37's prize is a 7-day title, not coins** — grant a `Star Host` badge with
> `expiresAt = now + 7d` into the user's inventory rather than crediting a balance.

### 4.6 Levels & achievements — #33, #43, #53, #55, #61

Two ladders: **Wealth** (spending) and **Livestream** (hosting). `LevelConfig` exists as a
model but nothing serves it.

`GET /api/levels/:kind` where kind = `wealth` | `livestream` →

```json
{ "current": { "level":26, "points":22321488, "nextLevel":27, "remaining":4678512,
               "progress":0.83, "badgeIcon":"…" },
  "unlocked": [ { "level":20, "key":"entry_effect", "title":"Special Entry Effect",
                  "scope":"all_rooms", "preview":"…" } ],
  "locked":   [ { "level":30, "key":"badge", "title":"Wealth Lv.30",
                  "hint":"Reach Lv.30 to unlock", "pillColor":"#E36EC1" } ] }
```

Rules: wealth level rises with **total gift spending**; livestream level with **streaming
hours + gifts received**; a new reward every 10 levels; and **from Lv.60 the Level-Up
Effect shows in all rooms** instead of only the current one — so `scope` must be
per-privilege data, not a constant.

`GET /api/achievements?category=milestones|merits|identity` (#53) →
`{ obtainedCount, groups: [{ key, title, count, posters: [{ level, title, image, unlockedAt, shareUrl }] }] }`
`shareUrl` should be a **server-rendered image** — the poster carries a QR code, so sharing
has to work outside the app.

### 4.7 Agent dashboard — #5, #34, #52, #54

Extract an `agent.service.ts` first; the controller is already carrying too much.

| Endpoint | Returns |
|---|---|
| `GET /api/agent/earnings?range=` | `earnedToday`, `points`, `accumulated`, `levelProgress`, `totals{ totalEarnings, hostEarnings, inviteAgentEarnings, totalCommission, hostCommission, inviteAgentCommission }`, `series[]`, `refreshedAt` |
| `GET /api/agent/host-data?range=` | `{ new, newBaseSalary, liveDurationSec, validHosts, series[] }` |
| `GET /api/agent/invite-agent-data?range=` | `{ new, haveIncome, series[] }` |
| `GET /api/agent/hosts` | Manage → My Host: serial, uid, nickname, avatar, level, live duration, party duration, earnings, commission. Query `range`, `search` |
| `GET /api/agent/applications` + `:id/accept` + `:id/reject` | host applications |
| `GET|POST /api/agent/host-groups` | host groups |

`range` values (the exact 8 in #54's dropdown): `today` · `yesterday` · `week` ·
`last_week` · `month` · `last_month` · `7d` · `30d`.

The documents say *"Refresh data every 30 minutes"* — make that real: cache the aggregates
and return `refreshedAt` so the UI can state it honestly.

Withdraw methods and charges for #5.1 are the same catalogue as §4.2
(100,000 coin = 2,500 BDT; bKash/Nagad/Rocket 2.5%).

### 4.8 Creator centers — #40, #42, #57, #62

| Endpoint | Purpose |
|---|---|
| `GET /api/streamer/stats?range=today|week|month` | `{ liveDurationSec, pointsEarned, newFollowers, avgConcurrentUsers }` |
| `GET /api/streamer/last-report` | `{ startedAt, cover, aiScoreStatus, liveDurationSec, pointsEarned, newFollowers, viewers, trend: { liveDuration:'down', viewers:'down' } }` — compare against the previous stream server-side to produce `trend` |
| `PUT /api/streamer/cover` | the "Change Cover" button |
| `GET /api/streamer/inspiration` | #42 Guidelines / Interactivity Tools rows |
| `PUT /api/streamer/settings` | `{ title, tags[], locationEnabled }` |
| `GET /api/creator/stats` | #62 `{ level, levelTitle, verified, progress:{posted,target}, totals, last7Days, academy[] }` |

**#57 short video** — `Moment` needs: `mediaType: 'image'|'video'`, `videoUrl`,
`thumbnail`, `durationSec`, `hashtags[]`, `viewCount`, `giftCount`, `shareCount`.
Then `GET /api/videos/feed?tab=following|popular|hot`, plus
`POST /api/videos/:id/view` · `/share` · `/gift`. Like and comment already exist.

### 4.9 Party room — #17, #18, #19, #50

`Room` additions:
```ts
theme: String,                 // StoreItem id — party theme from §4.0
announcement: String,          // "Make A Wish" banner
seatCount: { type: Number, default: 16 },
admins: [ObjectId],
seats: [{ index, userId, isLocked,
          isMuted: { type: Boolean, default: false },
          giftValue: { type: Number, default: 0 },
          crown: { type: Boolean, default: false } }],
```

| Action | Endpoint |
|---|---|
| Sit | `POST /api/rooms/:id/seats/:index/sit` |
| Stand | `POST /api/rooms/:id/seats/:index/stand` |
| Lock / unlock (host) | `POST /api/rooms/:id/seats/:index/lock` |
| Mute (host/admin) | `POST /api/rooms/:id/seats/:index/mute` |
| Kick | `POST /api/rooms/:id/seats/:index/kick` |
| Admins | `POST /api/rooms/:id/admins` `{ userId, action }` |

**Socket events** (extend `roomHandlers.ts`): `room:seat:update` · `room:join:highlight`
(`[Level 26] 🔥[HM]🔥 : Joined`) · `room:win` (the gold auto-sliding winner bar) ·
`room:gift` · `room:message`.

**#18 needs no API** — the `[HM]` logo must render `room.ownerId.avatar` and each
`seats[i].userId.avatar` instead of a fixed asset, falling back to the default avatar.

**#19 PK** — new `PkBattle` model
`{ type: 'friend'|'random'|'team', teamA[], teamB[], scoreA, scoreB, startedAt, endsAt, status, winnerSide }`.
Endpoints: `GET /api/pk/types` · `GET /api/pk/rank` · `POST /api/pk/invite` ·
`POST /api/pk/match` · `POST /api/pk/team` · `GET /api/pk/history` · `POST /api/pk/:id/end`.
Score = gift value received during the battle window. **Settle server-side on `endsAt`** —
never on a client message, or the losing client can decide the result.

**#50 party listing** — `GET /api/rooms/feed?tab=following|party&country=BD,IN` →
`{ name, thumbnail, owner{nickname,avatar,country}, tag:{type,label}, memberAvatars[], memberCount, viewerCount, followingInside }`.
`tab=following` returns rooms containing someone the caller follows. Country filter reuses
the same `?country=` contract as the stream feed, which is already built.

### 4.10 Messaging & fan club — #16, #21, #41, #59, #65

**Official inbox rows** — add `category: { type: String, enum: ['system','arrival_notice','new_followers','income_reminder','other'] }` to `Notification`
and **derive the rows from that key, not by string-matching titles** (titles get
translated, keys don't).

- `GET /api/chats/official` → `[{ key, title, icon, subtitle, unread, time }]`
- `GET /api/chats/official/:key` — paginated
- `POST /api/chats/official/:key/read`

**Active-user strip** — `GET /api/chats/active-users` →
`[{ _id, nickname, avatar, online, liveStreamId, roomId }]`.
`liveStreamId` non-null → purple live badge; otherwise `online` → green dot.

**Voice messages** — `ChatMessage` needs
`type: 'text'|'image'|'gift'|'voice'`, `voiceUrl`, `voiceDurationSec`.
Upload via the existing `POST /api/upload`, then send as a message.

**Streak** (#16C.4, #21E) — `GET /api/chats/:chatId/streak` →
`{ current, target: 3, litUp, lastChatDate }`. Count a day when **both** users sent at
least one message. Store `streakDays` + `streakLastDate` on `Chat` and update on send, so
reading it is one field rather than a scan.

**Mute / delete** — `POST /api/chats/:chatId/mute` `{ muted }` ·
`DELETE /api/chats/:chatId` (**soft-delete for the caller only** — the other side keeps
their copy).

**Fan club / fan group** (#41, #59)

- `GET /api/fanclub/joined` · `GET /api/fanclub/mine`
- `POST /api/fanclub/:hostId/join` (costs coins) · `POST /api/fanclub/:hostId/light-up`
- `GET /api/fangroups?scope=joined|mine` · `POST /api/fangroups` · `GET|POST /api/fangroups/:id/members`

**Group chat should reuse the existing chat API** with `Chat.type: 'group'` and a
`groupId`. Building a second messaging stack for groups would be a mistake.

### 4.11 Live room & gifts — #8, #14

**`Gift` model** needs three fields so the client knows how big to render:
```ts
animationUrl: String,        // Lottie / MP4 / SVGA
animationTier: { type: String, enum: ['corner','medium','fullscreen'], default: 'corner' },
soundUrl: String,
```
Tier rule from #14: `< 1,000` → corner · `1,000–999,999` → medium · `≥ 1,000,000` →
fullscreen. **Store the tier rather than deriving it from price**, so a cheap seasonal gift
can be promoted to a full-screen effect without an app update.

Animation ON/OFF and Low/Medium/High quality are **local device settings** — keep them in
`localStorage`, they must not cost a round-trip.

**#8 live features** still needing server support: host daily earning (24h rolling, reset
after 24h), game-win highlight messages, new-member join highlight, and the live settings
menu. Most ride on existing socket namespaces; the earning figure needs an endpoint:
`GET /api/streams/:id/host-earning` → `{ last24hDiamonds, resetsAt }`.

### 4.12 Profile, settings, history — #22, #29, #44, #63, #64

| Endpoint | Purpose |
|---|---|
| `GET /api/users/me/completion` | #22D — `{ percent, missing: [{ key, label, weight }] }`. Weights: avatar 20, cover 10, nickname 10, bio 10, birthday 10, gender 10, country 10, tags 10, verification 10. Compute server-side so app and web agree |
| `GET /api/users/me/security` | #44 — `{ level:'high', phoneVerified, emailVerified, twoFactor }` |
| `GET|PUT /api/users/me/settings` | one JSON blob: `notifications`, `privacy{ whoCanMessage, showVisitors, showOnlineStatus }`, `playback`, `privilege` |
| `GET /api/users/me/blacklist` · `POST|DELETE /api/users/:id/block` | #44 blacklist |
| `GET /api/users/me/guardian` | #29 — `{ guardians[], guardedBy[] }` |
| `POST /api/history/watch` | #63 — fire-and-forget on entering a live/video |
| `GET /api/history/watch?type=live` | grouped by day: `{ groups: [{ label:'Yesterday', items:[…] }] }` |
| `DELETE /api/history/watch` | clear all |
| `GET /api/search?q=&type=all|user|live|video` | #64 universal search |
| `GET /api/discover/for-you` | #64 mixed Live + Party + Video grid |

Search history stays in `localStorage` — per-device, and it should never cost a round-trip.
Help Center, Follow Us and Builder Center are **static links**: put the URLs in a small
`AppConfig` collection rather than hard-coding them in the app.

### 4.13 Games hub — #66, #67, #68, #69, #70

| Endpoint | Purpose |
|---|---|
| `GET /api/games` | `{ key, name, icon, color, badge:'HOT', currency:'diamond'|'coupon', launchUrl }` |
| `GET /api/games/home` | balances, 5 quick actions, winner ticker, active banner |
| `GET /api/games/winners` | the scrolling "🐬Akhi🐬 Win 1,200,000" ticker |
| `GET /api/activities?status=ongoing|closed` | #68 `{ title, banner, prizePool, currency, startAt, endAt, rulesUrl }` |
| `GET /api/activities/:id` | detail, leaderboard, prize distribution |
| `GET /api/activities/rewards` | the user's activity rewards |
| `GET /api/signin` · `POST /api/signin/claim` | daily sign-in calendar + red dot |

**#66 Lucky spin**

`GET /api/lucky-spin` → `{ slices: [{ index, amount, currency }], freeSpinAvailable, nextFreeSpinAt, extraSpinCostCoins }`
`POST /api/lucky-spin/spin` → `{ sliceIndex, reward, balances }`

> **The server picks the slice and credits it in the same transaction, then tells the
> client which index to animate to.** If the client picks the slice, the wheel is a lie and
> trivially cheatable. One free spin per user per UTC day, enforced with a unique index on
> `(userId, dateKey)` — not by a client-side check.

---

## 5. Rules that apply everywhere

These four come up in almost every section above. Getting them wrong is what turns a
working feature into a money leak.

1. **The server decides every outcome that moves a balance.** Spin slice, PK winner, task
   completion, call minutes, ranking position. A client may *display* an outcome; it must
   never *determine* one.
2. **Every balance change is a single atomic guarded `$inc`** — the pattern the existing
   games already use (`$inc` with a `$gte` condition). Never read-then-write: two taps
   arriving together will both pass a read-check and both spend.
3. **Anything ranked or aggregated is precomputed on a schedule**, into a snapshot
   collection. Rankings, agent analytics and income summaries cannot be built per request
   at this data volume.
4. **Anything irreversible is gated by the asset password** (§4.2) and writes an
   `AuditLog` row: withdrawals, point transfers, and rare-ID purchases.

Two more worth stating:

- **Money writes that touch two accounts go in one transaction.** A transfer that debits
  the sender but dies before crediting the receiver is the worst possible bug here.
- **Never return data the screen doesn't need.** `birthday` is the current example — the
  profile shows age, so the API sends `age` and keeps the birth date private.

---

## 6. Suggested build order

The dependency chain matters more than the section numbers.

| Order | Work | Unlocks |
|---|---|---|
| 1 | **Store + inventory** (§4.0) | #45–49, #51, and the decorations used by party room, chat, profile and level rewards |
| 2 | **Asset password** (§4.2) | Unblocks #23, #24, #49 — these should not ship without it |
| 3 | **Task engine** (§4.3) | #30, #31, #32, #69 — one engine, four screens |
| 4 | **Ranking service** (§4.5) | #28, #35, #36, #37, #38, #71 — one endpoint, six screens |
| 5 | **Money** (§4.1) | #15, #24, and the real numbers behind #20/#23 |
| 6 | **Party room + PK** (§4.9) | #17, #18, #19, #50 — the largest single screen |
| 7 | **Agent analytics** (§4.7) | #5, #34, #52, #54 |
| 8 | **Levels + achievements** (§4.6) | #33, #43, #53, #55, #61 |
| 9 | **Messaging extras + fan club** (§4.10) | completes #16, #21, #41, #59, #65 |
| 10 | **Creator centers** (§4.8) | #40, #42, #57, #62 |
| 11 | **Games hub** (§4.13) | #66–#70 — mostly listings around third-party games |
| 12 | **Profile / settings / history** (§4.12) | completes #22, #29, #44, #63, #64 |

---

## 7. How the frontend is wired to this

Screens already built are written against the **final** contracts in this document, not
against what exists today. `app-user/src/api/pending.ts` turns a 404 from an unbuilt
endpoint into `null`, so the section hides or falls back instead of throwing an error.

**When you ship an endpoint, no frontend change is needed — it starts returning data.**

Every not-yet-live call is marked in the API layer:

```ts
/* ── Not built yet — specified in BACKEND-GUIDE.md §4.10 ────────── */
getOfficialRows: () => client.get<ApiResponse<OfficialChatRow[]>>('/chats/official'),
```

Two places currently run on a documented fallback, and both say so on screen:

- **#15 Income** computes its five totals from `/transactions` until `/income/summary`
  exists, and tells the user Livestream and Party are reported together.
- **#23 Withdraw methods** shows the standard eight-method catalogue with everything
  unbound until `/payment/withdraw-methods` exists.

Neither invents data. **#20 Top-up never shows a deposit address** until the real one
comes from the server.

---

## 8. Repo note

The uploaded zip is missing the monorepo root — `tsconfig.base.json` (extended by
`backend/tsconfig.json` and `shared/tsconfig.json`) and the root `package.json` with the
npm workspaces were not included. They exist in the real repo, so there is nothing to fix;
it only means a fresh clone of the zip alone will not typecheck until those two files are
present.

Known pre-existing type errors, unrelated to this work and not fixed:
`components/live/LiveRoom.tsx` (StickerOverlay props) · `lib/firebase.ts`
(`signInWithCredential`) · `pages/Match.tsx` (`joinMatch`/`leaveMatch` missing from
`SocketState`) · `pages/Sell.tsx` (`getSellRequests`, `createSellRequest` missing from the
payment API) · `stores/socketStore.ts` (implicit `any`). `vite build` passes regardless,
since esbuild strips types.
