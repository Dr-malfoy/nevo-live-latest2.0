# Navoliva Backend Developer Documentation

Welcome to the **Navoliva Backend**! This documentation is designed to help you quickly understand the architecture, tools, and workflows used to power the application.

## 1. Tech Stack Overview
The backend is built with modern, scalable TypeScript technologies:
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ORM
- **Real-Time Communication**: Socket.IO
- **Language**: TypeScript (`tsx` for dev runner)
- **Validation**: Zod
- **Authentication**: JWT (`jsonwebtoken`) and Firebase Admin (for mobile OTP/social logins)

## 2. Directory Structure (`packages/backend/src`)
The source code follows a standard layered architecture:
```text
src/
├── config/       # Environment variables, DB connection, API configs (Agora, Cloudinary)
├── controllers/  # Request handlers (business logic layer)
├── middleware/   # Express middlewares (auth, error handling, rate limiting)
├── models/       # Mongoose schemas and models
├── routes/       # Express route definitions (maps endpoints to controllers)
├── services/     # Complex business logic (external API calls, stream management)
├── socket/       # Socket.IO event handlers and namespace management
├── utils/        # Helper functions (JWT verification, formatting)
├── app.ts        # Express application setup and global middleware
├── index.ts      # Main entry point (starts HTTP & Socket server)
└── seed.ts       # Database seeding script for development
```

## 3. Getting Started
1. **Environment Variables**: You will need a `.env` file at the root of `packages/backend` matching the structure expected in `src/config/env.ts` (e.g., `PORT`, `MONGODB_URI`, `JWT_SECRET`, `AGORA_APP_ID`, etc.).
2. **Install Dependencies**: `npm install`
3. **Run Development Server**: 
   ```bash
   npm run dev
   ```
   *This uses `tsx watch` to auto-restart the server on file changes.*
4. **Seed Database (Optional)**: 
   ```bash
   npm run seed
   ```

## 4. API Routing
All API routes are mounted in `app.ts` under the `/api` prefix. The routing is modularized in `src/routes`:

- `/api/auth`: Login, registration, token refresh
- `/api/users`: Profile fetching, following, updating details
- `/api/streams`: Live stream CRUD and Agora token generation
- `/api/rooms`: Voice/Party room management and seat tracking
- `/api/gifts`: Fetching available gifts and sending gifts
- `/api/transactions`: User wallet balance and transaction history
- `/api/moments`: Social feed posts (Moments)
- `/api/agency` & `/api/agent`: Agency and agent management tools
- `/api/admin`: Administrative actions and dashboard stats
- `/api/teenpatti`, `/api/roulette`, `/api/aviator`: Mini-games endpoints
- `/api/payment`: Payment gateway webhooks and processing

## 5. Real-Time Sockets (`src/socket`)
Socket.IO is heavily used for real-time features like chat, live streaming metrics, party room seating, and games.

- **Initialization**: Configured in `src/socket/index.ts`.
- **Authentication**: Sockets require a valid JWT passed in `socket.handshake.auth.token`.
- **Namespaces/Handlers**:
  - `streamHandlers.ts`: Live stream chat, likes, gift animations.
  - `roomHandlers.ts`: Voice party room seating (`room:seat:update`), mic toggles, and gifts.
  - `chatHandlers.ts`: Direct messaging between users.
  - `gameHandlers.ts`: Mini-game states (TeenPatti, Roulette).

## 6. Database Models (`src/models`)
We use Mongoose for data modeling. Key models include:
- **`User`**: Stores profile info, wallet balances (`coins`, `diamonds`), followers, VIP/Level status, and verification.
- **`LiveStream`**: Tracks active streams, host ID, Agora channel details, and viewer counts.
- **`Room`**: Tracks voice party rooms, including a 16-seat array for dynamic seating.
- **`Gift`**: Metadata for gifts (name, coin cost, animation URL).
- **`Transaction`**: Immutable ledger of coin/diamond flow (recharges, gift sending, earnings).

## 7. Key Third-Party Integrations
- **Agora (`agora-access-token`)**: Used for generating RTC tokens so mobile/web clients can join video/voice channels.
- **Cloudinary**: Handles image/video uploads (avatars, moment posts, gift animations).
- **Firebase Admin**: Used for verifying phone numbers and push notifications.

## 8. Best Practices for this Codebase
1. **Use Async Handlers**: Ensure controllers wrap async logic properly or rely on the global `errorHandler` middleware.
2. **Socket Idempotency**: Be mindful of socket disconnects (e.g., ensure `streamService.leaveStream` is called on disconnect to prevent zombie viewers).
3. **Transactions**: When dealing with user wallets (e.g., buying a gift), ensure you perform atomic updates (like `$inc`) in Mongoose to prevent race conditions.
