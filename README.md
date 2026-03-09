## DevOps Homework 5 – Multi-Service App (Backend + PostgreSQL, CI/CD with GitHub Actions, Docker, GHCR)

This project is a **university-level DevOps demo** that focuses on **CI/CD**, **containerization**, and **environments**, not on frontend or complex business logic.

Stack:
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **CI/CD**: GitHub Actions
- **Registry**: GitHub Container Registry (GHCR)
- **Deployment**: SSH to Linux server running Docker + Docker Compose

There is **no frontend** – the goal is to show DevOps concepts.

---

### 1. Architecture overview

- **backend service** (`backend`):
  - Simple Express API with:
    - `GET /health` – health check used by Docker and CI
    - `GET /items` – reads items from PostgreSQL
    - `POST /items` – inserts a new item into PostgreSQL
  - Uses environment variables for database connection.

- **db service** (`db`):
  - PostgreSQL container (`postgres:15-alpine`)
  - Credentials and database name come from env vars.

- **Docker Compose**:
  - `docker-compose.yml` – base definition for services.
  - `docker-compose.dev.yml` – overrides for Dev (builds backend locally, dev image tag).
  - `docker-compose.prod.yml` – overrides for Prod (uses `latest` tag).

- **CI/CD with GitHub Actions**:
  - `.github/workflows/ci.yml` – Continuous Integration for all branches / PRs.
  - `.github/workflows/deploy-dev.yml` – Continuous Deployment for **Dev** on `develop`.
  - `.github/workflows/deploy-prod.yml` – Deployment for **Prod** on `main` (with environment-level protections).

- **Deployment scripts**:
  - `scripts/deploy-dev.sh` – example deploy script for Dev.
  - `scripts/deploy-prod.sh` – example deploy script for Prod.

---

### 2. Project structure

```text
project-root/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── index.js
│   │   └── pgClient.js
│   ├── tests/
│   │   └── run-tests.js
│   └── .env.example
│
├── docker-compose.yml
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── .env.dev.example
├── .env.prod.example
│
├── scripts/
│   ├── deploy-dev.sh
│   └── deploy-prod.sh
│
└── .github/
    └── workflows/
        ├── ci.yml
        ├── deploy-dev.yml
        └── deploy-prod.yml
```

---

### 3. Backend service (Node.js + Express)

**Key points:**
- `backend/src/index.js`:
  - Creates an Express app.
  - `GET /health` returns `{ status: "ok", environment: NODE_ENV }`.
  - `GET /items` connects to PostgreSQL, ensures `items` table exists, returns all items.
  - `POST /items` inserts a new item (`name`) into the `items` table.
  - Uses `pgClient.js` and environment variables for DB config.

- `backend/src/pgClient.js`:
  - Wraps `pg.Client` using env vars:
    - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

- `backend/tests/run-tests.js`:
  - Very simple test using Node’s built-in `assert` module.
  - Demonstrates the **test step in CI** without adding heavy frameworks.

**NPM scripts (in `backend/package.json`):**
- `npm start` – run the backend.
- `npm test` – run the simple tests.

---

### 4. Docker and Docker Compose

#### 4.1 Backend Dockerfile

`backend/Dockerfile`:
- Multi-stage build:
  - `base` – install production dependencies, copy code.
  - `test` – install dev deps and run `npm test` (example of tests in image build).
  - `release` – final runtime image, exposes port `3000`, `npm start`.

This makes the container **reproducible** and suitable for CI/CD.

#### 4.2 docker-compose.yml (base)

Defines both services:
- `backend`:
  - Uses image: `ghcr.io/${GHCR_NAMESPACE}/backend:latest` (for Prod).
  - Depends on `db`.
  - Health check hitting `http://localhost:3000/health`.
- `db`:
  - Uses `postgres:15-alpine`.
  - Persists data with `db-data` volume.

#### 4.3 docker-compose.dev.yml

Overrides for **Dev**:
- `backend`:
  - Adds `build` context `./backend` with `Dockerfile`.
  - Uses image tag `ghcr.io/${GHCR_NAMESPACE}/backend:dev`.
  - Sets `NODE_ENV=development`.

Run locally for Dev:

```bash
cp .env.dev.example .env.dev   # adjust values
docker compose --env-file .env.dev -f docker-compose.yml -f docker-compose.dev.yml up --build
```

#### 4.4 docker-compose.prod.yml

Overrides for **Prod**:
- `backend`:
  - Uses `ghcr.io/${GHCR_NAMESPACE}/backend:latest`.
  - Sets `NODE_ENV=production`.

On the server:

```bash
cp .env.prod.example .env.prod  # adjust values
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

### 5. Environment variables and secrets

Example env files:
- `.env.dev.example`
- `.env.prod.example`
- `backend/.env.example`

You should set real values in:
- `.env.dev` on the Dev server.
- `.env.prod` on the Prod server.

**GitHub Secrets / Environments (recommended):**
- In repository settings:
  - Environments: `development`, `production`.
  - For `development`:
    - `DEV_HOST`, `DEV_USERNAME`, `DEV_SSH_KEY`
    - `DEV_APP_PATH` (directory on server where compose files live)
    - `DEV_DB_USER`, `DEV_DB_PASSWORD`, `DEV_DB_NAME`
  - For `production`:
    - `PROD_HOST`, `PROD_USERNAME`, `PROD_SSH_KEY`
    - `PROD_APP_PATH`
    - `PROD_DB_USER`, `PROD_DB_PASSWORD`, `PROD_DB_NAME`
  - Shared:
    - `GHCR_TOKEN` (e.g. Personal Access Token or fine-grained token with `packages:write`).

GitHub also provides `GITHUB_TOKEN` automatically for pushing images to GHCR from workflows.

---

### 6. GitHub Actions – CI/CD workflows

#### 6.1 CI workflow (`ci.yml`)

**Trigger:**
- On every `push` and `pull_request` to any branch.

**Steps:**
1. **Checkout repository** – get the code from GitHub.
2. **Set up Node.js** – install Node 20.
3. **Install backend dependencies** – `npm install` in `backend`.
4. **Run backend tests** – `npm test`.
5. **Build backend Docker image (no push)** – builds an image to validate Dockerfile (but does not push).

**Purpose:**
- This is **Continuous Integration (CI)**:
  - Every change is built and tested.
  - If tests or build fail, the pipeline fails and you don’t deploy.

#### 6.2 Dev deploy workflow (`deploy-dev.yml`)

**Trigger:**
- `push` to `develop` branch.

**Jobs:**
1. **build-and-push**:
   - Same build and test steps as CI.
   - Log in to GHCR with `docker/login-action`.
   - Build and push backend image tagged as:
     - `ghcr.io/<repo-owner>/backend:dev`
2. **deploy** (needs `build-and-push`):
   - Uses `appleboy/ssh-action` to SSH into the Dev server.
   - Exports GHCR and DB env vars from GitHub Secrets.
   - `docker login` to GHCR on the server.
   - Runs:
     - `docker compose --env-file .env.dev -f docker-compose.yml -f docker-compose.dev.yml pull`
     - `docker compose --env-file .env.dev -f docker-compose.yml -f docker-compose.dev.yml up -d --remove-orphans`

**This is Continuous Deployment (CD) for Dev**:
- Every push to `develop` automatically builds, tests, pushes images, and deploys to Dev.

#### 6.3 Prod deploy workflow (`deploy-prod.yml`)

**Trigger:**
- `push` to `main` branch.

**Jobs:**
1. **build-and-push**:
   - Same pattern as Dev, but image tag:
     - `ghcr.io/<repo-owner>/backend:latest`
2. **deploy**:
   - Runs in **`production` environment** (GitHub can require manual approval).
   - SSH into Prod server with `appleboy/ssh-action`.
   - Logs into GHCR, sets Prod DB vars.
   - Executes:
     - `docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml pull`
     - `docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans`

**Key idea:**
- **Dev** is auto-deployed from `develop`.
- **Prod** is deployed from `main` and can be protected by manual approvals in the `production` environment.

---

### 7. Deploy scripts (SSH + Docker Compose)

The workflows show **inline SSH commands**, but the repository also contains reusable scripts:

- `scripts/deploy-dev.sh`:
  - Logs into GHCR using `GHCR_USER` and `GHCR_TOKEN`.
  - Runs `docker compose` with `.env.dev` and Dev overrides.

- `scripts/deploy-prod.sh`:
  - Same as above, but uses `.env.prod` and Prod overrides.

You can:
- Copy these scripts to the server and run:

```bash
GHCR_USER=yourUser GHCR_TOKEN=yourToken ./scripts/deploy-dev.sh
```

or call them from the SSH workflow instead of inline commands.

---

### 8. How everything works together (end‑to‑end)

1. **Developer workflow:**
   - You develop features locally on a branch.
   - You push to GitHub.

2. **Continuous Integration (CI):**
   - `ci.yml` triggers on push/PR.
   - Backend is built and tests run.
   - Docker image build is validated.

3. **Dev deployment (develop branch):**
   - Push to `develop` triggers `deploy-dev.yml`.
   - Workflow builds, tests, logs into GHCR, pushes `backend:dev` image.
   - Workflow SSHes into Dev server, pulls image, and runs Docker Compose.

4. **Prod deployment (main branch):**
   - After code review, `develop` is merged into `main`.
   - Push to `main` triggers `deploy-prod.yml`.
   - Same build/push process, but image tag is `backend:latest`.
   - Workflow SSHes into Prod server, pulls image, restarts services using Prod config.

5. **Environments:**
   - Dev and Prod use different:
     - branches
     - image tags (`dev` vs `latest`)
     - env files / secrets
     - GitHub environments (development vs production)

---

### 9. Short presentation summary you can use

You can say something like:

> This project demonstrates a complete DevOps pipeline without a frontend.  
> The application is split into a backend API and a PostgreSQL database, each running in its own Docker container. Docker Compose defines both services and their connection. GitHub Actions provides CI and CD: every push triggers a pipeline that installs dependencies, runs tests, and builds Docker images. For the `develop` branch, images are tagged as `dev` and automatically deployed to a Dev server via SSH. For the `main` branch, images are tagged as `latest` and deployed to Production, protected by GitHub environments and approval rules. Docker images are stored in GitHub Container Registry (GHCR), so deployment servers only need to pull and run containers with Docker Compose. This setup closely mimics a real-world DevOps workflow with separate Dev and Prod environments.

---

### 10. How to run locally (optional)

1. Install Docker and Docker Compose.
2. Build and run:

```bash
cp .env.dev.example .env.dev
# adjust DB_USER, DB_PASSWORD, DB_NAME if needed

docker compose --env-file .env.dev -f docker-compose.yml -f docker-compose.dev.yml up --build
```

3. Test endpoints:
- Health:

```bash
curl http://localhost:3000/health
```

- List items:

```bash
curl http://localhost:3000/items
```

- Create item:

```bash
curl -X POST http://localhost:3000/items \
  -H "Content-Type: application/json" \
  -d '{"name": "example item"}'
```

This is enough to **demonstrate containers, Compose, CI, CD, GHCR, and environments** for your homework, without needing any frontend.

