# AIO Backend MSSQL

Express-based backend for the AIO system, using Microsoft SQL Server for persistence and JWT for authentication.

## Overview

This service exposes a set of role-protected business modules for areas like admin, HR, QA, payslip processing, invoice operations, destination management, debtor updates, and mail handling.

The current entrypoint is `server.js`, which:

- loads environment variables with `dotenv`
- starts an Express server with `cors` and JSON parsing
- mounts public auth routes
- protects business routes with JWT auth and role checks
- serves generated payslip files from a static directory

## Tech Stack

- Node.js
- Express 5
- Microsoft SQL Server via `mssql`
- JWT via `jsonwebtoken`
- Password hashing with `bcrypt`
- Mail delivery with `nodemailer`
- Excel generation with `exceljs`

## Project Structure

```text
.
|-- auth.routes.js
|-- server.js
|-- db/
|   |-- mssql.js
|   |-- auth.db.js
|   `-- *.db.js
|-- middleware/
|   |-- auth.js
|   |-- requireAnyRole.js
|   `-- requireRole.js
|-- modules/
|   |-- admin/
|   |-- debtClsUpd/
|   |-- debtorUpd/
|   |-- destination/
|   |-- division/
|   |-- hr/
|   |-- invoice/
|   |-- invoiceDateChange/
|   |-- mail/
|   |-- payslip/
|   |-- qa/
|   `-- thicknessChange/
`-- services/
    `-- mail.service.js
```

## Authentication and Authorization

Authentication is handled through `POST /login`.

Login flow:

1. The backend fetches the user by `username`.
2. It rejects inactive users.
3. It verifies the submitted password against `password_hash` using `bcrypt`.
4. It loads the user’s roles from the database.
5. It returns a JWT containing `id`, `username`, and `roles`.

Protected routes require this header:

```http
Authorization: Bearer <token>
```

Role checks are enforced by `middleware/requireAnyRole.js`.

## Route Map

### Public routes

- `POST /login`
- `GET /health`

### Protected routes

- `/admin` - admin-only features
- `/hr` - roles: `hr`, `admin`
- `/qa` - roles: `qa`, `qa-request`, `admin`
- `/payslip` - roles: `payslip`, `admin`
- `/destination` - role: `admin`
- `/invoice` - role: `admin`
- `/thickness-change` - role: `admin`
- `/division-request` - role: `admin`
- `/invoice-date-change` - role: `admin`
- `/debtorUpd` - role: `admin`
- `/debtClsUpd` - role: `admin`
- `/mail` - roles: `mail`, `admin`

### Static files

- `/payslip-files` serves files from `modules/payslip/output`

## Environment Variables

Create a `.env` file in the project root with the following keys:

```env
PORT=3001

DB_SERVER=
DB_PORT=1433
DB_USER=
DB_PASSWORD=
DB_NAME=

MAIL_USER=
MAIL_PASS=

JWT_SECRET=
```

### Important implementation note

`db/mssql.js` currently hardcodes these SQL connection options:

- `encrypt: true`
- `trustServerCertificate: true`
- `useUTC: false`

That means values like `DB_ENCRYPT` and `DB_TRUST_CERT` are not currently being read from `.env`, even if they exist there.

## Database Notes

The auth module expects at least these tables:

- `users`
- `roles`
- `user_roles`

Observed auth-related columns in use:

- `users.id`
- `users.username`
- `users.password_hash`
- `users.is_active`
- `roles.id`
- `roles.name`
- `user_roles.user_id`
- `user_roles.role_id`

Database access is organized through:

- `db/mssql.js` for pooled SQL Server connections and generic query helpers 
- module-specific. `*.db.js` files for feature queries

## Getting Started

### 1. Install dependencies

```bash
npm install
``` 

### 2. Configure environment variables

Create `.env` in the root and fill in the database, mail, and JWT values.

### 3. Start the server

There is no `start` script in `package.json` right now, so run:

```bash
node server.js
```

By default the app listens on port `3001` if `PORT` is not set.

### 4. Verify the server

Open:

```text
http://localhost:3001/health
```

Expected response:

```json
{ "status": "AIO backend running" }
```

## Example Login Request

```bash
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"your-user\",\"password\":\"your-password\"}"
```

Expected response shape:

```json
{
  "token": "jwt-token-here"
}
```

## Current Limitations

- `package.json` does not define a usable `start` or test script.
- `package.json` still points `main` to `index.js`, but the actual runtime entrypoint is `server.js`.
- SQL connection security options are hardcoded in code rather than fully driven by environment variables.

## Security

- Do not commit `.env`.
- Rotate any database, mail, or JWT secrets that may have been exposed.
- Use a strong `JWT_SECRET` in non-local environments.
- Review `trustServerCertificate: true` before production deployment.
