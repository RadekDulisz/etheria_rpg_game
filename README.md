# Webowa gra RPG — praca inżynierska

Przeglądarkowa gra RPG z architekturą chmurową..

## Stos technologiczny

- Backend: NestJS + TypeScript + Prisma + PostgreSQL + Redis
- Frontend: React + TypeScript + Vite + TailwindCSS + React Query
- Docker + docker-compose (środowisko lokalne)
- CI: GitHub Actions

## Uruchomienie lokalne

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health-check: http://localhost:3000/health

## Praca lokalna z Prisma CLI (migracje, `prisma studio`)

Prisma CLI szuka `.env` w katalogu, z którego jest uruchamiana — czyli
`backend/.env`, osobno od głównego `.env` używanego przez docker-compose
(inny host bazy: `localhost` zamiast `postgres`).

```bash
cd backend
cp .env.example .env
docker compose -f ../docker-compose.yml up -d postgres redis   # z katalogu backend
# albo z katalogu głównego: docker compose up -d postgres redis
npm install
npx prisma migrate dev --name init_schema
```

## Uruchomienie bez Dockera (dev)

```bash
# backend
cd backend
npm install
npx prisma generate
npm run start:dev

# frontend
cd frontend
npm install
npm run dev
```

## Testy

```bash
cd backend && npm run test
```

## Testy obciazeniowe (smoke)

```bash
docker compose up -d postgres redis backend
cd backend
npm run loadtest:smoke
```

Domyslnie test uderza w `GET /health` i ma bezpieczne tempo (`LOADTEST_OVERALL_RATE=1`),
zeby nie wpasc w globalny throttling podczas smoke testu.

## Wdrozenie (CD, VPS)

- Workflow: `.github/workflows/deploy-prod.yml`
- Orkiestracja: `docker-compose.prod.yml`
- Skrypt serwera: `scripts/deploy-prod.sh`

Deploy uruchamia sie recznie (`workflow_dispatch`) albo po tagu `v*.*.*`.
Wymaga skonfigurowania sekretow repo opisanych w `docs/etap-13-wdrozenie-i-obciazenie.md`.
