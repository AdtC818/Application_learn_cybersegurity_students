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

## Interactive labs

Besides the analyzer, the UI has a **lab for each of the 12 categories** (`#/labs`, or the "Learn with a lab" button on any finding). Each lab follows the same four stages, so a student never has to read a paragraph to get the idea:

1. **Understand** — a three-step picture of how the flaw works, plus the vulnerable code with the dangerous lines annotated.
2. **Attack** — a live simulation: the student types input (or picks a ready-made payload), watches an animated diagram of what happens, and flips between *vulnerable* and *safe* code to compare.
3. **Fix** — vulnerable and safe code side by side, with a copy button.
4. **Prove it** — a one-question challenge. Completed labs are remembered in the browser (`localStorage`).

Everything in the labs is a **client-side simulation**: nothing the student types is ever executed. The XSS preview lives in a `sandbox=""` iframe with a restrictive CSP, the SQL/NoSQL/prototype/path/SSRF/command examples run against small models written for the lab, and the crypto lab uses the browser's WebCrypto (PBKDF2) plus a TypeScript MD5 to measure real hashing speed on the student's own machine. Animations respect `prefers-reduced-motion`, and the diagrams stay legible on a phone.

```
frontend/src/
  contenido/       # Catalog of the 12 categories and the example snippets.
  componentes/     # Shell: header, hero, editor, results, gallery, learning panel, SVG scene pieces.
  labs/            # One component + one content file per lab; labs/logica/ holds the pure logic.
  hooks/           # Hash router, progress storage, reduced-motion.
  estilos/         # CSS: base tokens, app shell, shared lab pieces, per-lab styles.
```

The vulnerable snippet of every lab is written so that the real backend analyzer flags exactly the highlighted lines, and the safe snippet produces no findings. `npm run test:frontend` checks the lab logic and the structure of every lab's content.

## Stack

- **Backend:** TypeScript, Express, `@babel/parser` + `@babel/traverse` (AST), Prisma + PostgreSQL (analysis history), Zod (request validation), Vitest (tests).
- **Frontend:** React + Vite, TypeScript, plain CSS with design tokens, self-hosted fonts (`@fontsource`), Vitest for the lab logic.
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
npm run test:backend  # detector tests
npm run test:frontend # lab logic and content tests
```

## API

| Method | Route               | Description                                      |
|--------|---------------------|---------------------------------------------------|
| POST   | `/api/analizar`      | Analyzes a code snippet, returns the findings. Send `"guardarEnHistorial": true` to also save it. |
| GET    | `/api/historial`     | Lists recent saved analyses.                      |
| GET    | `/api/historial/:id` | Fetches one saved analysis.                       |

## Project status

Working end-to-end: all 12 detectors are implemented and unit-tested (36 backend tests), the Express API and the React UI are wired to each other, and the analysis history is persisted in PostgreSQL through Prisma. The UI includes the 12 interactive labs described above (91 frontend tests cover their logic and content). The page lets you save an analysis to the history (with an optional hand-typed name) and lists the saved ones; the perception survey lives outside the app, so the app contains no survey code. Still pending: deploying to the free-tier targets above and the Semgrep precision/recall benchmark described in the thesis.
