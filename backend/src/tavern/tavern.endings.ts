import type { MissionResult } from '@prisma/client';

export type TavernEndingKind = 'FAILURE' | 'COSTLY' | 'INSIGHT' | 'PURSUIT';

interface EndingLore {
  insight: [title: string, text: string];
  pursuit: [title: string, text: string];
  failure: [title: string, text: string];
}

const ENDINGS: Record<string, EndingLore> = {
  'ash-road-lantern': {
    insight: ['Światło dla bezimiennych', 'Kryształ pozostaje w osadzie do świtu. Vargan, Ogar Popielnej Chorągwi, gaśnie pod jej murami, a Borwin dopisuje do mapy miejsce, któremu garnizon odmówił nawet nazwy.'],
    pursuit: ['Kryształ wraca na wartę', 'Relikt trafia do południowego garnizonu, a sfora zostaje odciągnięta na wypalone pola. Kontrakt wykonano, lecz nocą nad osadą uchodźców nie zapala się już żadne światło.'],
    failure: ['Ostatnia warta Caeda', 'Sfora przełamuje krąg latarni. Caed zostaje na Równinach, by dać mieszkańcom czas na ucieczkę, a bohater przynosi Borwinowi kryształ ciepły od cudzego ostatniego rozkazu.'],
  },
  'mill-below-walls': {
    insight: ['Mąka i popiół', 'Ślady pod żarnami prowadzą do komory przemytników. Zamiast burzyć młyn, bohater zamyka ich drogę i przywraca dostawy dla miasta.'],
    pursuit: ['Koło zatrzymane ostrzem', 'Po krótkim pościgu przez piwnice ostatni z napastników wpada między łopaty mechanizmu. Nad ranem koło młyna wreszcie nieruchomieje.'],
    failure: ['Młyn miele po północy', 'Podziemne przejście zapada się za uciekającymi. Młyn nadal pracuje nocą, choć od dawna nikt nie wsypuje do niego ziarna.'],
  },
  'vael-courier': {
    insight: ['List do umarłej', 'Pieczęć skrywa nie imię adresatki, lecz drogę do jej grobu. Bohater oddaje list mokradłom, a posłaniec po raz pierwszy odzyskuje własne wspomnienia.'],
    pursuit: ['Za błędnym ogniem', 'Bohater dogania istotę niosącą skradzioną pamięć posłańca. Gdy płomień gaśnie pod ostrzem, zapomniane imiona wracają wraz z pierwszym świtem.'],
    failure: ['Atrament rozpływa się w Vael', 'List wpada do czarnej wody, a jego słowa znikają. Posłaniec odchodzi bez pamięci, prowadzony głosem, którego nikt poza nim nie słyszy.'],
  },
  'stone-bridge-voices': {
    insight: ['Imiona spod Srebrnych Rozlewisk', 'Pamięć otwarcia śluz trafia do Kroniki wraz z imionami zatopionych osad. Groble nadal stoją, ale ród Vaelów po raz pierwszy musi bronić swojej wersji historii przed żywymi.'],
    pursuit: ['Milczenie zachowane przez Zakon', 'Kryształ zostaje oczyszczony i pieczęć Iglicy stabilizuje rozlewiska. Głosy świadków milkną razem ze Strażnikiem, a Mira wie, że prawdy nie da się już odzyskać.'],
    failure: ['Biała iglica zamyka oczy', 'Strażnik odzyskuje kryształ i zatapia wejście do sanktuarium. Ostatnim dźwiękiem ekspedycji jest dzwon wyznaczający godzinę obrzędu sprzed stu osiemdziesięciu siedmiu lat.'],
  },
  'white-moth-hunter': {
    insight: ['Prawda pod białym skrzydłem', 'Relikt okazuje się kluczem do ostrzeżenia pozostawionego przez dawnych badaczy. Uciekinier zostaje oczyszczony z zarzutów, lecz Bractwo nie zapomina zniewagi.'],
    pursuit: ['Łowca staje się zwierzyną', 'Najemnicy zostają dopadnięci w przełęczy, zanim uciszą badacza. Ich dowódca oddaje relikt i nazwiska tych, którzy zapłacili za pościg.'],
    failure: ['Ćma gaśnie w dłoni', 'Relikt pęka podczas starcia. Badacz znika w turniach, a jedynym dowodem jego historii pozostaje biały pył na rękawicy bohatera.'],
  },
  'raven-tithe': {
    insight: ['Danina bez krwi', 'Stare znaki dowodzą, że przysięga osady została sfałszowana. Bohater łamie jej moc bez ofiary, a kruki po raz pierwszy odlatują z pustymi dziobami.'],
    pursuit: ['Gniazdo nad przepaścią', 'Szarża na skalne gniazdo kończy panowanie bestii. Dziecko wraca do osady, a czarne pióra długo jeszcze wirują nad turnią.'],
    failure: ['Kruki liczą do jednego', 'Zbyt wiele dróg urywa się nad przepaścią. Bohater wraca sam, a następnego ranka nad osadą krąży o jednego kruka więcej.'],
  },
  'drowned-bells': {
    insight: ['Trzynasty dzwon milczy', 'Właściwa kolejność pieczęci odwraca wezwanie kaplicy. Woda opada, odsłaniając schody i tych, którzy przez lata czekali na godny pochówek.'],
    pursuit: ['Serce zatopionej kaplicy', 'Bohater przebija się do dzwonnika i roztrzaskuje serce przeklętego dzwonu. Fala uderza w mokradła, lecz żaden mieszkaniec Vael nie rusza już za jej głosem.'],
    failure: ['Czternaste uderzenie', 'Dzwon odzywa się raz jeszcze, choć jego serce pozostaje nieruchome. Vael zapamiętuje porażkę jako czternaste uderzenie.'],
  },
  'bone-chimera-heart': {
    insight: ['Latarnia pamięta żywych', 'Zmieniony rozkaz prowadzi Golema pod Etherię bez podporządkowania miasta armii Asteriona. Latarnia rozbłyska mocniej, lecz w jej świetle pojawia się cień króla obserwującego nowego kustosza.'],
    pursuit: ['Rdzeń rozbity przed świtem', 'Ostatni cios roztrzaskuje mechanizm naprawczy. Etheria zachowuje wolną wolę i swoją słabnącą Latarnię, a Kolegium zapisuje imię bohatera na liście utraconych cudów.'],
    failure: ['Procesja przechodzi dalej', 'Golem odrzuca bohatera i rusza ku miastu. W katakumbach kolejne kamienne armie opuszczają broń, jakby witały naprawę, której żywi nie potrafią już zatrzymać.'],
  },
  'last-seal-asterion': {
    insight: ['Pieczęć pozostaje zamknięta', 'Zebrane znaki układają się w prawdziwe imię bramy. Bohater wypowiada je wspak i zamyka przejście bez oddania Asterionowi kolejnej duszy.'],
    pursuit: ['Ostrze po drugiej stronie', 'Bohater przekracza próg i ścina strażnika od wewnątrz. Brama zapada się wraz z komnatą, a z Rubieży znika blask, którego nie dawały żadne gwiazdy.'],
    failure: ['Rysa na ostatniej pieczęci', 'Pieczęć wytrzymuje, ale na jej powierzchni pozostaje cienka szczelina. Coś po drugiej stronie nauczyło się przez nią oddychać.'],
  },
};

export function resolveTavernEnding(input: {
  templateKey: string;
  title: string;
  region: string;
  result: MissionResult;
  score: number;
  firstChoiceId?: string;
  choiceIds?: string[];
}) {
  const lore = ENDINGS[input.templateKey];
  if (input.result === 'FAILURE') {
    return {
      key: `${input.templateKey}:failure`, kind: 'FAILURE' as const,
      title: lore?.failure[0] ?? 'Szlak zażądał swojej ceny',
      text: lore?.failure[1] ?? `Nie wszystko, co czekało w ${input.region}, dało się pokonać. Zdobyta wiedza pozostaje jednak zapisana w kronice.`,
    };
  }
  if (input.score < 3) {
    return {
      key: `${input.templateKey}:costly`, kind: 'COSTLY' as const,
      title: 'Zwycięstwo okupione blizną',
      text: `${input.title} dobiega końca, lecz cena okazuje się wyższa, niż głosiła kartka Borwina. Zagrożenie ustępuje, pozostawiając za sobą nierozwiązane pytania.`,
    };
  }
  const choices = input.choiceIds ?? (input.firstChoiceId ? [input.firstChoiceId] : []);
  const insightChoices: Record<string, string> = {
    'ash-road-lantern': 'leave-crystal-with-refugees',
    'stone-bridge-voices': 'preserve-vael-memory',
    'bone-chimera-heart': 'guide-golem-to-lantern',
  };
  const authoredInsight = insightChoices[input.templateKey];
  const insight = authoredInsight ? choices.includes(authoredInsight) : input.firstChoiceId === 'read-the-signs';
  const selected = insight ? lore?.insight : lore?.pursuit;
  return {
    key: `${input.templateKey}:${insight ? 'insight' : 'pursuit'}`,
    kind: (insight ? 'INSIGHT' : 'PURSUIT') as TavernEndingKind,
    title: selected?.[0] ?? (insight ? 'Tajemnica odczytana' : 'Trop doprowadzony do końca'),
    text: selected?.[1] ?? `Bohater wraca z ${input.region}, a Borwin bez słowa skreśla zlecenie z tablicy.`,
  };
}
