# CurioHub — Full-Stack Chat Platform

CurioHub is now a full-stack, production-style web application that demonstrates:

- Backend engineering with Express, JWT auth, role-based access control, and Socket.IO
- Frontend engineering with React + Vite + React Router
- Database integration with Prisma + SQLite
- Workflow design through a request/approval system for creating new chatrooms

## Significant Upgrades

- Migrated from a broken single-file Flask setup to a clean monorepo architecture
- Implemented Express API with JWT auth, role-based access control, and Prisma-backed persistence
- Built request-driven chatroom creation flow where admins approve/reject user requests
- Added real-time room messaging with Socket.IO and persistent message history
- Split experience into separate role-based pages:
	- Admin page for moderation and approvals
	- User page for requesting rooms and joining approved chats
- Standardized local development flow to run frontend + backend together from root

## What This Project Demonstrates

### 1) Authentication + Authorization
- User registration and login
- JWT-based session handling
- Role-based access (`USER`, `ADMIN`)

### 2) Real Chatroom Governance
- Users can submit chatroom requests
- Admins can approve or reject pending requests
- Approval creates an actual chatroom record in the DB

### 3) Real-Time Messaging
- Socket.IO-powered live room chat
- Server-side message validation
- Persistent message storage in the database
- Message history retrieval per room

### 4) Modern Frontend UX
- Protected routes
- Dashboard for rooms, requests, and admin moderation queue
- Dedicated chatroom view with live updates

## Tech Stack

- **Frontend:** React, Vite, React Router, Socket.IO Client
- **Backend:** Node.js, Express, Socket.IO, Zod, JWT, bcrypt
- **Database:** Prisma ORM with SQLite

## Project Structure

```
.
├── client/                 # React app
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   └── pages/
├── server/                 # Express + Prisma + Socket.IO
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   └── src/
│       └── index.js
└── package.json            # Workspace scripts
```

## Quick Start

### 1) Install dependencies
```bash
npm install
```

### 2) Configure environment
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### 3) Initialize database
```bash
npm --workspace server run prisma:migrate
npm --workspace server run prisma:seed
```

### 4) Run full stack
```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5050`

## Default Admin (from seed)

- Username: `admin`
- Password: `admin`
- Email: `admin@curiohub.dev`

## Core API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/chatrooms`
- `GET /api/chatrooms/:roomId/messages`
- `POST /api/chatroom-requests`
- `GET /api/chatroom-requests/mine`
- `GET /api/admin/chatroom-requests`
- `POST /api/admin/chatroom-requests/:requestId/approve`
- `POST /api/admin/chatroom-requests/:requestId/reject`

## Next Enhancements (Optional)

- Add tests (API + UI)
- Add Redis adapter for horizontal Socket.IO scaling
- Add room membership and moderation tools
- Add CI pipeline and Docker deployment
