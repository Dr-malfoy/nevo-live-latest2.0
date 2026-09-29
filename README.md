# Navo Live — Monorepo

A live-streaming platform with real-time chat, gifts, virtual economies (diamonds & coins), agency/agent management, and an integrated casino-style game hub.

## Stack

- **Backend** — Node.js, Express, Socket.IO, MongoDB (Mongoose)
- **Frontends** — React (Vite) + TypeScript + TailwindCSS, Zustand + TanStack Query
- **Realtime** — Socket.IO (streams, rooms, chat, games, notifications)

## Workspaces (`npm workspaces`)

| Package | Path | Description |
|---|---|---|
| `@bogolive/shared` | `packages/shared` | Shared types, validation (Zod), constants |
| `@bogolive/backend` | `packages/backend` | Express + Socket.IO API server, game engines |
| `@bogolive/app-user` | `packages/app-user` | User H5 app (mobile-first) |
| `@bogolive/app-admin` | `packages/app-admin` | Admin console |
| `@bogolive/app-coin` | `packages/app-coin` | Coin/agent portal |

## Games

- **Aviator** — crash game (1.0x–2.5x), HTML5 plane, no Unity
- **Roulette** — 38-slot wheel with 13 bet types
- **Teen Patti** — multiplayer 3-card poker tables

All games share the same architecture: a backend engine service with atomic balance
movements (`findOneAndUpdate` + `$gte` + `$inc`), `game_bet`/`game_win` transaction
records, `balance:update` socket pushes, and a thin frontend hook/context/component
structure reusing the app's single main Socket.IO connection.

## Development

```bash
npm install
npm run dev            # starts backend + all frontends together
```

Per-package scripts:

```bash
npm run dev:backend    # API server
npm run dev:user       # user app
npm run dev:admin      # admin console
npm run dev:coin       # coin/agent portal
```

## Build

```bash
npm run build          # builds all workspaces (shared → backend → user → admin → coin)
```

## Environment

Backend config lives in `packages/backend/src/config/env` (dotenv). Frontends read
their API/WS URLs from env (e.g. `VITE_API_URL`). See each package's `.env.example`
for the required variables.
