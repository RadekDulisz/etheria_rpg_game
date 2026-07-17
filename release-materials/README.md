# Kroniki Etherii

Przeglądarkowa gra RPG przygotowana jako projekt inżynierski. Aplikacja składa się z frontendu React, backendu NestJS oraz usług PostgreSQL i Redis.

## Wymagania

- Docker Desktop z obsługą `docker compose`
- około 2 GB wolnej pamięci RAM
- wolne porty: `5173`, `3000`, `5432` i `6379`

Nie trzeba instalować Node.js, PostgreSQL ani Redis lokalnie.

## Uruchomienie

1. Rozpakuj archiwum.
2. Otwórz terminal w rozpakowanym katalogu.
3. Uruchom:

```bash
docker compose up --build
```

Pierwsze uruchomienie może potrwać kilka minut, ponieważ Docker pobiera obrazy, buduje aplikację, wykonuje migracje bazy i dodaje dane początkowe.

Po pojawieniu się komunikatu o uruchomieniu usług otwórz:

- aplikacja: http://localhost:5173
- kontrola działania API: http://localhost:3000/health

Następnie wybierz rejestrację, utwórz konto i nadaj imię bohaterowi. Dane przedmiotów, przeciwników i sklepów są przygotowywane automatycznie.

## Zatrzymanie

```bash
docker compose down
```

Stan gry pozostanie zapisany w wolumenie Dockera. Aby usunąć również dane i rozpocząć od czystej bazy:

```bash
docker compose down -v
```

## Najważniejsze funkcje

- rejestracja, logowanie i bezpieczna sesja użytkownika,
- rozwój bohatera, poziomy, doświadczenie, HP i reputacja,
- rozdawanie punktów STR, DEX, CON i INT,
- plecak, sloty wyposażenia oraz statystyki przedmiotów,
- targowisko z losową ofertą, rzadkością i rabatami,
- stały katalog kupca z kategoriami, rangami i paginacją,
- wyprawy PvE z pięcioma stopniami ryzyka, wyborem moralnym i animowanym przebiegiem,
- arena z automatycznym doborem przeciwnika i odtwarzaniem walki runda po rundzie,
- regeneracja zdrowia i system reputacji od −10 000 do 10 000,
- API administracyjne do zarządzania przedmiotami i przeciwnikami.

Opis wraz ze zrzutami ekranu znajduje się w plikach `PREZENTACJA_FUNKCJI.pdf` oraz `PREZENTACJA_FUNKCJI.html`.

## Architektura

- Frontend: React, TypeScript, Vite, Tailwind CSS, TanStack Query
- Backend: NestJS, TypeScript, Prisma ORM
- Dane: PostgreSQL
- Sesje, tokeny odświeżania i ograniczenia czasowe: Redis
- Środowisko: Docker Compose

## Testy backendu

Po uruchomieniu projektu można wykonać:

```bash
docker compose exec backend npm test -- --runInBand
```

