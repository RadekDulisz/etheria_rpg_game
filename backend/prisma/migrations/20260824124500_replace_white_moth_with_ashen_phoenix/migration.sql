-- Replace the White Moth concept while preserving existing player progress.
UPDATE "tavern_offers"
SET "templateKey" = 'ashen-phoenix-order',
    "title" = 'Popiół nie zapomina',
    "summary" = 'Archiwista Zakonu Popielnego Feniksa uciekł z Sercem Pierwszego Stosu — reliktem przechowującym wspomnienia spalonych skrybów. Zakon ogłosił go zdrajcą, lecz Mira twierdzi, że odkrył, kogo naprawdę złożono w rytuale odrodzenia.',
    "encounterSummary" = 'Spalone archiwum · próba DEX lub INT · Varek, Popielny Tropiciel · Morvath, Ostatni Rycerz Feniksa'
WHERE "templateKey" = 'white-moth-hunter';

UPDATE "tavern_quest_runs"
SET "templateKey" = 'ashen-phoenix-order',
    "title" = 'Popiół nie zapomina',
    "summary" = 'Archiwista Zakonu Popielnego Feniksa uciekł z Sercem Pierwszego Stosu — reliktem przechowującym wspomnienia spalonych skrybów. Zakon ogłosił go zdrajcą, lecz Mira twierdzi, że odkrył, kogo naprawdę złożono w rytuale odrodzenia.',
    "endingKey" = REPLACE("endingKey", 'white-moth-hunter', 'ashen-phoenix-order')
WHERE "templateKey" = 'white-moth-hunter';

UPDATE "tavern_chronicle_entries"
SET "templateKey" = 'ashen-phoenix-order',
    "title" = 'Popiół nie zapomina',
    "bestEndingKey" = REPLACE("bestEndingKey", 'white-moth-hunter', 'ashen-phoenix-order')
WHERE "templateKey" = 'white-moth-hunter';

UPDATE "tavern_chronicle_endings"
SET "endingKey" = REPLACE("endingKey", 'white-moth-hunter', 'ashen-phoenix-order')
WHERE "endingKey" LIKE 'white-moth-hunter:%';

UPDATE "tavern_quest_puzzles"
SET "puzzleKey" = 'phoenix-rebirth-rite'
WHERE "puzzleKey" = 'moth-cipher';

UPDATE "tavern_quest_encounters"
SET "enemyKey" = 'phoenix-hunter',
    "enemyName" = 'Varek, Popielny Tropiciel',
    "enemyTitle" = 'Egzekutor Pierwszego Stosu',
    "enemyIllustrationUrl" = '/assets/tavern/enemies/phoenix-hunter-v2.png'
WHERE "enemyKey" = 'moth-mercenary';

UPDATE "tavern_quest_encounters"
SET "enemyKey" = 'phoenix-revenant',
    "enemyName" = 'Morvath, Ostatni Rycerz Feniksa',
    "enemyTitle" = 'Strażnik Pierwszego Stosu',
    "enemyIllustrationUrl" = '/assets/tavern/enemies/phoenix-revenant-v2.png'
WHERE "enemyKey" = 'moth-revenant';

UPDATE "items"
SET "name" = 'Serce Pierwszego Stosu',
    "description" = 'W czarnym szkle tli się popiół skrybów, których imiona miały odrodzić się wyłącznie na rozkaz Avarrenów.',
    "iconUrl" = 'story-relic:ashen-phoenix-order'
WHERE "iconUrl" = 'story-relic:white-moth-hunter';
