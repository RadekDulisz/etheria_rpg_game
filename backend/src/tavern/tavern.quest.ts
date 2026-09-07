import type { TavernChoiceAlignment, TavernQuestDifficulty } from '@prisma/client';
import { getTavernEnemy, isTavernCombatStage } from './tavern.encounters';
import { getTavernPuzzle, isTavernPuzzleStage, type TavernPuzzleKind, type TavernPuzzleOption } from './tavern.puzzles';

export type TavernAttribute = 'STR' | 'DEX' | 'CON' | 'INT';

export interface TavernStageChoice {
  id: string;
  title: string;
  description: string;
  alignment: TavernChoiceAlignment;
  attribute: TavernAttribute;
  riskModifier: number;
  reputationDelta: number;
  successText: string;
  failureText: string;
}

export interface TavernChoiceStage {
  type: 'CHOICE';
  index: number;
  kicker: string;
  title: string;
  narrative: string;
  choices: TavernStageChoice[];
}

export interface TavernCombatStage {
  type: 'COMBAT';
  index: number;
  kicker: string;
  title: string;
  narrative: string;
  enemy: ReturnType<typeof getTavernEnemy>;
  finalEncounter: boolean;
}

export interface TavernPuzzleStage {
  type: 'PUZZLE';
  index: number;
  kicker: string;
  title: string;
  narrative: string;
  puzzleKey: string;
  kind: TavernPuzzleKind;
  prompt: string;
  instruction: string;
  options: TavernPuzzleOption[];
  requiredSelections: number;
  attempts: number;
  maxAttempts: number;
  feedback: string | null;
  hint: string | null;
}

export type TavernStage = TavernChoiceStage | TavernCombatStage | TavernPuzzleStage;

interface QuestIdentity {
  templateKey: string;
  title: string;
  region: string;
  summary: string;
  difficulty: TavernQuestDifficulty;
  stageIndex: number;
  stageCount: number;
  score: number;
  decisions?: Array<{ choiceId: string; alignment: TavernChoiceAlignment }>;
  puzzles?: Array<{ stageIndex: number; attempts: number; maxAttempts: number; solved: boolean | null; outcomeText: string | null }>;
}

const REGION_ATMOSPHERE: Record<string, string> = {
  'Popielny Trakt': 'Wiatr przesuwa popiół po kamieniach, odsłaniając ślady, które nie powinny należeć do żadnego żywego stworzenia.',
  'Przedmieścia Etherii': 'Za murami miasta nawet znajome drogi wyglądają obco. W oknach nie płonie ani jedna świeca.',
  'Mokradła Vael': 'Czarna woda odbija światło jak matowe lustro, a trzciny szepczą głosami zbyt podobnymi do ludzkich.',
  'Krucze Turnie': 'Skały piętrzą się nad szlakiem niczym zęby. Kruki milkną, gdy bohater podnosi wzrok.',
  'Katakumby Asterionu': 'Kurz leży tu od wieków, lecz na posadzce widać świeże ślady przeciągniętych kości.',
  'Bezgwiezdne Rubieże': 'Nad rubieżami nie ma gwiazd. Horyzont przecina tylko blady poblask czegoś ukrytego pod ziemią.',
};

export function getTavernStage(run: QuestIdentity): TavernStage | null {
  if (run.stageIndex >= run.stageCount) return null;
  const atmosphere = REGION_ATMOSPHERE[run.region] ?? 'Szlak milknie, jakby sama Etheria wstrzymała oddech.';
  if (isTavernPuzzleStage(run.difficulty, run.stageIndex)) {
    const definition = getTavernPuzzle(run.templateKey);
    const progress = run.puzzles?.find((entry) => entry.stageIndex === run.stageIndex);
    return {
      type: 'PUZZLE',
      index: run.stageIndex,
      kicker: `${run.region} · próba wiedzy`,
      title: definition.title,
      narrative: `${branchPrelude(run)} ${atmosphere}`,
      puzzleKey: definition.key,
      kind: definition.kind,
      prompt: definition.prompt,
      instruction: definition.instruction,
      options: definition.options,
      requiredSelections: definition.solution.length,
      attempts: progress?.attempts ?? 0,
      maxAttempts: progress?.maxAttempts ?? 2,
      feedback: progress?.outcomeText ?? null,
      hint: progress?.attempts ? definition.hint : null,
    };
  }
  if (isTavernCombatStage(run.difficulty, run.stageIndex, run.stageCount, run.templateKey)) {
    const enemy = getTavernEnemy(run);
    const finalEncounter = run.stageIndex === run.stageCount - 1;
    return {
      type: 'COMBAT',
      index: run.stageIndex,
      kicker: `${run.region} · ${finalEncounter ? 'rozstrzygnięcie' : `starcie ${run.stageIndex + 1} z ${run.stageCount}`}`,
      title: enemy.name,
      narrative: `${branchPrelude(run)} ${atmosphere} ${enemy.description}`,
      enemy,
      finalEncounter,
    };
  }
  const last = run.stageIndex === run.stageCount - 1;
  const authoredStage = authoredChoiceStage(run, atmosphere);
  if (authoredStage) return authoredStage;
  if (run.stageIndex === 0) return openingStage(run, atmosphere);
  if (last) return finaleStage(run, atmosphere);
  return middleStage(run, atmosphere);
}

function authoredChoiceStage(run: QuestIdentity, atmosphere: string): TavernChoiceStage | null {
  const stages = AUTHORED_CHOICE_STAGES[run.templateKey];
  return stages?.[run.stageIndex]?.(run, atmosphere) ?? null;
}

type ChoiceStageFactory = (run: QuestIdentity, atmosphere: string) => TavernChoiceStage;

const AUTHORED_CHOICE_STAGES: Record<string, Record<number, ChoiceStageFactory>> = {
  'ash-road-lantern': {
    0: (run, atmosphere) => ({
      type: 'CHOICE', index: 0, kicker: 'Równiny Popiołów · zerwana przysięga',
      title: 'Posterunek bez strażnika',
      narrative: `${run.summary} ${atmosphere} Na kamieniach nie ma śladów rabunku. Caed zabrał wyłącznie kryształ, rozkazy i zerwany fragment sztandaru.`,
      choices: [
        choice('read-caeds-orders', 'Odczytaj skreślone rozkazy', 'Sprawdź, które nazwiska i miejsca usunięto z wojskowego rejestru.', 'NEUTRAL', 'INT', -1, 0,
          'Pod sadzą pozostaje nazwa osady uchodźców oraz rozkaz, by odmówić jej ochrony.',
          'Atrament rozpada się pod dotykiem. Z dokumentu zostaje tylko pieczęć garnizonu.'),
        choice('follow-caeds-march', 'Rusz śladem Caeda', 'Dogonienie dezertera może dać odpowiedź, zanim garnizon zamknie szlak.', 'NEUTRAL', 'DEX', 1, 0,
          'Ślady ciężkich butów prowadzą nie ku granicy, lecz do niewidocznej na mapie osady.',
          'Popiół zasypuje trop. Bohater dociera do osady dopiero po zapadnięciu zmroku.'),
      ],
    }),
    2: (_run, atmosphere) => ({
      type: 'CHOICE', index: 2, kicker: 'Równiny Popiołów · cena światła',
      title: 'Jedna latarnia, dwie warty',
      narrative: `Caed zasilił Kryształem Odnowy starą latarnię. Jej blask trzyma Popielną Sforę poza kręgiem domów, lecz południowy garnizon bez tego samego kryształu utraci zapasy lecznicze. ${atmosphere}`,
      choices: [
        choice('leave-crystal-with-refugees', 'Broń osady do świtu', 'Pozostaw kryształ w latarni i przyjmij na siebie uderzenie całej sfory.', 'GOOD', 'CON', 1, 2,
          'Mieszkańcy zamykają bramy. Stały blask pozwala bohaterowi wybrać miejsce ostatniej obrony.',
          'Światło drży, gdy bohater zajmuje pozycję. Sfora wyczuwa jego zmęczenie.'),
        choice('reclaim-crystal-for-garrison', 'Odzyskaj wojskowy kryształ', 'Wypełnij kontrakt; nim światło zgaśnie, spróbuj odciągnąć sforę od domów.', 'NEUTRAL', 'STR', 0, 0,
          'Caed oddaje relikt po krótkiej walce. Bohater kieruje bestie na wypalone pola.',
          'Kryształ nie ustępuje z oprawy. Szarpanina osłabia latarnię przed nadejściem sfory.'),
      ],
    }),
  },
  'mill-below-walls': {
    0: (run, atmosphere) => ({
      type: 'CHOICE', index: 0, kicker: 'Przedmieścia Etherii · nocna zmiana',
      title: 'Mąka, której nikt nie odbiera',
      narrative: `${run.summary} ${atmosphere} Wrota nie noszą śladów włamania. Przed progiem leżą pełne worki, lecz na każdym skreślono znak miejskiego spichlerza. Z piwnicy dobiega rytm korby obracanej dłońmi, które nie potrzebują odpoczynku.`,
      choices: [
        choice('read-erased-mill-ledger', 'Odczytaj wymazany rejestr', 'Zetrzyj świeżą mąkę z księgi dostaw i sprawdź, czyje nazwiska próbowano ukryć.', 'GOOD', 'INT', -1, 1,
          'Pod warstwą pyłu wracają nazwiska rodzin zamkniętych pod młynem podczas dawnego głodu. Ostatni podpis należy do mistrza Grumara.',
          'Wilgotna mąka zrywa atrament razem z papierem. Pozostaje tylko pieczęć urzędnika, który nakazał zamknąć dolne komory.'),
        choice('hunt-flour-smugglers', 'Rusz za śladami przemytników', 'Omiń księgi i zejdź po świeżych odciskach butów, zanim złodzieje opróżnią podziemny skład.', 'NEUTRAL', 'DEX', 1, 0,
          'Biały trop prowadzi do rozbitej kraty. Przemytnicy uciekli, pozostawiając korbę spiętą łańcuchem z pradawnym mechanizmem.',
          'Ślady rozdzielają się między workami. Gdy bohater odnajduje zejście, przemytnicy zdążyli już obudzić nocną zmianę Grumara.'),
      ],
    }),
  },
  'stone-bridge-voices': {
    0: (run, atmosphere) => ({
      type: 'CHOICE', index: 0, kicker: 'Srebrne Rozlewiska · ślad ekspedycji',
      title: 'Obóz, którego nikt nie opuścił',
      narrative: `${run.summary} ${atmosphere} Pasy namiotów przecięto od środka, a wszystkie metalowe znaki przewoźników ułożono przed wejściem do białej nawy.`,
      choices: [
        choice('study-vael-camp', 'Zbadaj rejestr ekspedycji', 'Porównaj nazwiska badaczy ze znakami dawnej służby Vaelów.', 'NEUTRAL', 'INT', -1, 0,
          'Każda ofiara nosiła znak, który Strażnik mógł rozpoznać jako klucz do iglicy.',
          'Wilgoć skleja strony. Udaje się odczytać tylko rozkaz odzyskania kryształu.'),
        choice('enter-through-flooded-nave', 'Wejdź przez zalaną nawę', 'Omiń główne wrota, zanim powracająca woda zamknie przejście.', 'NEUTRAL', 'DEX', 1, 0,
          'Bohater dociera pod nawę przed przypływem i dostrzega strażnika, zanim ten rusza.',
          'Nurt spycha bohatera pod główne schody, wprost przed ceremonialną wartę.'),
      ],
    }),
    3: (_run, atmosphere) => ({
      type: 'CHOICE', index: 3, kicker: 'Zatopiona Iglica · pamięć rozkazu',
      title: 'Głos, którego nie ma w kronikach',
      narrative: `Ołtarz odsłania wspomnienie otwarcia śluz. Dowód może przywrócić zatopionym osadom imiona, ale jego ujawnienie osłabi ród utrzymujący dzisiejsze groble. ${atmosphere}`,
      choices: [
        choice('preserve-vael-memory', 'Zachowaj pamięć świadków', 'Nie pozwól Zakonowi oczyścić kryształu przed odczytaniem wszystkich imion.', 'GOOD', 'CON', 1, 2,
          'Bohater odłącza zapis od ołtarza bez naruszenia głosu. Strażnik traci część rozkazu.',
          'Kryształ przyjmuje wspomnienie bólu bohatera. Strażnik budzi się z pełną mocą.'),
        choice('yield-memory-to-order', 'Oddaj zapis Zakonowi', 'Stabilność grobli i pieczęci jest ważniejsza niż prawda, która może wywołać wojnę.', 'NEUTRAL', 'INT', -1, 0,
          'Srebrna formuła oczyszcza najbardziej gwałtowne Echo i osłabia obronę komnaty.',
          'Brakuje jednej strofy formuły. Oczyszczanie zaciera imiona, ale nie uspokaja Strażnika.'),
      ],
    }),
  },
  'ashen-phoenix-order': {
    0: (run, atmosphere) => ({
      type: 'CHOICE', index: 0, kicker: 'Krucze Turnie · spalone archiwum',
      title: 'Ślady, których ogień nie zabrał',
      narrative: `${run.summary} ${atmosphere} W ruinach skryptorium leżą dwa tropy: odciski wojskowych butów prowadzące ku przełęczy oraz nadpalony rejestr, z którego ktoś próbował usunąć trzynaście imion.`,
      choices: [
        choice('read-ashen-register', 'Odczytaj popielny rejestr', 'Zabezpiecz kruche strony i ustal, kogo Zakon przeznaczył do Pierwszego Stosu.', 'GOOD', 'INT', -1, 2,
          'Atrament wraca pod wpływem aeterytu. Trzynaście nazwisk należy do skrybów oficjalnie uznanych za poległych podczas Pęknięcia.',
          'Gorący popiół skleja strony. Udaje się ocalić tylko znak Avarrenów oraz datę późniejszą niż Pęknięcie.'),
        choice('pursue-phoenix-hunter', 'Rusz za Popielnym Tropicielem', 'Dogonienie Vareka może ocalić archiwistę, zanim Zakon zamknie wszystkie drogi przez turnie.', 'NEUTRAL', 'DEX', 1, 0,
          'Bohater wyprzedza straż Zakonu i dostrzega sygnały Vareka pozostawione na osmalonych kamieniach.',
          'Fałszywy trop prowadzi przez urwisko. Varek zyskuje czas, by przygotować zasadzkę przy relikwiarzu.'),
      ],
    }),
  },
  'bone-chimera-heart': {
    0: (run, atmosphere) => ({
      type: 'CHOICE', index: 0, kicker: 'Nekropolia Asterionu · kamienna procesja',
      title: 'Marsz ku południowej bramie',
      narrative: `${run.summary} ${atmosphere} Golem nie niszczy grobów na swojej drodze. Zatrzymuje się przed każdą płaskorzeźbą i czeka, aż kamienne postacie opuszczą broń.`,
      choices: [
        choice('decode-golem-route', 'Odczytaj trasę procesji', 'Ustal, które węzły Pierwszego Królestwa łączy marsz konstruktu.', 'NEUTRAL', 'INT', -1, 0,
          'Trasa kończy się dokładnie pod Latarnią Etherii. Golem nie szuka bramy, tylko węzła naprawczego.',
          'Część mapy została skuta. Pozostaje jedynie kierunek prowadzący ku miastu.'),
        choice('intercept-golem-column', 'Przetnij drogę procesji', 'Wyprzedź konstrukt przez ossuarium i zajmij pozycję przed kolejną nawą.', 'NEUTRAL', 'DEX', 1, 0,
          'Skrót pozwala zobaczyć, jak strażnicy przepuszczają Golema bez walki.',
          'Ossuarium budzi się pod stopami. Kustosz zamyka wyjście przed bohaterem.'),
      ],
    }),
    3: (_run, atmosphere) => ({
      type: 'CHOICE', index: 3, kicker: 'Dolna nawa · rdzeń ostatniej latarni',
      title: 'Naprawa czy podbój',
      narrative: `Rdzeń pasuje do mechanizmu Etherii, lecz zapisane w nim Echo należy do armii Asteriona. Uruchomiona Latarnia może ochronić miasto i jednocześnie nauczyć je posłuszeństwa wobec martwego króla. ${atmosphere}`,
      choices: [
        choice('guide-golem-to-lantern', 'Przejmij marsz Golema', 'Zachowaj Rdzeń i zmień ostatnią część rozkazu, zanim konstrukt dotrze do miasta.', 'GOOD', 'INT', 1, 2,
          'Nowa komenda wiąże naprawę z wolą żywych. Golem odrzuca obcą część rozkazu do walki.',
          'Rozkaz rozdziela się na sprzeczne głosy. Cała wola konstruktu zwraca się przeciw bohaterowi.'),
        choice('shatter-lantern-core', 'Roztrzaskaj Rdzeń', 'Usuń zagrożenie dla wolnej woli Etherii, nawet jeśli miasto utraci szansę naprawy Latarni.', 'NEUTRAL', 'STR', 0, 0,
          'Pierwsza osłona Rdzenia pęka. Golem osłabia pancerz, by ochronić ostatnie światło.',
          'Cios budzi wszystkie warstwy ochronne. Konstrukcja uznaje bohatera za wroga naprawy.'),
      ],
    }),
  },
};

function choice(
  id: string,
  title: string,
  description: string,
  alignment: TavernChoiceAlignment,
  attribute: TavernAttribute,
  riskModifier: number,
  reputationDelta: number,
  successText: string,
  failureText: string,
): TavernStageChoice {
  return { id, title, description, alignment, attribute, riskModifier, reputationDelta, successText, failureText };
}

function branchPrelude(run: QuestIdentity): string {
  const choice = run.decisions?.[0];
  if (!choice) return 'Dotychczasowy szlak nie podpowiada jeszcze, co czeka dalej.';
  const authoredPrelude: Record<string, string> = {
    'read-caeds-orders': 'Skreślony rozkaz potwierdza, że garnizon świadomie pozostawił osadę poza ochroną Latarni.',
    'follow-caeds-march': 'Ślady Caeda prowadzą ku ludziom, których nie obejmuje żadna mapa ani wojskowy rejestr.',
    'read-erased-mill-ledger': 'Odzyskany rejestr ujawnia, że młyn był awaryjnym spichlerzem, a Grumar pozostał przy kole, gdy urzędnicy zamurowali robotników razem z głodującymi rodzinami.',
    'hunt-flour-smugglers': 'Ślady przemytników prowadzą do korby, którą spięto z mechanizmem dawnego spichlerza. Złodzieje zabrali ziarno, lecz zostawili obudzoną nocną zmianę.',
    'study-vael-camp': 'Znaki przewoźników ujawniają, że Strażnik wybierał ofiary według dawnego rozkazu, nie przypadku.',
    'enter-through-flooded-nave': 'Zalana nawa pozwala wejść przed przypływem, ale omija świadectwa pozostawione przez ekspedycję.',
    'read-ashen-register': 'Ocalony rejestr dowodzi, że Pierwszy Stos był egzekucją skrybów, a nie próbą ratowania ofiar Pęknięcia.',
    'pursue-phoenix-hunter': 'Sygnały Vareka prowadzą krótszą drogą ku relikwiarzowi, lecz Zakon wie już, że bohater depcze mu po piętach.',
    'decode-golem-route': 'Odczytana procesja prowadzi do węzła pod Etherią, a nie ku jej bramie.',
    'intercept-golem-column': 'Skrót przez ossuarium daje przewagę czasu, lecz budzi straż przeznaczoną dla intruzów.',
  };
  if (authoredPrelude[choice.choiceId]) return authoredPrelude[choice.choiceId];
  if (choice.choiceId === 'read-the-signs') return 'Odczytane wcześniej znaki ujawniają fragment wzoru ukrytego przed nieuważnym wędrowcem.';
  if (choice.choiceId === 'follow-the-trail') return 'Szybki pościg pozwolił dotrzeć tu przed zagrożeniem, lecz pozostawił niewiele czasu na namysł.';
  if (choice.alignment === 'GOOD') return 'Uratowany świadek zdradził szczegół, którego zabrakło na mapie.';
  if (choice.alignment === 'EVIL') return 'Zdobyta siłą wskazówka prowadzi krótszą drogą, ale przeciwnik wie już, że bohater nadchodzi.';
  return 'Wcześniejsza decyzja zmieniła układ sił na dalszym szlaku.';
}

export function tavernChoiceTarget(difficulty: TavernQuestDifficulty, stageIndex: number, riskModifier: number): number {
  const base = difficulty === 'EASY' ? 9 : difficulty === 'MEDIUM' ? 11 : 13;
  return base + Math.floor(stageIndex / 2) + riskModifier;
}

function openingStage(run: QuestIdentity, atmosphere: string): TavernChoiceStage {
  return {
    type: 'CHOICE',
    index: 0,
    kicker: `${run.region} · pierwszy ślad`,
    title: 'Ślad pozostawiony przy drodze',
    narrative: `${run.summary} ${atmosphere} Zanim szlak rozdzieli się na dobre, trzeba zdecydować, komu zaufać: własnym oczom czy cudzej opowieści.`,
    choices: [
      {
        id: 'read-the-signs', title: 'Odczytaj znaki', description: 'Zbadaj ślady i sprawdź, co próbowano przed Tobą ukryć.',
        alignment: 'NEUTRAL', attribute: 'INT', riskModifier: -1, reputationDelta: 0,
        successText: 'Pozorny chaos układa się w czytelny wzór. Bohater poznaje bezpieczniejsze wejście na szlak.',
        failureText: 'Znaki zostały celowo zatarte. Stracony czas pozwala zagrożeniu przygotować zasadzkę.',
      },
      {
        id: 'follow-the-trail', title: 'Rusz za świeżym tropem', description: 'Nie pozwól, by ostrożność odebrała Ci przewagę.',
        alignment: 'NEUTRAL', attribute: 'DEX', riskModifier: 1, reputationDelta: 0,
        successText: 'Szybki marsz skraca dystans. W oddali pojawia się sylwetka odpowiedzialna za niepokój na szlaku.',
        failureText: 'Trop prowadzi przez grząski teren. Bohater wychodzi z niego późno i w pełnym świetle księżyca.',
      },
    ],
  };
}

function middleStage(run: QuestIdentity, atmosphere: string): TavernChoiceStage {
  const variant = (run.stageIndex - 1) % 2;
  if (variant === 0) {
    return {
      type: 'CHOICE',
      index: run.stageIndex,
      kicker: `${run.region} · etap ${run.stageIndex + 1} z ${run.stageCount}`,
      title: 'Cena cudzego strachu',
      narrative: `${atmosphere} Na drodze stoi ocalały, który zna dalszy szlak. Żąda ochrony w zamian za prawdę, lecz jego sakwa zdradza, że nie powiedział wszystkiego.`,
      choices: [
        {
          id: 'protect-witness', title: 'Udziel ochrony', description: 'Dotrzymaj słowa, nawet jeśli droga stanie się trudniejsza.',
          alignment: 'GOOD', attribute: 'CON', riskModifier: 0, reputationDelta: 1,
          successText: 'Spokój bohatera przełamuje strach świadka. Wyjawia on ukryte przejście i prawdziwy cel przeciwnika.',
          failureText: 'Świadek wpada w panikę i zdradza pozycję bohatera, lecz później opowie ludziom o udzielonej pomocy.',
        },
        {
          id: 'take-the-map', title: 'Odbierz mapę siłą', description: 'Zachowaj tempo i wykorzystaj słabość świadka.',
          alignment: 'EVIL', attribute: 'STR', riskModifier: -1, reputationDelta: -1,
          successText: 'Krótka groźba wystarcza. Mapa trafia w ręce bohatera, a świadek ucieka bez oglądania się za siebie.',
          failureText: 'Świadek rozrywa mapę podczas szamotaniny. Zostają tylko fragmenty i pamięć o brutalnym czynie.',
        },
      ],
    };
  }
  return {
    type: 'CHOICE',
    index: run.stageIndex,
    kicker: `${run.region} · etap ${run.stageIndex + 1} z ${run.stageCount}`,
    title: 'Przejście bez powrotu',
    narrative: `Droga do celu przecina starą strażnicę. Mechanizm bramy nadal działa, ale wokół niego rozciągnięto cienkie jak włos druty. ${atmosphere}`,
    choices: [
      {
        id: 'disarm-passage', title: 'Rozbrój mechanizm', description: 'Przejdź powoli i pozostaw bezpieczną drogę powrotną.',
        alignment: 'GOOD', attribute: 'DEX', riskModifier: 0, reputationDelta: 1,
        successText: 'Kolejne zapadki cichną pod pewną dłonią. Przejście pozostaje otwarte także dla tych, którzy nadejdą później.',
        failureText: 'Ostatni drut pęka zbyt wcześnie. Pułapka nie zabija, ale zdradza obecność bohatera.',
      },
      {
        id: 'break-the-gate', title: 'Wyważ bramę', description: 'Złam mechanizm i wykorzystaj huk jako wyzwanie.',
        alignment: 'EVIL', attribute: 'STR', riskModifier: 1, reputationDelta: -1,
        successText: 'Stare zawiasy ustępują jednym uderzeniem. Droga jest krótka, choć za bohaterem zostają tylko drzazgi.',
        failureText: 'Brama pęka dopiero po kilku uderzeniach. To, co czekało po drugiej stronie, zdążyło się przygotować.',
      },
    ],
  };
}

function finaleStage(run: QuestIdentity, atmosphere: string): TavernChoiceStage {
  return {
    type: 'CHOICE',
    index: run.stageIndex,
    kicker: `${run.region} · rozstrzygnięcie`,
    title: `Serce zlecenia: ${run.title}`,
    narrative: `${atmosphere} Źródło niebezpieczeństwa jest w zasięgu ostrza. Jedna droga prowadzi przez otwarte starcie, druga wymaga cierpliwości i zrozumienia tego miejsca.`,
    choices: [
      {
        id: 'face-the-threat', title: 'Stań do otwartego starcia', description: 'Zakończ historię siłą, zanim przeciwnik odzyska przewagę.',
        alignment: 'NEUTRAL', attribute: 'STR', riskModifier: 1, reputationDelta: 0,
        successText: 'Pierwszy cios rozbija obronę przeciwnika. Po krótkim, brutalnym starciu na szlaku zapada cisza.',
        failureText: 'Przeciwnik przewiduje szarżę. Bohater musi wyrwać się z pułapki, zanim będzie za późno.',
      },
      {
        id: 'turn-the-secret', title: 'Wykorzystaj odkrytą tajemnicę', description: 'Połącz zebrane ślady i uderz dokładnie w słaby punkt.',
        alignment: 'NEUTRAL', attribute: 'INT', riskModifier: 0, reputationDelta: 0,
        successText: 'Wszystkie wcześniejsze znaki prowadziły do tej chwili. Zagrożenie upada, zanim zdąży odpowiedzieć.',
        failureText: 'Jeden z fragmentów opowieści okazał się kłamstwem. Plan rozpada się w chwili próby.',
      },
    ],
  };
}
