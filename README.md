<<<<<<< HEAD
# Reflex — Delivery Management & Verification System

A Node.js/Express + SQLite prototype for controlled delivery handoffs.

## Workflow
CREATED → ASSIGNED → PICKED_UP → DELIVERED

1. Create a delivery.
2. Assign an AVAILABLE rider.
3. Rider verifies the item barcode.
4. Dispatcher generates the recipient OTP after pickup.
5. Rider enters the OTP.
6. Delivery becomes DELIVERED and the rider becomes AVAILABLE.

## Run locally

Requirements: Node.js 18+.

```bash
npm install
npm start
```

Open `http://localhost:3000/`.

## Pages
- `/` Home
- `/create.html` Create delivery
- `/dispatcher.html` Dispatcher dashboard
- `/rider-login.html` Rider login
- `/rider.html` Rider dashboard

## API
- GET `/api/health`
- GET `/api/deliveries`
- GET `/api/riders`
- GET `/api/riders/:id/deliveries`
- POST `/api/deliveries`
- POST `/api/assignments`
- POST `/api/deliveries/:id/assign`
- POST `/api/deliveries/:id/scan`
- POST `/api/deliveries/:id/generate-otp`
- POST `/api/deliveries/:id/verify-otp`

## Render
Build: `npm install`
Start: `npm start`
Runtime: Node
Region: Frankfurt

The server uses `process.env.PORT || 3000` and listens on `0.0.0.0`.

SQLite is suitable for this prototype, but production deployment should use a persistent managed database because hosted filesystems can be ephemeral.

## Demo riders
John Kamau — FL-017 — KDA 123A
Mary Wanjiku — FL-023 — KDB 456B
=======
# abraham_josiah

>>>>>>> 9892a47b7a743100800142c4e22fea673f889122
