# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PeerPrep (Group G14) is a CS3219 capstone project — a microservices-based collaborative peer-programming platform. Users are matched by difficulty/topic preference and collaborate on coding problems in a shared Monaco editor session.

## Running the Full Stack

```bash
docker compose up -d        # Start all services with hot-reload
docker compose down         # Stop all services
docker compose logs -f <service>  # Stream logs for a service
```

## Service Commands

### Frontend (`Peerprep-app/`) — React + Vite, port 5173
```bash
npm run dev      # Dev server (hot-reload)
npm run build    # Production build (tsc + vite)
npm run lint     # ESLint
npm run preview  # Preview production build
```

### Question Service (`services/question-service/`) — Go + Gin, port 3002
```bash
air -c .air.toml                          # Dev with hot-reload (requires Air)
go build -o question-service ./tmp/main   # Build binary
go test ./...                             # Run all tests
```

### Matching Service (`services/matching-service/`) — Node.js + TypeScript, port 3003
```bash
npm run dev              # Dev with tsx watch
npm run test             # Run matching algorithm tests (only service with real tests)
npm run build            # Compile TypeScript
npm run prisma:generate  # Regenerate Prisma client
npm run prisma:migrate   # Run DB migrations
npm run prisma:studio    # Open Prisma GUI
```

### Other Node.js Services — auth (3000), user (3001), collaboration (3004)
```bash
npm run dev              # Dev with tsx watch (no compilation needed)
npm run prisma:generate  # For user-service and collaboration-service
npm run prisma:migrate   # For user-service and collaboration-service
```

## Architecture

### Request Flow
```
Browser → Nginx (port 80)
  ├─ /user/auth/*  → User Service (3001)  [public — no JWT check]
  ├─ /api/*        → Auth Service (3000)  [JWT verification layer]
  │    ├─ /api/user/*           → User Service (3001)
  │    ├─ /api/questions/*      → Question Service (3002)
  │    └─ /api/collaboration/*  → Collaboration Service (3004)
  ├─ /matching/*   → Matching Service (3003)  [x-user-id header auth]
  └─ /             → Frontend (5173)
```

### Services
| Service | Language | DB | Notes |
|---|---|---|---|
| auth-service | Node.js/Express | Redis | JWT verification & proxy; no business logic |
| user-service | Node.js/Express | PostgreSQL (Supabase) + Prisma | Login, registration, GitHub OAuth, token refresh |
| question-service | Go/Gin | MongoDB | Question CRUD; Redis caching; admin-only write routes |
| matching-service | Node.js/Express | PostgreSQL (Supabase) + Prisma | Match queue, RabbitMQ publisher |
| collaboration-service | Node.js/Express | PostgreSQL (Supabase) + Prisma | Yjs CRDT over WebSocket, document persistence |
| frontend | React + Vite | — | Monaco editor + y-monaco + y-websocket for live editing |

### Key Integrations
- **RabbitMQ** — topic exchange `matching.events`; matching-service publishes match notifications
- **WebSockets** — auth-service proxies WebSocket upgrades to collaboration-service; Yjs CRDT keeps editors in sync
- **JWT auth** — httpOnly cookies; access token + refresh token; auth-service calls user-service for refresh
- **Go workspace** — `go.work` at repo root; question-service is the only Go module

### Environment
Each service has its own `.env` file (git-tracked) with credentials for its database and external services. All cloud services (Supabase, MongoDB Atlas, Redis Labs, RabbitMQ) are already provisioned — do not modify connection strings without coordinating with the team.


### Question Service API — Completed Questions

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/available?difficulty=X&topic=Y&user1=ID1&user2=ID2` | Fetch questions excluding completed ones for both users |
| POST | `/completed` | Mark a question as completed for given users. Body: `{"userIds": [...], "questionId": "..."}` |

When a session ends, the frontend calls `POST /completed` with both user IDs. On the next match, `GET /available` excludes those questions via `$nin` on MongoDB. This prevents the same question from appearing for either user in future sessions.

## Data Structure
### Question Service 
#### question_collection
{
  "_id": {
    "$oid": "69d1fc22e3fda45d90fedff4"
  },
  "Title": "String",
  "Description": "String",
  "Constraint": "String",
  "ExpectedOutput": "String",
  "Difficulty": "easy",
  "Topics": [
    "depth_first_search",
    "binary_search"
  ],
  "Matched": Integer
  "CreatedAt": "2026-04-05 06:07:30"
}

#### testcase_collection
{
  "_id": {
    "$oid": "69b80a7db2e5ea0f80f39c49"
  },
  "function_to_call": "method()",
  "input_params": {
    "param1": "String1",
    "param2": {
      "$numberLong": "67"
    },
    "param3": "45"
  },
  "question_id": "69a4454453ab6df3d3679d65",
  "expected_output": "34"
}

#### completed_collection
{
  "_id": {
    "$oid": "69b80a7db2e5ea0f80f39c49"
  },
  "UserId": "String",
  "CompletedQuestion": [
    "69a4454453ab6df3d3679d65",
    "69da4c0348c2ba8ffecd7718"
  ],
}
