import type { TavernQuestDifficulty } from '@prisma/client';

export type TavernPuzzleKind = 'CLUE' | 'SEQUENCE' | 'TESTIMONY';

export interface TavernPuzzleOption {
  id: string;
  label: string;
  detail: string;
  symbol?: string;
}

export interface TavernPuzzleDefinition {
  key: string;
  kind: TavernPuzzleKind;
  title: string;
  prompt: string;
  instruction: string;
  options: TavernPuzzleOption[];
  solution: string[];
  hint: string;
  successText: string;
  failureText: string;
}

const PUZZLES: Record<string, TavernPuzzleDefinition> = {
  'ash-road-lantern': {
    key: 'last-watch-banner', kind: 'SEQUENCE', title: 'Sztandar Ostatniej Warty',
    prompt: 'Na zerwanym sztandarze zachowały się słowa przysięgi: „Mur przyjmuje imię, straż oddaje krew, światło prowadzi bezbronnych”. Te same trzy znaki otwierają wojskową skrytkę Caeda.',
    instruction: 'Odtwórz kolejność znaków zgodnie z przysięgą.',
    options: [
      { id: 'wall', label: 'Mur', detail: 'Kamień noszący imiona obrońców.', symbol: 'I' },
      { id: 'blood', label: 'Krew', detail: 'Cena przysięgi strażnika.', symbol: 'II' },
      { id: 'light', label: 'Światło', detail: 'Droga przeznaczona dla chronionych.', symbol: 'III' },
      { id: 'crown', label: 'Korona', detail: 'Znak dowództwa, którego nie wymienia przysięga.', symbol: 'IV' },
    ],
    solution: ['wall', 'blood', 'light'], hint: 'Przysięga podaje kolejność wprost. Korona nie należy do obowiązku zwykłej warty.',
    successText: 'Skrytka otwiera się bez huku. Rozkazy potwierdzają, że Caed wiedział o uchodźcach, zanim porzucił posterunek.',
    failureText: 'Mechanizm wypala znak dezertera na metalowej płycie. Sfora wyczuwa światło obudzonego aeterytu.',
  },
  'mill-below-walls': {
    key: 'mill-gears', kind: 'SEQUENCE', title: 'Mechanizm pod młynem',
    prompt: 'Cztery znaki sterują kamiennym kołem. Na ścianie wyryto: „Ziarno przyjmuje wodę, ogień budzi koło, a popiół kończy pracę”.',
    instruction: 'Wybierz trzy znaki we właściwej kolejności.',
    options: [
      { id: 'grain', label: 'Ziarno', detail: 'Początek pracy młyna.', symbol: 'I' },
      { id: 'water', label: 'Woda', detail: 'Siła wprawiająca mechanizm w ruch.', symbol: 'II' },
      { id: 'fire', label: 'Ogień', detail: 'Znak wykuty przy osi koła.', symbol: 'III' },
      { id: 'ash', label: 'Popiół', detail: 'Pieczęć zamykająca mechanizm.', symbol: 'IV' },
    ],
    solution: ['water', 'fire', 'ash'], hint: 'Inskrypcja opisuje następstwo czynności, nie listę wszystkich symboli.',
    successText: 'Koło zatrzymuje się, odsłaniając zejście. Głodomór traci źródło siły.',
    failureText: 'Kamienie obracają się w przeciwną stronę. Huk budzi to, co spało w piwnicy.',
  },
  'vael-courier': {
    key: 'dead-letter', kind: 'TESTIMONY', title: 'Adresat, który nie żyje',
    prompt: 'Posłaniec pamięta trzy zdania. Jedno z nich włożyło mu w usta widmo z mokradeł.',
    instruction: 'Wskaż zdanie, którego nie mógł usłyszeć od żywego człowieka.',
    options: [
      { id: 'north-road', label: '„Nie idź północną groblą.”', detail: 'Groblę zamknięto dopiero tej wiosny.' },
      { id: 'old-bell', label: '„Dzwon zamilkł przed trzydziestu laty.”', detail: 'Tak samo datowano śmierć adresata.' },
      { id: 'no-shadow', label: '„Pod wodą cień jest bezpieczny.”', detail: 'W Vael cienie znikają po zachodzie słońca.' },
    ],
    solution: ['no-shadow'], hint: 'Żywi szukają bezpieczeństwa nad powierzchnią, nie pod nią.',
    successText: 'Obce zdanie pęka jak bańka na wodzie. Widmo traci władzę nad pamięcią posłańca.',
    failureText: 'Błędne słowa zakorzeniają się głębiej. Widmo wyczuwa, że list jest już blisko.',
  },
  'stone-bridge-voices': {
    key: 'vael-water-rite', kind: 'SEQUENCE', title: 'Rytuał Trzech Fundamentów',
    prompt: 'Mira zapisała słowa dawnej liturgii: „Ziemia przyjmuje pierwszy ciężar. Woda odbiera imię. Pamięć zamyka to, czego nurt nie uniósł”.',
    instruction: 'Ustaw trzy pierścienie ołtarza w kolejności obrzędu Vael.',
    options: [
      { id: 'earth', label: 'Ziemia', detail: 'Fundament białej iglicy.', symbol: 'I' },
      { id: 'water', label: 'Woda', detail: 'Żywioł, który zatopił dolinę.', symbol: 'II' },
      { id: 'memory', label: 'Pamięć', detail: 'Pieczęć zachowująca rozkaz.', symbol: 'III' },
      { id: 'crown', label: 'Korona', detail: 'Późniejszy znak rodu Vaelów.', symbol: 'IV' },
    ],
    solution: ['earth', 'water', 'memory'], hint: 'Pierścienie odpowiadają kolejnym zdaniom liturgii. Koronę dodano już po zatopieniu świątyni.',
    successText: 'Ołtarz rozsuwa taflę wody. W kryształach pojawia się wspomnienie dłoni uruchamiającej śluzy.',
    failureText: 'Pierścienie obracają się przeciw sobie. Iglica odpowiada głosem dzwonów i budzi kolejnych strażników.',
  },
  'white-moth-hunter': {
    key: 'moth-cipher', kind: 'SEQUENCE', title: 'Szyfr Białej Ćmy',
    prompt: 'Na relikcie widnieją cztery fazy ćmy. Notatka badacza mówi: „Z ciemności ku płomieniowi, lecz nigdy przez pełne światło”.',
    instruction: 'Ułóż trzy fazy otwierające skrytkę.',
    options: [
      { id: 'cocoon', label: 'Kokon', detail: 'Ukryta przemiana.', symbol: 'I' },
      { id: 'wing', label: 'Skrzydło', detail: 'Pierwszy lot.', symbol: 'II' },
      { id: 'flame', label: 'Płomień', detail: 'Cel wędrówki.', symbol: 'III' },
      { id: 'sun', label: 'Słońce', detail: 'Pełne światło.', symbol: 'IV' },
    ],
    solution: ['cocoon', 'wing', 'flame'], hint: 'Ostatni symbol został wprost wykluczony przez autora notatki.',
    successText: 'Relikt otwiera się bezgłośnie. Wewnątrz znajduje się znak ujawniający słabość strażnika.',
    failureText: 'Znak słońca wypala ostrzeżenie na dłoni bohatera. Strażnik wyczuwa naruszenie reliktu.',
  },
  'raven-tithe': {
    key: 'harpy-nest', kind: 'CLUE', title: 'Droga do kruczego gniazda',
    prompt: 'Trzy ścieżki prowadzą w turnie. Harpie atakują z góry, ale wracają do gniazda najkrótszą drogą przed burzą.',
    instruction: 'Wybierz ślad prowadzący do gniazda.',
    options: [
      { id: 'white-feathers', label: 'Białe pióra przy urwisku', detail: 'Pióra są czyste i ułożone zbyt równo.' },
      { id: 'goat-bones', label: 'Kości kozicy pod półką', detail: 'Świeże, połamane i osłonięte od deszczu.' },
      { id: 'silver-coins', label: 'Srebrne monety w szczelinie', detail: 'Danina została rozrzucona wzdłuż łatwego szlaku.' },
    ],
    solution: ['goat-bones'], hint: 'Szukaj śladu pożywienia pozostawionego tam, gdzie deszcz go nie dosięga.',
    successText: 'Kości wyznaczają pionowy szlak. Bohater dociera nad gniazdo i odbiera harpiom przewagę wysokości.',
    failureText: 'Monety okazują się przynętą. Skrzydła zasłaniają niebo, zanim bohater znajduje osłonę.',
  },
  'drowned-bells': {
    key: 'bell-order', kind: 'SEQUENCE', title: 'Liturgia zatopionych dzwonów',
    prompt: 'Na ołtarzu zapisano: „Mały budzi, pęknięty ostrzega, wielki usypia”. Czwarty dzwon nie ma serca.',
    instruction: 'Wybierz kolejność trzech dzwonów, która uciszy kaplicę.',
    options: [
      { id: 'small', label: 'Mały dzwon', detail: 'Cienki, srebrny ton.', symbol: 'I' },
      { id: 'cracked', label: 'Pęknięty dzwon', detail: 'Głuchy ton ostrzeżenia.', symbol: 'II' },
      { id: 'great', label: 'Wielki dzwon', detail: 'Niski ton niosący się pod wodą.', symbol: 'III' },
      { id: 'mute', label: 'Niemy dzwon', detail: 'Nie posiada serca.', symbol: 'IV' },
    ],
    solution: ['small', 'cracked', 'great'], hint: 'Inskrypcja podaje zarówno funkcje, jak i ich kolejność.',
    successText: 'Ostatni ton gaśnie pod sklepieniem. Strażniczka kaplicy zostaje odcięta od chóru topielców.',
    failureText: 'Fałszywa melodia budzi wodę pod posadzką. Chór odpowiada jednym, gniewnym głosem.',
  },
  'bone-chimera-heart': {
    key: 'golem-march-order', kind: 'CLUE', title: 'Rozkaz wykuty w procesji',
    prompt: 'Płaskorzeźby pokazują Golema opuszczającego komnatę. Jeden szczegół dowodzi, że nie maszeruje na południową bramę jako najeźdźca.',
    instruction: 'Wskaż znak ujawniający prawdziwy cel konstruktu.',
    options: [
      { id: 'lowered-weapon', label: 'Opuszczone ostrze', detail: 'Broń pozostaje skierowana ku posadzce.' },
      { id: 'lantern-key', label: 'Klucz Latarni', detail: 'Rdzeń w piersi ma ten sam układ nacięć co węzeł pod Etherią.' },
      { id: 'broken-gate', label: 'Pęknięta brama', detail: 'Kamień mógł zostać uszkodzony wiele stuleci później.' },
      { id: 'kneeling-soldiers', label: 'Klęczący żołnierze', detail: 'Armia oddaje konstruktowi ceremonialny pokłon.' },
    ],
    solution: ['lantern-key'], hint: 'Gest może oznaczać pokój albo ceremoniał. Mechaniczny klucz ma tylko jedno przeznaczenie.',
    successText: 'Nacięcia odpowiadają węzłowi Latarni Aeterytowej. Golem niesie część mechanizmu naprawczego.',
    failureText: 'Błędny odczyt uruchamia procesję obronną. Katakumby uznają bohatera za przeszkodę na trasie naprawy.',
  },
  'last-seal-asterion': {
    key: 'asterion-witnesses', kind: 'TESTIMONY', title: 'Strażnicy ostatniej pieczęci',
    prompt: 'Trzy posągi mówią kolejno: „Pieczęć otwiera krew”, „Pieczęć zamyka imię”, „Król nie posiadał imienia”. Tylko jeden strażnik nadal służy Asterionowi i dlatego kłamie.',
    instruction: 'Wskaż kłamliwego strażnika.',
    options: [
      { id: 'blood', label: 'Strażnik Krwi', detail: 'Jego misa nosi świeże ślady.' },
      { id: 'name', label: 'Strażnik Imienia', detail: 'Na cokole zatarto wszystkie litery.' },
      { id: 'nameless', label: 'Strażnik Bez Imienia', detail: 'Na piersi ma wyryty królewski monogram.' },
    ],
    solution: ['nameless'], hint: 'Kłamstwo zdradza nie treść przepowiedni, lecz znak na samym posągu.',
    successText: 'Monogram pęka pod dotykiem. Jedna z warstw pieczęci obraca się przeciw swemu władcy.',
    failureText: 'Niewłaściwy posąg rozsypuje się, uwalniając oddech zamknięty w nim od czasów Pierwszego Królestwa.',
  },
};

export function isTavernPuzzleStage(difficulty: TavernQuestDifficulty, stageIndex: number): boolean {
  return difficulty === 'EASY' ? stageIndex === 1 : stageIndex === 2;
}

export function getTavernPuzzle(templateKey: string): TavernPuzzleDefinition {
  return PUZZLES[templateKey] ?? PUZZLES['ash-road-lantern'];
}

export function isPuzzleAnswerCorrect(definition: TavernPuzzleDefinition, answer: string[]): boolean {
  return definition.solution.length === answer.length
    && definition.solution.every((entry, index) => entry === answer[index]);
}
