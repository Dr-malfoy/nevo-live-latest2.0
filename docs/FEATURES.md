# Navo Live — Feature & Fix Implementation Notes

This document summarizes the large UI/UX + reliability update applied to the monorepo.
It covers the sections requested in the full-fix spec: premium UI, live-session hardening,
follow fixes, inbox improvements, settings pages, seller badges, account management,
chat call/gift/voice features, and camera filters/stickers.

---

## 1. What changed, section by section

### UI / Design system
- **Design tokens** (`packages/app-user/tailwind.config.js`): extended `brand` palette with
  `surface`, `surface2`, `border`, `textPrimary`, `textSecondary`, `glow`; new `boxShadow`
  utilities (`glow`, `glow-sm`, `glow-cyan`, `glow-pink`, `glow-gold`, `card`, `card-hover`);
  new keyframes/animations (`pulse-ring`, `float-slow`, `gradient-move`).
- **Premium component classes** (`packages/app-user/src/index.css`): `.btn-neon`, `.card-glass`,
  `.card-glass-hover`, `.text-glow`, `.bg-mesh`, `.bg-mesh-card`, `.border-gradient`,
  `.shimmer-sweep`, `.skeleton` — all additive; existing classes untouched.
- **Floating Go Live button** (`src/components/layout/GoLiveFab.tsx`): icon-only circular FAB
  (gradient + glow + pulse ring) at bottom-right of `MainLayout`. Click → auth check →
  `GET /streams/my-active` check ("You are already live on another session") → `/go-live`.
  The old full-width "🔴 Go Live" button on Home was removed. Bottom nav never had a Go Live item.
- **Live screen info stack** (`src/components/live/TopToolbar.tsx`): host card, title, Coin,
  Diamond, and viewer count now stack vertically on the **left**; back/share/more/LIVE/elapsed
  on the right. Animated number transitions on balances. Host card is clickable → public profile.
  Pointer-events isolation so overlays never block the host card.
- **Profile screen** (`src/pages/Profile.tsx`): Edit / Share / Settings icon column on the
  **left** of the header; NobleBadge/SellerBadge now sit in a reserved, pointer-events-none strip
  (no more overlap); content `pb-28` clears the fixed bottom nav.

### Follow / Unfollow (Section 5)
- Backend `user.service.ts`: `follow()` and `unfollow()` are now **explicit, idempotent,
  transaction-wrapped** operations (`$addToSet` / `$pull` in a Mongoose transaction). Legacy
  `POST /:id/follow` remains a state-checked toggle for compatibility. New
  `GET /users/:id/follow-status` returns the real relationship + counts.
- Frontend `src/hooks/useFollow.ts`: reads real state, branches (following → unfollow, else →
  follow), locks while in flight, only flips UI after DB success, rolls back + toasts on error.
- **Fixed the live-room follow no-op**: `LiveStream.tsx` previously did `setIsFollowing(!isFollowing)`
  without ever calling the API; the same boolean also drove the Like heart. The like heart is now
  separate; the follow button uses `useFollow` against the host.

### Inbox / Chat (Sections 7 + 12)
- Backend `ChatMessage` model: `readAt`, `kind` (`text | gift | voice`), `giftId/giftName/giftCount`,
  `voiceUrl/voiceDuration`. `getMessages` sets `read` + `readAt`; new `markChatRead` endpoint
  (`POST /chats/:chatId/read`) emits a live `chat:read` socket event to the sender.
- `GET /chats?filter=unread|seen` powers the new **Unread / Seen tabs** in `Chats.tsx` with blue
  dot + unread badge + relative timestamps + real-time socket refresh.
- `ChatThread.tsx`: marks read on open and on incoming messages, shows "Seen" under the last
  message, and adds four actions: **Audio call**, **Video call** (Agora 1:1 via new `/api/calls`
  + `call:invite/accept/reject/end` socket signaling + `CallScreen`), **Gift** (reuses the atomic
  gift API + records a gift chat message), **Voice message** (press-and-hold MediaRecorder →
  upload to Cloudinary → voice bubble with play/pause + progress).
- Backend upload route now handles `audio/*` (Cloudinary `resource_type: 'video'`).

### Live session hardening (Sections D1–D2)
Scope per user decision: **frontend-only safety** (no backend uniqueness enforcement).
- `src/services/liveSession.ts`: centralized, **idempotent** `endLiveSession()` — leaves the
  Agora channel, clears timers, calls end/leave API, emits socket events, navigates away.
  Registered by `LiveStream.tsx`; every exit path (End button, Back, unmount, network timeout)
  funnels through it.
- `useAgora.ts`: join re-entry guard (fixes StrictMode double-join), join-failure cleanup,
  `connection-state-change` callbacks for the **10s network grace** auto-end.
- Host **heartbeat** every 15s (`POST /streams/:id/heartbeat`) while joined.
- `GET /streams/my-active` guard in GoLive + FAB; `LiveStream` model gains `sessionId`
  (unique) + `heartbeatAt`; `joinStream` self-heals stale heartbeats.
- Backend feed dedups by `hostId` (aggregation keeps latest per host); frontend `streamStore`
  dedups client-side as a second safety layer.
- Known limitation (documented, per chosen scope): crash-orphaned `status:'live'` rows persist
  until the host next starts (self-heal path) — no backend sweep job.

### Account management
- **Delete Account** (`DELETE /users/me` + Settings UI): confirmation dialog requires typing
  `DELETE`, then re-auth (password or Firebase ID token), then backend **cascade cleanup**:
  ends streams, deletes moments + Cloudinary media, chats + messages, notifications, contact
  messages, reports, purchase/withdraw/sell/agent orders, detaches agencies, removes the user
  from everyone's follow arrays, anonymizes transaction ledger refs, deletes the Firebase Auth
  user (graceful), then the Mongo user. Signs out client-side.
- **Forgot Password** (`/forgot-password` + `POST /auth/reset-password`): phone → Firebase OTP
  (recaptcha + verification) → 60s resend cooldown + 5-attempt cap → new password (min 6) →
  backend verifies the Firebase ID token's phone matches the requested phone, then sets the new
  bcrypt password. OTP/codes never logged.

### Seller badges (Section 9)
- `User.sellerType: none | official | paylor` — **admin-only** via
  `PUT /admin/users/:id/seller-type` (`requireAdmin`). No user-facing endpoint can set it.
- `SellerBadge` component (blue `BadgeCheck` = Official Coin Seller; gold `Coins` = Paylor Coin
  Seller) shown on own Profile, Public Profile, Discover search results, and the live HostCard.
- Admin Users page has a Seller Badge select column.

### Settings pages (Section 8)
- `Privacy Policy` (/privacy), `Community Guidelines` (/guidelines), `Terms & Conditions` (/terms)
  — content in `src/content/legal.ts` (easy to edit), shared `LegalPage` shell with back button,
  scrollable glass cards, last-updated stamp.

### Filters & Stickers (Section 13)
- **Filters** (`useVideoFilters` + `FilterPicker`): 8 CSS presets (Natural, Warm, Cool, Bright,
  Soft Glow, Vintage, Cinematic, Dreamy) applied to the **local preview container** only — zero
  RTC impact, instant switching. Host-only.
- **Stickers** (`useStickers` + `StickerPicker`/`StickerOverlay` + `content/stickers.tsx`):
  40+ pure-SVG stickers across 7 categories; add/remove, drag, resize, rotate, layer ordering.
  Overlay is `pointer-events-none` unless a sticker is selected so live controls stay usable.
- Documented limitation: filters/stickers are host-local preview overlays — remote viewers see
  the unprocessed stream (stream-side processing needs Agora extension licensing).

---

## 2. Firebase schema changes

None. The platform's Mongo models changed, not Firebase. Firebase Auth is used for phone OTP
verification, Google sign-in, and (on account deletion) removing the auth user — all via the
existing `firebase-admin` config (`firebase-credentials.json` or `FIREBASE_SERVICE_ACCOUNT`).

## 3. MongoDB schema changes

| Model | Change |
|---|---|
| `User` | `+ sellerType: 'none'\|'official'\|'paylor'` (default `'none'`) |
| `LiveStream` | `+ sessionId` (unique index), `+ heartbeatAt` |
| `ChatMessage` | `+ readAt`, `+ kind`, `+ giftId/giftName/giftCount`, `+ voiceUrl/voiceDuration` |
| `Call` | **new** — ephemeral 1:1 call records (`participants`, `initiatorId`, `channel`, `type`, `status: ringing\|active\|ended\|missed\|rejected`) |

Note: existing rows get defaults automatically (`sessionId` is only populated on new streams;
old live streams keep working — `heartbeatAt` defaults to now on read via the schema default only
for new docs; `getMyActiveStream`/feed dedup tolerate missing values).

## 4. New environment variables

**None.** Reuses: `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`, `MONGO_URI`, `JWT_SECRET`,
`FIREBASE_SERVICE_ACCOUNT`, `CLOUDINARY_*`.

## 5. New permissions required

- **Microphone** (live host, voice messages, audio/video calls).
- **Camera** (live video host, video calls).
Both are requested at the moment of use via `getUserMedia` (through the Agora SDK / MediaRecorder),
with friendly errors if denied. No new manifest/capability changes (web app).

## 6. New dependencies

**None.** Everything reuses existing packages (`agora-rtc-sdk-ng`, `firebase`, `framer-motion`,
`lucide-react`, `cloudinary`, `agora-access-token`, `bcryptjs`, `zod`).

## 7. New/changed backend endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/streams/my-active` | current user's active live session (FAB/GoLive guard) |
| `POST` | `/api/streams/:id/heartbeat` | host heartbeat (15s) |
| `GET` | `/api/users/:id/follow-status` | real follow relationship + counts |
| `PUT` / `DELETE` | `/api/users/:id/follow` | explicit follow / unfollow |
| `DELETE` | `/api/users/me` | delete account (cascade, re-auth required) |
| `POST` | `/api/auth/reset-password` | forgot-password reset (Firebase-token proven) |
| `POST` | `/api/chats/:chatId/read` | mark conversation read (read receipts) |
| `GET` | `/api/chats?filter=unread\|seen` | inbox tabs |
| `POST` | `/api/calls` (+ `/:id/accept`, `/:id/end`) | 1:1 audio/video calls |
| `PUT` | `/api/admin/users/:id/seller-type` | admin-only seller badge control |
| `POST` | `/api/upload` | now also accepts `audio/*` |

New socket events: `chat:read`, `call:invite`, `call:accept`, `call:reject`, `call:end`.

## 8. Verification run

`npm run build` (builds shared → backend → user → admin → coin) passes with zero TypeScript
errors. All Vite bundles build. Existing features (recharge/withdraw, agency, moments, games,
admin, coin portal) are untouched by these changes and their builds remain green.

Manual test checklist from the spec (UI, follow, live join, inbox, settings, badges, delete
account, forgot password, chat, filters/stickers, live-session tests 1–7) is in the plan file
`~/.commandcode/plans/nevo-live-full-fix-and-features.md` — run it against a dev environment
(`npm run dev`) for final acceptance.
