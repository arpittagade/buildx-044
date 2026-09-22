# CivicConnect

CivicConnect is a civic-services and smart-governance prototype for Nagpur. It gives citizens a transparent way to report local issues and gives municipal administrators one shared queue for ownership, task progress, ward patterns, and citizen-confirmed closure.

## Why this fits the brief

The prototype addresses the scenario in which citizens are sent between departments, complaints receive no receipt, and officials cannot see cross-ward patterns. The core mechanism is a single complaint record with a unique ID, role-based ownership, an auditable update timeline, and citizen confirmation before closure.

## Product flow

1. A citizen creates an account using email and password.
2. The citizen submits a complaint with category, location, ward, priority, and optional evidence.
3. The complaint receives a tracking ID immediately.
4. An admin reviews the queue and assigns a department.
5. The authority workspace records progress and resolution notes.
6. The citizen confirms the result or reopens the complaint.
7. The admin overview exposes ward and department patterns for data-driven prioritization.

## Repository structure

```text
client/   React + Vite frontend for Vercel
server/   Express + Mongoose API for Render
```

## Local development

```bash
npm install --prefix client
npm install --prefix server

# terminal 1
npm run dev:client

# terminal 2
npm run dev:server
```

Copy `client/.env.example` and `server/.env.example` into `.env` files and configure MongoDB Atlas before using the real API.

## Deployment

### Vercel frontend

- Import this repository into Vercel.
- Set the project root to the repository root, or use the included `vercel.json`.
- Set `VITE_API_URL` to the deployed Render API URL plus `/api`.
- Build command: `npm install --prefix client && npm run build --prefix client`.
- Output directory: `client/dist`.

### Render API

- Create a Web Service from this repository.
- Root directory: repository root.
- Build command: `npm install --prefix server`.
- Start command: `npm start --prefix server`.
- Add the variables in `server/.env.example`.
- Set `CLIENT_ORIGIN` to the Vercel URL.
- Set `MONGO_URI` to the MongoDB Atlas connection string.

The server creates the admin user and three realistic demo complaints on the first connection when the database is empty.

## Evaluation demo credentials

These demo credentials are intended for the hackathon walkthrough and are also available through the sign-in screen:

| Role | Email | Password |
|---|---|---|
| Citizen | `citizen@civicconnect.local` | `Citizen@123` |
| Admin | `admin@civicconnect.local` | `Admin@123` |

Change `ADMIN_PASSWORD` and `JWT_SECRET` before production deployment.

## Security and correctness notes

- Passwords are hashed with bcrypt; plaintext passwords are never stored.
- Sessions use signed JWTs with a seven-day expiration.
- Admin and authority routes are protected by server-side role guards.
- Citizens can only view and update their own complaints.
- Admin roles cannot be self-assigned during registration.
- Every assignment, status update, and citizen feedback action is appended to the complaint timeline.
- CORS is restricted to the configured frontend origin.
- File uploads are limited to 4 MB in the API request path; production storage should be moved to object storage when evidence retention is required beyond the prototype.

## Evaluation rubric alignment

| Domain | Evidence in prototype |
|---|---|
| Problem understanding | Scenario-specific complaint, ward, department, ownership, and closure workflow |
| Research depth | Transparent civic loop, duplicate/repeat issue framing, and governance pattern watch |
| Architecture & technical depth | React/Vercel + Express/Render + Mongoose/Atlas, JWT, RBAC, audit timeline |
| Working prototype | Citizen, admin, reporting, tracking, assignment, status, and feedback flows |
| Experimental evidence | Seeded demo cases and admin metrics expose measurable counts and patterns |
| Resilience / live evaluation | Demo fallback works without an API connection; loading, empty, error, reopen, and overdue states are represented |
| Security / privacy / correctness | bcrypt, JWT, role guards, ownership checks, input validation, restricted CORS |
| Technical defense | Simple service boundaries, documented environment variables, explicit demo flow |
| Real-world impact | Designed around Nagpur wards and civic services that residents already report |
