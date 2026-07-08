# Backend AGENTS.md

Stack: **Node.js + Express + TypeScript + PostgreSQL (raw `pg`, no ORM)**
Package manager: **npm**
Repo: standalone (`/backend`), consumed by a separate frontend repo over HTTP + cookies.

This document is the source of truth for how this backend should be structured and built.
Follow it phase by phase. Don't jump ahead — each phase should be working and committed
before starting the next one.

---

## 1. Guiding principles

- **Modular, not layered-by-file-type.** Group code by _feature/domain_ (`auth`, `user`, ...),
  not by technical type (`controllers/`, `services/`) at the top level. Within a module, use
  the technical split (controller → service → repository).
- **Raw SQL, always parameterized.** No ORM. Every query goes through `pg`'s parameterized
  query syntax (`$1, $2, ...`). Never build SQL with string concatenation/template literals
  from user input.
- **Thin controllers, fat services.** Controllers only parse the request, call a service,
  and shape the response. Business logic lives in services. DB access lives in repositories.
- **One source of truth for env vars**, validated at startup (fail fast if missing).
- **Consistent API contract**: every response (success or error) follows the same JSON shape,
  so the frontend can rely on it.
- **Security by default**: hashed passwords, httpOnly cookies, helmet, CORS locked to the
  frontend origin, rate limiting on auth routes.

---

## 2. Folder structure

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts              # loads & validates process.env (zod)
│   │   └── db.ts                # pg Pool instance, exported
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repository.ts   # raw SQL for users (insert/find by email)
│   │   │   ├── auth.schema.ts       # zod schemas for register/login payloads
│   │   │   └── auth.types.ts
│   │   │
│   │   └── user/
│   │       ├── user.routes.ts
│   │       ├── user.controller.ts
│   │       ├── user.service.ts
│   │       ├── user.repository.ts
│   │       └── user.types.ts
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.ts       # verifies JWT cookie, attaches req.user
│   │   ├── validate.middleware.ts   # generic zod-body validator
│   │   ├── errorHandler.middleware.ts
│   │   ├── notFound.middleware.ts
│   │   └── rateLimiter.middleware.ts
│   │
│   ├── db/
│   │   ├── migrations/              # numbered .sql files, applied in order
│   │   │   └── 0001_create_users_table.sql
│   │   └── migrate.ts               # tiny script that runs pending migrations
│   │
│   ├── routes/
│   │   └── index.ts                 # mounts all module routers under /api
│   │
│   ├── utils/
│   │   ├── ApiError.ts              # custom error class (statusCode, message)
│   │   ├── ApiResponse.ts           # success response shaper
│   │   ├── asyncHandler.ts          # wraps async route handlers, forwards errors
│   │   ├── logger.ts                # pino/console wrapper
│   │   └── jwt.ts                   # sign/verify helpers
│   │
│   ├── types/
│   │   └── express.d.ts             # augments Express Request with `user`
│   │
│   ├── app.ts                       # express app: middleware wiring, no listen()
│   └── server.ts                    # imports app, starts listener, graceful shutdown
│
├── .env.example
├── .env                              # gitignored
├── .gitignore
├── package.json
├── tsconfig.json
└── nodemon.json
```

**Why this shape:** when the app grows past `auth`/`user`, you add a new folder under
`modules/`, not new files scattered across five global folders. Each module is a
self-contained vertical slice.

---

## 3. Conventions

### TypeScript

- `strict: true` in `tsconfig.json`, no exceptions. Also enable `noUncheckedIndexedAccess`.
- No `any`. If a shape is genuinely unknown, use `unknown` and narrow it.
- Path alias `@/*` → `src/*` to avoid `../../../` imports.
- Every module exports explicit types for its request/response payloads (`auth.types.ts`).

### Validation

- Use **zod** for both env var validation and request body validation.
- `validate.middleware.ts` takes a zod schema and validates `req.body` before the controller
  runs — controllers should never manually check `if (!email) ...`.

### Database access

- `pg.Pool`, one shared instance from `config/db.ts`, imported wherever needed.
- All queries live in `*.repository.ts` files — never write raw SQL inside a service or
  controller. This keeps SQL centralized and testable.
- Migrations are plain numbered `.sql` files run in order by a small script
  (`db/migrate.ts`) that tracks applied migrations in a `_migrations` table. No heavy
  migration framework needed for a project this size — but the pattern must stay
  disciplined (never edit an already-applied migration; add a new one).

### Error handling

- Services/controllers throw `ApiError(statusCode, message)` for expected failures
  (e.g. "email already registered" → 409).
- A single `errorHandler.middleware.ts` at the end of the middleware chain catches
  everything (via `asyncHandler` wrapping) and returns the consistent error shape.
- Response shape (always):
  ```json
  // success
  { "success": true, "data": { ... }, "message": "optional" }
  // error
  { "success": false, "message": "Email already registered", "errors": null }
  ```

### Environment variables

`.env.example` (committed, no real secrets):

```
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/app_db
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
COOKIE_NAME=session_token
CLIENT_ORIGIN=http://localhost:5173
```

`config/env.ts` parses `process.env` through a zod schema at startup and throws immediately
if anything required is missing — never let the app boot into a half-configured state.

---

## 4. Authentication flow (important — read before Phase 3)

"Token set on the session, removed automatically on logout" = **JWT stored in an httpOnly,
secure, sameSite cookie** — not `express-session`, not localStorage.

- **Login/Register success** → sign a JWT (`userId`, short payload) → set it via
  `res.cookie(COOKIE_NAME, token, { httpOnly: true, secure: <prod>, sameSite: 'lax', maxAge })`.
- **Every protected request** → `auth.middleware.ts` reads the cookie, verifies the JWT,
  attaches `req.user = { id, email }`, or throws 401.
- **Logout** → `res.clearCookie(COOKIE_NAME)`. No server-side token store needed since JWT
  is stateless; the cookie disappearing is what "removes it automatically."
- Cookie is httpOnly so the frontend JS never touches the raw token — it just calls
  `/api/auth/me` to ask "am I logged in", the browser attaches the cookie automatically.
- CORS must be configured with `origin: CLIENT_ORIGIN, credentials: true` or the cookie
  won't be sent/received cross-origin.

Passwords: hashed with **bcrypt** (cost factor 10–12), never stored or logged in plaintext.

---

## 5. Build phases

Work through these in order. Each phase = one working, testable increment.

### Phase 0 — Project bootstrap

**Initialization commands** (run in order, from the parent folder where you want `backend/`):

```bash
# 1. Create project folder and init npm
mkdir backend && cd backend
npm init -y

# 2. Runtime dependencies
npm install express pg dotenv zod bcrypt jsonwebtoken cookie-parser cors helmet express-rate-limit

# 3. Dev dependencies (TypeScript + tooling)
npm install -D typescript ts-node-dev tsconfig-paths tsc-alias @types/node @types/express \
  @types/pg @types/bcrypt @types/jsonwebtoken @types/cookie-parser @types/cors \
  eslint prettier eslint-config-prettier

# 4. Generate tsconfig.json, then edit it to enable strict mode + path alias (see below)
npx tsc --init

# 5. Scaffold the folder structure
mkdir -p src/config src/modules/auth src/modules/user src/middlewares \
  src/db/migrations src/routes src/utils src/types

# 6. Create env + git files
touch .env .env.example .gitignore
echo -e "node_modules\ndist\n.env" > .gitignore
```

**`tsconfig.json`** — after `npx tsc --init`, make sure these are set:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

**`package.json` scripts** to add manually:

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only -r tsconfig-paths/register src/server.ts",
    "build": "tsc && tsc-alias",
    "start": "node dist/server.js",
    "migrate": "ts-node-dev --transpile-only -r tsconfig-paths/register src/db/migrate.ts",
    "lint": "eslint src --ext .ts"
  }
}
```

> `tsconfig-paths` resolves the `@/*` alias at dev-time; `tsc-alias` rewrites those aliases
> back to relative paths in the compiled `dist/` output, since Node can't resolve `@/*` on
> its own at runtime.

- Fill in `.env` / `.env.example` per the variables listed in section 3.

### Phase 1 — Database

- Local Postgres running, `DATABASE_URL` in `.env`.
- `config/db.ts`: `pg.Pool` from `DATABASE_URL`.
- First migration: `0001_create_users_table.sql` (`id`, `email` unique, `password_hash`,
  `created_at`).
- `db/migrate.ts` applies it. Verify manually with `psql`.

### Phase 2 — App skeleton & cross-cutting middleware

- `app.ts`: `helmet()`, `cors()` (locked to `CLIENT_ORIGIN`, `credentials: true`),
  `express.json()`, `cookie-parser()`, mount `routes/index.ts`, `notFound`, `errorHandler`.
- `server.ts`: start listener, graceful shutdown on `SIGTERM` (close `pool`).
- `GET /health` route returning `{ status: "ok" }` — useful now, essential later for
  Docker healthchecks.
- `ApiError`, `ApiResponse`, `asyncHandler`, `logger` utils.

### Phase 3 — Register

- `auth.schema.ts`: zod schema for `{ email, password }`.
- `auth.repository.ts`: `findUserByEmail`, `createUser`.
- `auth.service.ts`: check duplicate email → 409, hash password, insert user.
- `auth.controller.ts` + route: `POST /api/auth/register` → 201 with public user shape
  (never return `password_hash`).

### Phase 4 — Login

- `auth.service.ts`: find user, compare bcrypt hash, sign JWT.
- `auth.controller.ts`: on success, set the httpOnly cookie, return public user data.
- Apply `rateLimiter.middleware.ts` to this route (e.g. 10 attempts / 15 min).

### Phase 5 — Auth middleware & protected route

- `auth.middleware.ts`: read cookie → verify JWT → attach `req.user` → `next()`, else 401.
- `user.module`: `GET /api/user/me` (protected) returns the current user — this is what the
  frontend calls on app load to restore session state.

### Phase 6 — Logout

- `POST /api/auth/logout`: `res.clearCookie(COOKIE_NAME)`, return success. No auth
  middleware needed, but harmless if applied.

### Phase 7 — Hardening pass

- Confirm no route ever leaks `password_hash`.
- Confirm all inputs are validated (zod) before touching the DB.
- Confirm every DB query is parameterized.
- Add basic request logging (method, path, status, duration).
- Double check cookie flags for prod (`secure: true`, correct `sameSite`) vs dev.

### Phase 8 — Docker readiness (do NOT do until told)

- Multi-stage `Dockerfile` (build stage compiles TS → `dist/`, runtime stage only ships
  `dist/` + prod deps).
- `.dockerignore` (`node_modules`, `.env`, `dist`).
- `/health` endpoint already exists (Phase 2) for `HEALTHCHECK`.
- `DATABASE_URL` will need to point at a Docker service name instead of `localhost` —
  no code changes needed since it's already env-driven.

---

## 6. Definition of done (for this whole build, pre-Docker)

- [ ] Can register a new user, duplicate email correctly rejected.
- [ ] Can log in, httpOnly cookie is set, visible in browser devtools with correct flags.
- [ ] `/api/user/me` returns the user only when the cookie is valid.
- [ ] Can log out, cookie is cleared, `/api/user/me` now returns 401.
- [ ] All secrets come from `.env`, nothing hardcoded.
- [ ] `npm run build` produces clean `dist/`, `npm start` runs it.
