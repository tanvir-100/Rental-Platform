# Keyhold — Rental Maintenance & Amenity Management

A full-stack MERN + Socket.io app for real-time maintenance request tracking and
conflict-free amenity booking, built from the PRD: centralize maintenance and
amenity operations between tenants and property owners.

## Stack

- **Frontend:** React (Vite), React Router, Tailwind CSS, Socket.io-client, Axios
- **Backend:** Node.js, Express, MongoDB (Mongoose), Socket.io, JWT auth, bcrypt
- **Security:** Helmet, express-rate-limit, express-validator, Winston logging
- **Real-time layer:** Socket.io — rooms scoped per-property and per-user so status
  changes and new requests/bookings push to the right dashboards instantly

## Project structure

```
rental-platform/
├── backend/
│   ├── config/db.js            # Mongo connection with custom DNS
│   ├── middleware/
│   │   ├── auth.js             # JWT verification + role guard
│   │   └── validation.js       # express-validator rules for all routes
│   ├── models/                 # User, Property, MaintenanceRequest, Amenity, AmenityBooking
│   ├── routes/                 # auth, properties, maintenance, amenities, bookings, users
│   └── server.js               # Express app + Socket.io server + security middleware
└── frontend/
    ├── src/
    │   ├── api/axios.js        # Axios instance with auth header injection
    │   ├── context/            # AuthContext, SocketContext (with reconnection)
    │   ├── components/         # Forms, lists, booking slot grid, status tags
    │   └── pages/              # Login, Register, TenantDashboard, OwnerDashboard
    └── .env.example            # Frontend environment variables template
```

## Key Features

### 🔐 Security & Production Ready
- **Helmet.js** — Security headers (XSS protection, frame options, content-type sniffing)
- **Rate Limiting** — 100 req/15min general, 10 req/15min on auth endpoints
- **Input Validation** — express-validator on all routes with detailed error messages
- **Structured Logging** — Winston JSON logs with timestamps, duration, IP tracking
- **CORS Configuration** — Flexible dev (any localhost) + strict production (explicit origins)
- **MongoDB Transactions** — Atomic booking creation prevents race conditions

### ⚡ Real-time Features
- **Socket.io Rooms** — Per-property and per-user rooms for targeted updates
- **Auto-reconnection** — Exponential backoff (1s → 5s, max 10 attempts)
- **Live Updates** — Maintenance requests, status changes, amenity bookings, tenant changes

### 📊 Data Integrity
- **Database Indexes** — Optimized queries on all models (property+status, tenant+date, etc.)
- **Password Hashing** — bcrypt with salt rounds
- **JWT Authentication** — Secure tokens with 7-day expiry, role-based access control

## How the core requirements are implemented

**Real-time maintenance tracking (FR1).** A tenant's `POST /api/maintenance` emits
`maintenance:new` to the property's Socket.io room; the owner's dashboard is
subscribed and prepends the request without a refresh. Status changes
(`PATCH /api/maintenance/:id/status`) emit `maintenance:updated` to both the
property room and the tenant's personal room, and Completed requests
auto-stamp a `resolutionDate` used for the resolution-time KPI.

**Zero-double-booking amenity management (FR2).** `POST /api/bookings` rejects
any request whose `[checkInTime, checkOutTime)` window overlaps an existing
`Confirmed`/`CheckedIn` booking for the same amenity and date
(`routes/bookings.js`, `rangesOverlap`). **Now uses MongoDB transactions** for
atomic check-and-create, eliminating race conditions. The frontend slot grid
(`AmenityBookingPanel.jsx`) fetches the day's bookings first and disables
already-booked slots, so conflicts are prevented visually before they'd ever
hit the server check.

**Dashboards (FR3).** The owner dashboard computes pending/in-progress/
completed counts, completion rate, and average resolution time client-side
from the same data the tenant sees, so both stay consistent with one source
of truth.

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env      # fill in MONGO_URI and a real JWT_SECRET
npm install
npm run dev                # nodemon, http://localhost:5000
```

Requires a running MongoDB instance — either local (`mongod`) or a connection
string from MongoDB Atlas.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

Optional `.env` in `frontend/` if your backend isn't on localhost:5000:

```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Try it out

1. Register as an **owner** — this creates your first property and shows you
   its Property ID (copy it).
2. Register as a **tenant** using that Property ID to join the same property.
3. As the tenant: submit a maintenance request, or book an amenity (an owner
   needs to add one first, under the Amenities tab).
4. As the owner (in a second browser/incognito window, logged in
   simultaneously): watch the request or booking appear live, then change its
   status — the tenant's screen updates instantly.

## Production Deployment

### Prerequisites
- **MongoDB Atlas** (free tier) — provides replica set required for transactions
- **Node.js 18+** on backend host
- **HTTPS** — handled by hosting platforms

### Backend Deployment (Render / Railway / Fly.io / AWS)

**Environment Variables:**
```bash
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db?retryWrites=true&w=majority
JWT_SECRET=<generate with: openssl rand -base64 32>
JWT_EXPIRES_IN=7d
CLIENT_URL=https://your-frontend-domain.com
```

**Build/Start Commands:**
```bash
npm install
npm run start  # or: node server.js
```

### Frontend Deployment (Vercel / Netlify)

**Environment Variables:**
```bash
VITE_API_URL=https://your-backend-domain.com/api
VITE_SOCKET_URL=https://your-backend-domain.com
```

**Build Command:**
```bash
npm install
npm run build  # outputs to dist/
```

### Docker (Optional)

```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

### Socket.io Scaling (Multi-instance)

For horizontal scaling, add Redis adapter:
```bash
npm install @socket.io/redis-adapter ioredis
```

```js
// In server.js
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('ioredis');

const pubClient = createClient(process.env.REDIS_URL);
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

## Security Checklist for Production

- [ ] Generate strong `JWT_SECRET` (32+ chars): `openssl rand -base64 32`
- [ ] Use MongoDB Atlas with dedicated database user (not admin)
- [ ] Set `CLIENT_URL` to exact frontend domain(s), comma-separated
- [ ] Enable HTTPS on both frontend and backend
- [ ] Configure rate limits based on expected traffic
- [ ] Set up log aggregation (Datadog, Logtail, or similar)
- [ ] Add monitoring/alerting for error rates and latency

## What's deliberately out of scope (Phase 1, per the PRD)

Native mobile apps, online rent payments, AI predictive maintenance, and IoT
integration. The data model and route structure are modular enough that each
of those could be added later without reworking what's here.

## Known Limitations / Future Improvements

- **Socket.io scaling** — Single instance works; add Redis adapter for multi-instance
- **Email notifications** — Not implemented; could add Nodemailer for maintenance alerts
- **File uploads** — Not implemented; could add Multer + S3 for maintenance photos
- **Unit/Integration tests** — Not included; recommend Jest + Supertest for CI/CD
- **API versioning** — Not implemented; consider `/api/v1/` prefix for future
