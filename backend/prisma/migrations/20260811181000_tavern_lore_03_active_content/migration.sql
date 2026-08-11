UPDATE "tavern_offers"
SET
  "title" = 'Ostatnia Warta na Równinach',
  "region" = 'Popielny Trakt',
  "summary" = 'Strażnik Caed porzucił posterunek i zabrał Kryształ Odnowy. Garnizon żąda zwrotu reliktu, lecz nocą na Równinach zapłonęła latarnia osady, której nie ma na żadnej mapie.',
  "stageCount" = 4,
  "encounterSummary" = 'Śledztwo · rytuał chorągwi · los uchodźców · Popielna Sfora'
WHERE "templateKey" = 'ash-road-lantern';

UPDATE "tavern_offers"
SET
  "title" = 'Milczenie Zatopionej Iglicy',
  "region" = 'Mokradła Vael',
  "summary" = 'Ekspedycja Kolegium zniknęła w białej iglicy Vael. Zakon nazywa jej strażnika spaczonym, lecz Mira rozpoznała na rozkazie pieczęć rodu, który kazał otworzyć pradawne śluzy.',
  "stageCount" = 5,
  "encounterSummary" = 'Obóz ekspedycji · rycerz topieli · rytuał Vael · Strażnik Iglicy'
WHERE "templateKey" = 'stone-bridge-voices';

UPDATE "tavern_offers"
SET
  "title" = 'Przebudzenie w Nekropolii',
  "region" = 'Katakumby Asterionu',
  "summary" = 'Golem Pieczęci maszeruje ku Etherii z Rdzeniem Latarni w piersi. Zakon chce go roztrzaskać, Kolegium przejąć, a płaskorzeźby twierdzą, że konstrukt próbuje wykonać ostatnią naprawę.',
  "stageCount" = 5,
  "encounterSummary" = 'Dolne nawy · Kościany Kustosz · rozkaz Asteriona · Golem Pieczęci'
WHERE "templateKey" = 'bone-chimera-heart';

UPDATE "tavern_quest_runs"
SET
  "title" = 'Ostatnia Warta na Równinach',
  "region" = 'Popielny Trakt',
  "summary" = 'Strażnik Caed porzucił posterunek i zabrał Kryształ Odnowy. Garnizon żąda zwrotu reliktu, lecz nocą na Równinach zapłonęła latarnia osady, której nie ma na żadnej mapie.',
  "stageCount" = 4
WHERE "templateKey" = 'ash-road-lantern' AND "status" = 'ACTIVE';

UPDATE "tavern_quest_runs"
SET
  "title" = 'Milczenie Zatopionej Iglicy',
  "region" = 'Mokradła Vael',
  "summary" = 'Ekspedycja Kolegium zniknęła w białej iglicy Vael. Zakon nazywa jej strażnika spaczonym, lecz Mira rozpoznała na rozkazie pieczęć rodu, który kazał otworzyć pradawne śluzy.',
  "stageCount" = 5
WHERE "templateKey" = 'stone-bridge-voices' AND "status" = 'ACTIVE';

UPDATE "tavern_quest_runs"
SET
  "title" = 'Przebudzenie w Nekropolii',
  "region" = 'Katakumby Asterionu',
  "summary" = 'Golem Pieczęci maszeruje ku Etherii z Rdzeniem Latarni w piersi. Zakon chce go roztrzaskać, Kolegium przejąć, a płaskorzeźby twierdzą, że konstrukt próbuje wykonać ostatnią naprawę.',
  "stageCount" = 5
WHERE "templateKey" = 'bone-chimera-heart' AND "status" = 'ACTIVE';
