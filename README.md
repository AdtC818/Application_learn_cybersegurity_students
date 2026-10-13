# Application Learn Cybersecurity Students

Static analysis tool that detects and pedagogically explains common security vulnerabilities in JavaScript/Node.js code, built for students and junior developers learning application security. Given a code snippet, it parses it into an AST (never executes it) and checks it against 12 vulnerability categories, returning, for each finding, a plain-language explanation of the risk and a concrete recommendation to fix it.

This is the software component of an undergraduate thesis project (Systems and Computer Engineering, UPTC), whose scope also includes a benchmark against Semgrep (precision/recall) and a perception/acceptance survey (run outside the app, e.g. with Google Forms) — not a measurement of learning outcomes.

## Vulnerability categories detected

1. SQL Injection
2. Cross-Site Scripting (XSS)
3. Hardcoded secrets/credentials
4. Weak cryptography (MD5/SHA1/DES, deprecated cipher APIs)
5. NoSQL Injection
6. Path Traversal
7. Prototype Pollution
8. CORS misconfiguration
9. Insecure session cookies
10. Server-Side Request Forgery (SSRF)
11. Dangerous functions (`eval`, `Function`, shell `exec`)
12. Sensitive data logging

## Architecture

**Monolito modular** with a **hexagonal / clean architecture** layering on the backend:

```
backend/src/
  domain/          # Entities, ports (interfaces) and the 12 detector strategies.
                    No dependency on Express, Prisma, or any framework.
  application/      # Use cases (orchestration) and the detector registry.
  infrastructure/   # Concrete adapters: Babel parser, Prisma repository, Express HTTP layer.
  config/           # Composition root (wires adapters into use cases).
```

Design patterns used, and why:

- **Strategy** — each of the 12 vulnerability checks implements `DetectorVulnerabilidad`. The use case just runs every registered strategy and merges the results; adding a 13th category never touches existing code.
- **Adapter** — `BabelParserAdapter` is the only file that imports `@babel/parser`. The rest of the system depends on the `ParserCodigo` port, so the parsing library could be swapped later without touching any detector.
- **Factory / Registry** — `RegistroDetectores` is the single place that knows about all 12 concrete detector classes.
- **Repository** — the `RepositorioAnalisis` port abstracts persistence; `PrismaRepositorioAnalisis` is the concrete Postgres-backed implementation. Tests use a simple in-memory fake instead.

**Important security note:** this tool only performs *static* analysis (AST inspection). It never executes submitted code (no `eval`, no `vm.Script`, no sandboxing) — user-submitted code is treated as untrusted input end-to-end.

## Stack

- **Backend:** TypeScript, Express, `@babel/parser` + `@babel/traverse` (AST), Prisma + PostgreSQL (analysis history), Zod (request validation), Vitest (tests).
- **Frontend:** React + Vite, TypeScript.
- **Deployment target (free tier):** Render/Railway (backend) + Vercel (frontend) + Neon/Supabase (Postgres) — nothing to install for the end user, everything runs in the browser.

## Getting started

### Backend

```bash
cd backend
npm install
cp .env.example .env        # fill in DATABASE_URL (e.g. a free Neon/Supabase Postgres)
npx prisma generate
npx prisma migrate dev      # creates the analisis table
npm run dev                 # http://localhost:3001
```

Run the detector test suite:

```bash
npm test
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # VITE_API_URL, defaults to http://localhost:3001/api
npm run dev                 # http://localhost:5173
```

### Both, from the repo root (npm workspaces)

```bash
npm install
npm run dev:backend   # in one terminal
npm run dev:frontend  # in another
```

## API

| Method | Route               | Description                                      |
|--------|---------------------|---------------------------------------------------|
| POST   | `/api/analizar`      | Analyzes a code snippet, returns the findings. Send `"guardarEnHistorial": true` to also save it. |
| GET    | `/api/historial`     | Lists recent saved analyses.                      |
| GET    | `/api/historial/:id` | Fetches one saved analysis.                       |

## Project status

Scaffolded end-to-end: all 12 detectors are implemented and unit-tested (36 passing tests), the Express API and the React UI are wired to each other, and Prisma persistence is modeled. The page lets you save an analysis to the history (with an optional hand-typed name) and lists the saved ones; the perception survey lives outside the app, so the app contains no survey code. Still pending: running a real Postgres migration, deploying to the free-tier targets above, and the Semgrep precision/recall benchmark described in the thesis.
