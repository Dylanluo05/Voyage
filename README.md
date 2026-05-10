# Trip Itinerary Planner

A full-stack trip planning app built with **MongoDB**, **Express + TypeScript**, **React (Vite + TypeScript)**, and JWT auth.

## Features

- User registration and login (JWT-based)
- Create / read / update / delete trips
- Daily itinerary items (per-day activities with time, notes, and location)
- Optional latitude/longitude pins on each itinerary item (map-ready)

## Project layout

```
voyage/
  backend/    # Express + TypeScript + Mongoose API
  frontend/   # Vite + React + TypeScript SPA
```

## Prerequisites

- Node.js 18+ and npm
- A running MongoDB instance (local `mongodb://localhost:27017` or MongoDB Atlas connection string)

## 1. Backend

```bash
cd backend
cp .env.example .env       # then edit values
npm install
npm run dev                # starts on http://localhost:4000
```

Environment variables (see `backend/.env.example`):
- `PORT` – API port (default `4000`)
- `MONGO_URI` – MongoDB connection string
- `JWT_SECRET` – secret for signing tokens
- `CLIENT_ORIGIN` – allowed CORS origin (default `http://localhost:5173`)

### API overview

| Method | Path                                    | Auth | Description                           |
|--------|-----------------------------------------|------|---------------------------------------|
| POST   | `/api/auth/register`                    | -    | Register new user                     |
| POST   | `/api/auth/login`                       | -    | Login, returns JWT                    |
| GET    | `/api/auth/me`                          | yes  | Current user profile                  |
| GET    | `/api/trips`                            | yes  | List the user's trips                 |
| POST   | `/api/trips`                            | yes  | Create a trip                         |
| GET    | `/api/trips/:id`                        | yes  | Get a single trip with items          |
| PUT    | `/api/trips/:id`                        | yes  | Update trip metadata                  |
| DELETE | `/api/trips/:id`                        | yes  | Delete a trip                         |
| POST   | `/api/trips/:id/items`                  | yes  | Add an itinerary item                 |
| PUT    | `/api/trips/:id/items/:itemId`          | yes  | Update an itinerary item              |
| DELETE | `/api/trips/:id/items/:itemId`          | yes  | Remove an itinerary item              |

## 2. Frontend

```bash
cd frontend
cp .env.example .env       # optional, points to the API
npm install
npm run dev                # opens on http://localhost:5173
```

The frontend talks to the API at `VITE_API_URL` (defaults to `http://localhost:4000`).

## Quick start (two terminals)

```bash
# terminal 1
cd backend && npm install && npm run dev

# terminal 2
cd frontend && npm install && npm run dev
```

Visit http://localhost:5173, register an account, and start planning.
