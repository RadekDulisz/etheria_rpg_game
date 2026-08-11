import { expRequiredForLevel } from '../characters/leveling';

export type TavernDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface TavernQuestTemplate {
  key: string;
  difficulty: TavernDifficulty;
  title: string;
  region: string;
  summary: string;
  stageCount: number;
  encounterSummary: string;
}

export const TAVERN_QUEST_TEMPLATES: TavernQuestTemplate[] = [
  {
    key: 'ash-road-lantern', difficulty: 'EASY', title: 'Ostatnia Warta na Równinach', region: 'Popielny Trakt', stageCount: 4,
    summary: 'Strażnik Caed porzucił posterunek i zabrał Kryształ Odnowy. Garnizon żąda zwrotu reliktu, lecz nocą na Równinach zapłonęła latarnia osady, której nie ma na żadnej mapie.',
    encounterSummary: 'Śledztwo · rytuał chorągwi · los uchodźców · Vargan, Ogar Popielnej Chorągwi',
  },
  {
    key: 'mill-below-walls', difficulty: 'EASY', title: 'Cisza pod starym młynem', region: 'Przedmieścia Etherii', stageCount: 3,
    summary: 'Młynarz przestał dostarczać mąkę, lecz jego koło obraca się każdej nocy. Borwin podejrzewa, że ktoś używa piwnic pod budynkiem.',
    encounterSummary: 'Śledztwo · próba atrybutu · Grumar, Pan Krwawego Żarna',
  },
  {
    key: 'vael-courier', difficulty: 'EASY', title: 'List pachnący mokradłem', region: 'Mokradła Vael', stageCount: 3,
    summary: 'Przemoczony posłaniec dotarł do karczmy bez pamięci i bez lewej rękawicy. Nadal ściska list zaadresowany do osoby, która nie żyje od trzydziestu lat.',
    encounterSummary: 'Rozmowa · wybór trasy · Neriel, Widmo Martwego Listu',
  },
  {
    key: 'stone-bridge-voices', difficulty: 'MEDIUM', title: 'Milczenie Zatopionej Iglicy', region: 'Mokradła Vael', stageCount: 5,
    summary: 'Ekspedycja Kolegium zniknęła w białej iglicy Vael. Zakon nazywa jej strażnika spaczonym, lecz Mira rozpoznała na rozkazie pieczęć rodu, który kazał otworzyć pradawne śluzy.',
    encounterSummary: 'Obóz ekspedycji · Topielny Rycerz · rytuał Vael · Avarion, Strażnik Iglicy',
  },
  {
    key: 'white-moth-hunter', difficulty: 'MEDIUM', title: 'Łowca Białej Ćmy', region: 'Krucze Turnie', stageCount: 4,
    summary: 'Badacz ruin uciekł z reliktem Bractwa Białej Ćmy. Najemnicy chcą jego głowy, lecz Mira twierdzi, że mężczyzna próbował przed czymś ostrzec Etherię.',
    encounterSummary: 'Przesłuchanie · próba DEX lub INT · Varek · Morvath, Rycerz Białej Ćmy',
  },
  {
    key: 'raven-tithe', difficulty: 'MEDIUM', title: 'Krucza dziesięcina', region: 'Krucze Turnie', stageCount: 4,
    summary: 'Górska osada płaci daninę istocie, której nikt nie widział z bliska. W tym miesiącu zamiast srebra zażądano pierworodnego dziecka sołtysa.',
    encounterSummary: 'Decyzja moralna · Krucza Poborczyni · Azhara, Królowa Turni',
  },
  {
    key: 'drowned-bells', difficulty: 'HARD', title: 'Dzwony zatopionej kaplicy', region: 'Mokradła Vael', stageCount: 5,
    summary: 'Spod czarnej wody rozlega się dzwon, a mieszkańcy Vael idą za jego głosem i nie wracają. Ostatniej nocy zadzwonił trzynaście razy.',
    encounterSummary: 'Śledztwo · zagadka dzwonów · Kantorka Głębin · Nerathis',
  },
  {
    key: 'bone-chimera-heart', difficulty: 'HARD', title: 'Przebudzenie w Nekropolii', region: 'Katakumby Asterionu', stageCount: 5,
    summary: 'Arkhadar, Tytan Ostatniej Pieczęci, maszeruje ku Etherii z Rdzeniem Latarni w piersi. Zakon chce go roztrzaskać, Kolegium przejąć, a płaskorzeźby twierdzą, że konstrukt próbuje wykonać ostatnią naprawę.',
    encounterSummary: 'Dolne nawy · Ossuaryjny Prefekt · rozkaz Asteriona · Arkhadar',
  },
  {
    key: 'last-seal-asterion', difficulty: 'HARD', title: 'Ostatnia Pieczęć Asterionu', region: 'Bezgwiezdne Rubieże', stageCount: 5,
    summary: 'Kultyści odnaleźli bramę Pierwszego Królestwa. Borwin ma mapę prowadzącą do jej wnętrza, lecz część szlaku wymazano ludzką krwią.',
    encounterSummary: 'Bezgwiezdny Kantor · Ser Caldris · Asterion Bez Korony',
  },
];

const DIFFICULTY_BALANCE = {
  EASY: { gold: [25, 7, 40, 10], xp: [3, 4.5], item: 8, gem: 6, hp: [6, 12], levelOffset: 0 },
  MEDIUM: { gold: [60, 13, 95, 19], xp: [6, 8], item: 16, gem: 12, hp: [14, 25], levelOffset: 0 },
  HARD: { gold: [130, 24, 210, 35], xp: [10, 14], item: 30, gem: 22, hp: [26, 45], levelOffset: 1 },
} as const;

export function tavernRefreshCost(level: number, refreshesUsed: number): number {
  const base = 5 + 2 * Math.max(1, level);
  return base * ([1, 2, 4][refreshesUsed] ?? 4);
}

export function buildTavernOffers(
  level: number,
  excludedKeys: string[] = [],
  rng: () => number = Math.random,
) {
  const experienceThreshold = Number(expRequiredForLevel(Math.max(1, level)));
  return (['EASY', 'MEDIUM', 'HARD'] as const).map((difficulty) => {
    const all = TAVERN_QUEST_TEMPLATES.filter((entry) => entry.difficulty === difficulty);
    const available = all.filter((entry) => !excludedKeys.includes(entry.key));
    const pool = available.length ? available : all;
    const template = pool[Math.floor(rng() * pool.length)] ?? pool[0];
    const balance = DIFFICULTY_BALANCE[difficulty];
    return {
      templateKey: template.key,
      difficulty,
      title: template.title,
      region: template.region,
      summary: template.summary,
      stageCount: template.stageCount,
      recommendedLevel: Math.max(1, level + balance.levelOffset),
      encounterSummary: template.encounterSummary,
      goldMin: balance.gold[0] + balance.gold[1] * level,
      goldMax: balance.gold[2] + balance.gold[3] * level,
      experienceMin: BigInt(Math.max(1, Math.ceil(experienceThreshold * balance.xp[0] / 100))),
      experienceMax: BigInt(Math.max(1, Math.ceil(experienceThreshold * balance.xp[1] / 100))),
      itemChance: balance.item,
      gemChance: balance.gem,
      hpRiskMinPercent: balance.hp[0],
      hpRiskMaxPercent: balance.hp[1],
    };
  });
}
