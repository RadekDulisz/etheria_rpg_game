import type { WeaponType } from '@prisma/client';
import type { CombatSnapshot } from '../combat/combat.types';

export type TavernEnemyFamily =
  | 'ECHO_BEAST'
  | 'AWAKENED_GUARDIAN'
  | 'VOID_ENTITY'
  | 'HUMAN';

export type TavernEnemyRank = 'COMMON' | 'ELITE' | 'BOSS' | 'RAID_BOSS';
export type TavernEnemyProfile = 'SWIFT' | 'BRUTE' | 'WARDEN';

export type TavernCombatModifiers = Pick<
  CombatSnapshot,
  | 'hitChanceModifier'
  | 'evasionChanceModifier'
  | 'parryChanceModifier'
  | 'criticalChanceModifier'
  | 'criticalResistanceModifier'
  | 'damageDealtMultiplier'
  | 'damageTakenMultiplier'
>;

export interface TavernEnemyTrait {
  key: string;
  name: string;
  description: string;
  modifiers: TavernCombatModifiers;
}

export interface TavernEnemySignature extends TavernEnemyTrait {
  counterplay: string;
  counteredBy?: {
    choiceIds?: string[];
    puzzleKeys?: string[];
  };
}

export interface TavernEnemyDefinition {
  key: string;
  name: string;
  title: string;
  family: TavernEnemyFamily;
  familyLabel: string;
  form: string;
  rank: TavernEnemyRank;
  formerPurpose: string;
  fractureEffect: string;
  silhouette: string;
  uniqueDetail: string;
  description: string;
  atlasPosition: number;
  weaponType: WeaponType | null;
  profile: TavernEnemyProfile;
  signature: TavernEnemySignature;
  visualDirection: {
    scale: string;
    palette: string;
    materials: string;
    composition: string;
  };
}

export const TAVERN_ENEMY_FAMILY_TRAITS: Record<TavernEnemyFamily, TavernEnemyTrait> = {
  ECHO_BEAST: {
    key: 'remembered-instinct',
    name: 'Zapamiętany instynkt',
    description: 'Bestia powtarza najskuteczniejsze ruchy dawnych łowów i łatwiej dosięga celu.',
    modifiers: { hitChanceModifier: 0.02 },
  },
  AWAKENED_GUARDIAN: {
    key: 'oath-bound-shell',
    name: 'Pancerz przysięgi',
    description: 'Echo dawnego rozkazu usztywnia ciało lub pancerz i utrudnia zadanie ciosu krytycznego.',
    modifiers: { criticalResistanceModifier: 0.025 },
  },
  VOID_ENTITY: {
    key: 'memory-pressure',
    name: 'Nacisk Głębi',
    description: 'Sprzeczne Echa wzmacniają każdy cios istoty, gdy próbuje narzucić światu własną formę.',
    modifiers: { damageDealtMultiplier: 1.03 },
  },
  HUMAN: {
    key: 'deliberate-technique',
    name: 'Wyuczona technika',
    description: 'Rozumny przeciwnik walczy planowo, wykorzystując broń i obserwację zamiast samego spaczenia.',
    modifiers: { hitChanceModifier: 0.01, parryChanceModifier: 0.01 },
  },
};

export const TAVERN_ENEMIES: Record<string, TavernEnemyDefinition[]> = {
  'ash-road-lantern': [
    {
      key: 'ash-pack-memory', name: 'Vargan, Ogar Popielnej Chorągwi', title: 'Ostatni łowca królewskiej sfory',
      family: 'ECHO_BEAST', familyLabel: 'Spaczone Bestie Echa', form: 'Sfora skupiona w jednym ciele', rank: 'BOSS',
      formerPurpose: 'Królewskie ogary tropiące dezerterów i strzegące chorągwi Pierwszego Królestwa.',
      fractureEffect: 'Latarnia związała pamięć całej sfory w jednym wychudłym wilku, który poluje wieloma instynktami naraz.',
      silhouette: 'Wielki, smukły ogar o wysoko uniesionym łbie, symetrycznej kryzie z popielnych kolców i żarze między żebrami.',
      uniqueDetail: 'Przed skokiem kilka różnych głosów ogarów warczy z tej samej piersi.',
      description: 'Nie jest jednym wilkiem. Aeterytowa latarnia związała instynkty całej królewskiej sfory w wychudłym ciele pełnym żaru.',
      atlasPosition: 0, weaponType: null, profile: 'SWIFT',
      signature: {
        key: 'royal-pack-hunt', name: 'Łowy królewskiej sfory',
        description: 'Nakładające się wspomnienia prowadzą bestię do odsłoniętego boku ofiary.',
        counterplay: 'Odczytanie rozkazów Caeda albo prześledzenie jego marszu pozwala rozpoznać dawną komendę sfory.',
        modifiers: { hitChanceModifier: 0.03, damageDealtMultiplier: 1.05 },
        counteredBy: { choiceIds: ['read-caeds-orders', 'follow-caeds-march'] },
      },
      visualDirection: { scale: 'duża bestia, dominująca nad człowiekiem', palette: 'czarny popiół, przygaszone złoto, blady fiolet Echa', materials: 'spalone futro, odsłonięta kość, aeteryt między żebrami', composition: 'dumny profil trzy czwarte, łeb wysoko, symetryczna kryza' },
    },
  ],
  'mill-below-walls': [
    {
      key: 'mill-ghoul', name: 'Grumar, Pan Krwawego Żarna', title: 'Ten, który nie pozwala kołu stanąć',
      family: 'AWAKENED_GUARDIAN', familyLabel: 'Przebudzeni Strażnicy', form: 'Nieumarły strażnik mechanizmu', rank: 'BOSS',
      formerPurpose: 'Mistrz młyna odpowiedzialny za awaryjne koło zasilające dawny spichlerz Etherii.',
      fractureEffect: 'Echo ostatniej nocnej zmiany przywiązało ciało do mechanizmu; każdy obrót koła odtwarza chwilę jego śmierci.',
      silhouette: 'Szeroki, zgarbiony młynarz zespolony z półkolistym żarnem przypominającym kamienną tarczę.',
      uniqueDetail: 'Palce obracają niewidzialną korbę nawet wtedy, gdy przeciwnik stoi nieruchomo.',
      description: 'Mąka skrywa runy dawnego spichlerza, a kamienne żarno na jego ramieniu obraca się w rytmie martwego serca.',
      atlasPosition: 1, weaponType: 'BLUNT', profile: 'BRUTE',
      signature: {
        key: 'millstone-rhythm', name: 'Rytm żarna',
        description: 'Powtarzany bez końca ruch nadaje kolejnym uderzeniom miażdżący ciężar.',
        counterplay: 'Poprawne ustawienie kół młyna przerywa rytm zapisany w mechanizmie.',
        modifiers: { damageDealtMultiplier: 1.08 },
        counteredBy: { puzzleKeys: ['mill-gears'] },
      },
      visualDirection: { scale: 'masywny humanoid', palette: 'kamienna szarość, stare żelazo, zgaszona ochra', materials: 'żarno, płótno robocze, żelazne obręcze', composition: 'frontalna ciężka sylwetka z wyraźnym kołem za ramieniem' },
    },
  ],
  'vael-courier': [
    {
      key: 'marsh-wisp', name: 'Neriel, Widmo Martwego Listu', title: 'Posłaniec bez adresata',
      family: 'VOID_ENTITY', familyLabel: 'Istoty Pustki i Twory Głębi', form: 'Widmo obietnicy', rank: 'BOSS',
      formerPurpose: 'Przewoźnik Vael, który miał dostarczyć ostrzeżenie do zatopionej osady.',
      fractureEffect: 'Niedopełniona obietnica wyparła jego imię; pozostała jedynie droga, list i potrzeba odnalezienia zmarłego adresata.',
      silhouette: 'Smukła postać unosząca się nad wodą, otoczona pasami mokrego pergaminu układającymi się jak ceremonialny płaszcz.',
      uniqueDetail: 'Zapieczętowany list nosi na cienkim łańcuchu przewieszonym przez szyję, jak relikwię niedopełnionej obietnicy.',
      description: 'Mokra sylwetka trzyma się świata jedynie obietnicą, której nie zdołała spełnić za życia.',
      atlasPosition: 2, weaponType: 'STAFF', profile: 'WARDEN',
      signature: {
        key: 'unfulfilled-route', name: 'Droga bez końca',
        description: 'Widmo znika w odbiciu czarnej wody i wraca z kierunku, którego ofiara nie obserwuje.',
        counterplay: 'Rozpoznanie prawdziwego adresata listu zamyka część dróg, którymi porusza się Echo.',
        modifiers: { evasionChanceModifier: 0.05 },
        counteredBy: { puzzleKeys: ['dead-letter'] },
      },
      visualDirection: { scale: 'wysoka, smukła postać', palette: 'srebro, mokry granat, zimna biel', materials: 'mokry pergamin, ceremonialne płótno, matowy aeteryt', composition: 'pionowa sylwetka nad taflą, symetryczne pasy listów' },
    },
  ],
  'stone-bridge-voices': [
    {
      key: 'vael-drowned-knight', name: 'Topielny Rycerz Białej Nawy', title: 'Strażnik zatopionej liturgii',
      family: 'AWAKENED_GUARDIAN', familyLabel: 'Przebudzeni Strażnicy', form: 'Ceremonialny nieumarły', rank: 'ELITE',
      formerPurpose: 'Członek honorowej straży świątyni, prowadzący kapłanów podczas obrzędu zamykania śluz.',
      fractureEffect: 'Muł zachował ciało, a Echo rozkazu zmusza je do powtarzania procesji przez zatopioną nawę.',
      silhouette: 'Wysoki rycerz w jasnym pancerzu płytowym z długą glewią i płaszczem ciężkim od czarnej wody.',
      uniqueDetail: 'Przed każdym ciosem wykonuje ukłon przeznaczony niegdyś dla kapłanów.',
      description: 'Muł oblepia ceremonialny pancerz, lecz ręka nadal wykonuje rozkaz wydany w noc otwarcia śluz.',
      atlasPosition: 3, weaponType: 'POLEARM', profile: 'BRUTE',
      signature: {
        key: 'procession-guard', name: 'Krok procesji',
        description: 'Równy marsz i zasięg glewii utrudniają przełamanie ceremonialnej gardy.',
        counterplay: 'Rejestr ekspedycji lub zalana nawa ujawniają właściwy kierunek dawnej procesji.',
        modifiers: { criticalResistanceModifier: 0.04, parryChanceModifier: 0.025 },
        counteredBy: { choiceIds: ['study-vael-camp', 'enter-through-flooded-nave'] },
      },
      visualDirection: { scale: 'wysoki rycerz', palette: 'kość słoniowa, spatynowane srebro, czerń wody', materials: 'ceremonialna płyta, mokry jedwab, glewia', composition: 'pełna sylwetka w marszu, pion glewii równoważy płaszcz' },
    },
    {
      key: 'vael-spire-warden', name: 'Avarion, Strażnik Zatopionej Iglicy', title: 'Ostatni świadek rozkazu Vaelów',
      family: 'AWAKENED_GUARDIAN', familyLabel: 'Przebudzeni Strażnicy', form: 'Aeterytowa zbroja bez ciała', rank: 'BOSS',
      formerPurpose: 'Żywy mechanizm sądu, który miał przechować i odtworzyć ostatni rozkaz zarządców śluz.',
      fractureEffect: 'Po Pęknięciu sprzeczne głosy Vaelów obracają płyty zbroi wokół kryształu zawierającego zakazaną pamięć.',
      silhouette: 'Majestatyczna biała zbroja o szerokich barkach, unosząca się symetrycznie wokół szafirowego rdzenia.',
      uniqueDetail: 'Przyłbica otwiera się jak pieczęć, ale za nią znajduje się wyłącznie wirujące światło.',
      description: 'Białe płyty pancerza krążą wokół kryształu pamiętającego głos, którego ród Vaelów nie pozwoli usłyszeć żywym.',
      atlasPosition: 4, weaponType: 'SWORD', profile: 'WARDEN',
      signature: {
        key: 'three-foundations-guard', name: 'Garda Trzech Fundamentów',
        description: 'Ziemia, woda i pamięć obracają płyty pancerza, zamykając szczeliny przed ciosem.',
        counterplay: 'Odtworzenie liturgii Trzech Fundamentów zatrzymuje ruch zewnętrznych płyt.',
        modifiers: { parryChanceModifier: 0.05, damageTakenMultiplier: 0.92 },
        counteredBy: { puzzleKeys: ['vael-water-rite'] },
      },
      visualDirection: { scale: 'monumentalny rycerz-konstrukt', palette: 'biały kamień, srebro, szafirowe Echo', materials: 'gładkie płyty, złote glify, kryształ', composition: 'idealnie symetryczna frontalna sylwetka z rdzeniem na osi' },
    },
  ],
  'ashen-phoenix-order': [
    {
      key: 'phoenix-hunter', name: 'Varek, Popielny Tropiciel', title: 'Egzekutor Pierwszego Stosu',
      family: 'HUMAN', familyLabel: 'Ludzcy Wrogowie', form: 'Tropiciel Zakonu Popielnego Feniksa', rank: 'ELITE',
      formerPurpose: 'Zwiadowca Zakonu wysyłany po relikty przechowujące pamięć ludzi dotkniętych Wytarciem.',
      fractureEffect: 'Nie został fizycznie spaczony; cudze wspomnienia odebrały mu pewność, czy rozkazy, które pamięta, naprawdę otrzymał.',
      silhouette: 'Szczupły łowca w warstwowej skórzni i płaszczu rozciętym jak ogon drapieżnego ptaka, uzbrojony w długie proste ostrze.',
      uniqueDetail: 'Przed odpowiedzią przesuwa kciukiem po nadpalonym sygnecie feniksa, jakby sprawdzał, czy metal nadal jest gorący.',
      description: 'Nie pyta, czy cel jest winny. Pyta, co pozostanie z jego zeznań, kiedy Zakon przepuści je przez ogień.',
      atlasPosition: 5, weaponType: 'DAGGER', profile: 'SWIFT',
      signature: {
        key: 'relic-hunters-feint', name: 'Zwód łowcy reliktów',
        description: 'Varek czyta pozycję dłoni i uderza w chwili, gdy przeciwnik próbuje chronić zdobyty relikt.',
        counterplay: 'Odtworzenie Liturgii Pierwszego Stosu ujawnia imiona, których Varek otrzymał rozkaz nigdy nie wypowiadać.',
        modifiers: { hitChanceModifier: 0.03, criticalChanceModifier: 0.025 },
        counteredBy: { puzzleKeys: ['phoenix-rebirth-rite'] },
      },
      visualDirection: { scale: 'atletyczny człowiek', palette: 'czarna skóra, stare złoto, karmazyn i żar', materials: 'skórznia, brązowy sygnet, proste ostrze', composition: 'czujna poza trzy czwarte, płaszcz układający się jak ogon feniksa' },
    },
    {
      key: 'phoenix-revenant', name: 'Morvath, Ostatni Rycerz Feniksa', title: 'Strażnik Pierwszego Stosu',
      family: 'AWAKENED_GUARDIAN', familyLabel: 'Przebudzeni Strażnicy', form: 'Pusta zbroja badacza', rank: 'BOSS',
      formerPurpose: 'Rycerz Avarrenów strzegący skrybów podczas pierwszego obrzędu odzyskiwania wspomnień z popiołu.',
      fractureEffect: 'Oddał własne imię Pierwszemu Stosowi, aby zatrzymać Wytarcie oddziału; zbroja zachowała tylko obowiązek ochrony rytuału.',
      silhouette: 'Wysoki czarny rycerz z ceremonialnym płaszczem i metalowym nimbem rozchodzącym się jak skrzydła feniksa.',
      uniqueDetail: 'Na tarczy płonie złoty feniks, lecz każde jego pióro nosi drobno wyryte imię człowieka złożonego w ogniu.',
      description: 'Pod przyłbicą nie ma twarzy. Żar wypowiada cudze imiona i każde uznaje za własną przysięgę.',
      atlasPosition: 6, weaponType: 'SWORD', profile: 'WARDEN',
      signature: {
        key: 'memory-vow', name: 'Przysięga bez imienia',
        description: 'Strażnik zasłania nieistniejących badaczy i odpowiada na każdy pośpieszny cios.',
        counterplay: 'Liturgia Pierwszego Stosu pozwala wypowiedzieć imiona skrybów i rozluźnić przysięgę strażnika.',
        modifiers: { parryChanceModifier: 0.04, criticalResistanceModifier: 0.04 },
        counteredBy: { puzzleKeys: ['phoenix-rebirth-rite'] },
      },
      visualDirection: { scale: 'wysoki ceremonialny rycerz', palette: 'czerniona stal, stare złoto, głęboki karmazyn, żar', materials: 'warstwowa płyta, nadpalony płaszcz, metalowy nimb', composition: 'symetryczna garda z tarczą feniksa i nimbem wzniesionym ku górze' },
    },
  ],
  'raven-tithe': [
    {
      key: 'raven-harpy', name: 'Krucza Harpia Poborczyni', title: 'Zwiastunka srebrnej daniny',
      family: 'ECHO_BEAST', familyLabel: 'Spaczone Bestie Echa', form: 'Harpia pamiętająca poborcę', rank: 'ELITE',
      formerPurpose: 'Górski drapieżnik gniazdujący przy dawnych wieżach poboru srebra.',
      fractureEffect: 'Wchłonęła Echo poborców strąconych z turni i odtąd przelicza ofiary jak należną daninę.',
      silhouette: 'Smukła skrzydlata łowczyni o koronie z czarnych piór i srebrnych obręczach na szponach.',
      uniqueDetail: 'Przed atakiem wybija szponem liczbę odpowiadającą kolejności ofiary.',
      description: 'Jej skrzydła są czarne od sadzy, a zakrzywione szpony noszą ślady srebra i krwi.',
      atlasPosition: 7, weaponType: null, profile: 'SWIFT',
      signature: {
        key: 'tithe-dive', name: 'Lot po należność',
        description: 'Harpia krąży poza zasięgiem, po czym spada na wcześniej wybraną ofiarę.',
        counterplay: 'Odczytanie śladów gniazda ujawnia stronę, z której zawsze rozpoczyna nurkowanie.',
        modifiers: { evasionChanceModifier: 0.04, criticalChanceModifier: 0.02 },
        counteredBy: { puzzleKeys: ['harpy-nest'] },
      },
      visualDirection: { scale: 'duża skrzydlata humanoidka', palette: 'sadza, srebro, ciemny burgund', materials: 'warstwowe pióra, srebrne obręcze, kościane szpony', composition: 'skrzydła wzniesione symetrycznie, sylwetka gotowa do lotu' },
    },
    {
      key: 'raven-matriarch', name: 'Azhara, Królowa Kruczych Turni', title: 'Ta, która wybiera pierworodnych',
      family: 'ECHO_BEAST', familyLabel: 'Spaczone Bestie Echa', form: 'Pradawna harpia-matriarchini', rank: 'BOSS',
      formerPurpose: 'Pierwsza samica stada, której mieszkańcy Turni składali srebro w zamian za ochronę szlaku.',
      fractureEffect: 'Echo kolejnych przysiąg zmieniło umowę w rytuał; matriarchini nie odróżnia już daniny od prawa do ludzkiego potomstwa.',
      silhouette: 'Monumentalna harpia z trzema kondygnacjami skrzydeł i koroną piór przypominającą górskie turnie.',
      uniqueDetail: 'W piórach ma wplecione dziecięce medaliony, ale żadnego nie pozwala dotknąć.',
      description: 'Stara jak turnie. Jej krzyk rozcina odwagę szybciej niż szpony przecinają stal.',
      atlasPosition: 8, weaponType: null, profile: 'BRUTE',
      signature: {
        key: 'firstborn-claim', name: 'Prawo pierworodnego',
        description: 'Krzyk matriarchini niesie ciężar setek złamanych umów i wzmacnia jej brutalne uderzenia.',
        counterplay: 'Poznanie prawdziwej drogi do gniazda pozwala zniszczyć srebrne znaczniki podtrzymujące rytuał.',
        modifiers: { hitChanceModifier: 0.02, damageDealtMultiplier: 1.08 },
        counteredBy: { puzzleKeys: ['harpy-nest'] },
      },
      visualDirection: { scale: 'boss znacznie większy od człowieka', palette: 'czarne pióra, stare srebro, królewska purpura', materials: 'pióra, rytualne obręcze, medaliony', composition: 'frontalny majestat, wielopiętrowe skrzydła skierowane ku górze' },
    },
  ],
  'drowned-bells': [
    {
      key: 'bell-drowned', name: 'Topielny Dzwonnik Vael', title: 'Sługa trzynastego uderzenia',
      family: 'AWAKENED_GUARDIAN', familyLabel: 'Przebudzeni Strażnicy', form: 'Topielec związany z dzwonem', rank: 'ELITE',
      formerPurpose: 'Świątynny dzwonnik odpowiedzialny za ostrzeganie osad przed otwarciem śluz.',
      fractureEffect: 'Utonął przy trzynastym uderzeniu, a Echo wrosło łańcuchem w jego ciało i powtarza alarm bez końca.',
      silhouette: 'Wysoki topielec opleciony ciężkim łańcuchem, z fragmentem spiżowego dzwonu na plecach.',
      uniqueDetail: 'Krople spadające z łańcucha uderzają o ziemię w równym rytmie liturgii.',
      description: 'Łańcuch dzwonu wrósł w jego ramiona, a każde uderzenie przyzywa czarną wodę.',
      atlasPosition: 3, weaponType: 'BLUNT', profile: 'BRUTE',
      signature: {
        key: 'thirteenth-strike', name: 'Trzynaste uderzenie',
        description: 'Ciężar spiżu prowadzi zamach, którego rytm trudno przerwać zwykłą gardą.',
        counterplay: 'Odtworzenie prawdziwej kolejności liturgii odbiera Echu dodatkowe uderzenie.',
        modifiers: { damageDealtMultiplier: 1.07 },
        counteredBy: { puzzleKeys: ['bell-order'] },
      },
      visualDirection: { scale: 'wysoki ciężki humanoid', palette: 'patynowany spiż, mokra czerń, zieleń Vael', materials: 'łańcuch, fragment dzwonu, nasiąknięte szaty', composition: 'ukośna linia łańcucha, ciężar dzwonu równoważy broń' },
    },
    {
      key: 'chapel-warden', name: 'Srebrna Kantorka Głębin', title: 'Ostatnia ze zdradzonego chóru',
      family: 'VOID_ENTITY', familyLabel: 'Istoty Pustki i Twory Głębi', form: 'Widmo odwróconej modlitwy', rank: 'ELITE',
      formerPurpose: 'Kapłanka prowadząca chór, którego pieśń miała uspokajać Echo pod kaplicą.',
      fractureEffect: 'Po zatonięciu modlitwa zaczęła płynąć wspak i stworzyła z jej głosu srebrną, pustą powłokę.',
      silhouette: 'Unosząca się kapłanka w szerokich warstwach szat, z aureolą ułożoną z pękniętych piszczałek.',
      uniqueDetail: 'Usta pozostają zamknięte; pieśń wydobywa się z pęknięć srebrnej maski.',
      description: 'Zachowała twarz kapłanki, lecz jej pieśń jest modlitwą wypowiadaną od końca.',
      atlasPosition: 2, weaponType: 'STAFF', profile: 'WARDEN',
      signature: {
        key: 'reversed-hymn', name: 'Odwrócony hymn',
        description: 'Rytm pieśni zakłóca ocenę odległości i prowadzi ostrze obok widma.',
        counterplay: 'Właściwa kolejność dzwonów przywraca początek hymnu i stabilizuje jej sylwetkę.',
        modifiers: { evasionChanceModifier: 0.03, parryChanceModifier: 0.035 },
        counteredBy: { puzzleKeys: ['bell-order'] },
      },
      visualDirection: { scale: 'wysoka unosząca się postać', palette: 'srebro, morska zieleń, blada biel', materials: 'mokry jedwab, srebrna maska, piszczałki', composition: 'symetryczna figura liturgiczna, aureola na osi głowy' },
    },
    {
      key: 'thirteenth-bell', name: 'Nerathis, Władca Trzynastego Dzwonu', title: 'Głos pod czarną wodą',
      family: 'VOID_ENTITY', familyLabel: 'Istoty Pustki i Twory Głębi', form: 'Relikwiarz zbiorowej pamięci', rank: 'RAID_BOSS',
      formerPurpose: 'Wielki dzwon przechowujący imiona mieszkańców powierzonych opiece kaplicy.',
      fractureEffect: 'Tysiące ostatnich wspomnień związały spiż, kości i ciała w bijący relikwiarz żądający nowych imion.',
      silhouette: 'Monumentalne serce zamknięte w pękniętej czaszy dzwonu, podtrzymywane przez symetryczne ramiona z kości i spiżu.',
      uniqueDetail: 'Na powierzchni spiżu pojawiają się usta wypowiadające imię aktualnego przeciwnika.',
      description: 'Bryła kości, spiżu i zatopionych ciał bije rytmem, którego nie powinno słyszeć żadne żywe serce.',
      atlasPosition: 4, weaponType: null, profile: 'WARDEN',
      signature: {
        key: 'bronze-heartbeat', name: 'Spiżowe tętno',
        description: 'Każde uderzenie serca zagęszcza jego powłokę i wzmacnia falę uderzeniową.',
        counterplay: 'Poprawna liturgia odsłania szczelinę w czaszy dzwonu i przerywa rytm obrony.',
        modifiers: { damageTakenMultiplier: 0.88, damageDealtMultiplier: 1.06 },
        counteredBy: { puzzleKeys: ['bell-order'] },
      },
      visualDirection: { scale: 'olbrzymi nieruchomy boss', palette: 'czarny spiż, kość, głęboki szafir', materials: 'dzwon, kości, zatopione szaty, aeteryt', composition: 'symetryczny relikwiarz z sercem dokładnie na osi' },
    },
  ],
  'bone-chimera-heart': [
    {
      key: 'necropolis-custodian', name: 'Ossuaryjny Prefekt Asteriona', title: 'Strażnik Dolnej Nawy',
      family: 'AWAKENED_GUARDIAN', familyLabel: 'Przebudzeni Strażnicy', form: 'Ossuaryjny konstrukt procesyjny', rank: 'ELITE',
      formerPurpose: 'Konstrukt z kości skrybów i broni straży, niosący księgi zmarłych podczas królewskich procesji.',
      fractureEffect: 'Pęknięcie pomieszało imiona w księgach; Kustosz uznaje każdą żywą osobę za zmarłego bez miejsca w szeregu.',
      silhouette: 'Wysoki czteroręki strażnik z kościaną kolumną zamiast torsu i glewią tworzącą oś procesji.',
      uniqueDetail: 'Wolna dłoń bez przerwy zapisuje imiona ostrzem na własnych żebrach.',
      description: 'Kości skrybów i włócznie straży połączono w istotę, która chroni drogę procesji, nie sam grobowiec.',
      atlasPosition: 6, weaponType: 'POLEARM', profile: 'WARDEN',
      signature: {
        key: 'procession-rank', name: 'Porządek procesji',
        description: 'Kustosz przewiduje ciosy, dopóki przeciwnik porusza się zgodnie z układem nawy.',
        counterplay: 'Odczytanie trasy lub przecięcie kolumny łamie przypisane bohaterowi miejsce w procesji.',
        modifiers: { parryChanceModifier: 0.04, criticalResistanceModifier: 0.03 },
        counteredBy: { choiceIds: ['decode-golem-route', 'intercept-golem-column'] },
      },
      visualDirection: { scale: 'bardzo wysoki konstrukt', palette: 'kość, czarne żelazo, przygaszone złoto', materials: 'żebra, włócznie, kamienne tablice', composition: 'frontalna wieloręka symetria z pionem glewii' },
    },
    {
      key: 'seal-golem', name: 'Arkhadar, Tytan Ostatniej Pieczęci', title: 'Niosący Rdzeń Latarni',
      family: 'AWAKENED_GUARDIAN', familyLabel: 'Przebudzeni Strażnicy', form: 'Monument naprawczy Pierwszego Królestwa', rank: 'RAID_BOSS',
      formerPurpose: 'Maszyna procesyjna przenosząca Rdzeń Latarni między węzłami obronnymi Asteriona.',
      fractureEffect: 'Uszkodzony rozkaz łączy naprawę Etherii z obowiązkiem podporządkowania jej dawnej armii.',
      silhouette: 'Olbrzym z czarnego żelaza o architektonicznych barkach i latarni osadzonej centralnie w piersi.',
      uniqueDetail: 'Każdy krok układa odłamki posadzki w herb króla, którego nie ma.',
      description: 'Monument z czarnego żelaza. W jego piersi obraca się światło zdolne ocalić Etherię albo narzucić miastu wolę armii Asteriona.',
      atlasPosition: 8, weaponType: 'BLUNT', profile: 'BRUTE',
      signature: {
        key: 'lantern-core-shell', name: 'Oprawa Rdzenia Latarni',
        description: 'Pancerne segmenty zamykają się wokół rdzenia przed najgroźniejszymi ciosami.',
        counterplay: 'Odczytanie rozkazu procesji ujawnia komendę otwierającą oprawę rdzenia.',
        modifiers: { damageTakenMultiplier: 0.87, criticalResistanceModifier: 0.05 },
        counteredBy: { puzzleKeys: ['golem-march-order'] },
      },
      visualDirection: { scale: 'kolosalny boss architektoniczny', palette: 'czarne żelazo, złote glify, szafirowo-białe światło', materials: 'płyty jak fragmenty cytadeli, kryształ, złocone napisy', composition: 'idealna monumentalna symetria, rdzeń w centrum klatki' },
    },
  ],
  'last-seal-asterion': [
    {
      key: 'void-cultist', name: 'Bezgwiezdny Kantor', title: 'Głos otwartej pieczęci',
      family: 'HUMAN', familyLabel: 'Ludzcy Wrogowie', form: 'Kapłan Dzieci Bezgwiezdnej Nocy', rank: 'ELITE',
      formerPurpose: 'Kronikarz Zakonu Srebrnej Pieczęci badający przypadki Wytarcia.',
      fractureEffect: 'Uwierzył, że pieczęcie są źródłem cierpienia i dobrowolnie przyjął wspomnienia tych, których Zakon wymazał z rejestrów.',
      silhouette: 'Smukły kantor w warstwowych czarnych szatach z wysokim kołnierzem i laską zakończoną pustym pierścieniem.',
      uniqueDetail: 'Nigdy nie wypowiada własnego imienia; przed ciosem recytuje imię jednej usuniętej ofiary.',
      description: 'Jego modlitwa nie prosi o łaskę. Wylicza imiona tych, którzy mają zostać wymazani.',
      atlasPosition: 5, weaponType: 'STAFF', profile: 'SWIFT',
      signature: {
        key: 'litany-of-erasure', name: 'Litania wymazania',
        description: 'Rytm imion prowadzi laskę Kantora z nieludzką precyzją.',
        counterplay: 'Rozpoznanie kłamcy wśród strażników ujawnia przerwę w litanii.',
        modifiers: { hitChanceModifier: 0.03, criticalChanceModifier: 0.03 },
        counteredBy: { puzzleKeys: ['asterion-witnesses'] },
      },
      visualDirection: { scale: 'wysoki człowiek', palette: 'matowa czerń, purpura, zimne srebro', materials: 'warstwowe szaty, zapisane bandaże, metalowy pierścień', composition: 'spokojna liturgiczna poza, pierścień laski tworzy halo pustki' },
    },
    {
      key: 'fractured-knight', name: 'Ser Caldris, Strażnik Zamkniętej Bramy', title: 'Ostrze Pierwszego Królestwa',
      family: 'AWAKENED_GUARDIAN', familyLabel: 'Przebudzeni Strażnicy', form: 'Rycerz przejęty przez własną przysięgę', rank: 'ELITE',
      formerPurpose: 'Dowódca tylnej straży, który zamknął bramę Asterionu przed własnym wycofującym się oddziałem.',
      fractureEffect: 'Echo winy zachowało jego kunszt, lecz każe mu widzieć w każdym przybyszu żołnierza próbującego opuścić posterunek.',
      silhouette: 'Dumny czarny rycerz w popękanej, lecz harmonijnej zbroi, z długim mieczem trzymanym w dwuręcznej gardzie.',
      uniqueDetail: 'Ze szczelin zbroi wydobywają się sylwetki żołnierzy zatrzymanych przez jego ostatni rozkaz.',
      description: 'Pęknięcia pancerza jarzą się bladym światłem, ale miecz nadal prowadzi ręka dawnego mistrza.',
      atlasPosition: 6, weaponType: 'SWORD', profile: 'WARDEN',
      signature: {
        key: 'closed-gate-stance', name: 'Garda zamkniętej bramy',
        description: 'Caldris nie cofa się ani o krok i odpowiada ostrzem na próby przełamania pozycji.',
        counterplay: 'Prawdziwe zeznania strażników przypominają mu, że wojna zakończyła się wieki temu.',
        modifiers: { parryChanceModifier: 0.045, criticalResistanceModifier: 0.04 },
        counteredBy: { puzzleKeys: ['asterion-witnesses'] },
      },
      visualDirection: { scale: 'wysoki rycerz', palette: 'czerniona stal, blade złoto, zimny błękit', materials: 'pęknięta płyta, ceremonialny miecz, rozdarty płaszcz', composition: 'heroiczna symetria skażona świetlistymi pęknięciami' },
    },
    {
      key: 'asterion-remnant', name: 'Asterion Bez Korony', title: 'Władca Pustego Tronu',
      family: 'VOID_ENTITY', familyLabel: 'Istoty Pustki i Twory Głębi', form: 'Królewskie Echo bez duszy', rank: 'RAID_BOSS',
      formerPurpose: 'Odbicie woli Asteriona zapisane w Koronie, mające rozstrzygać spory między jego dziedzicami.',
      fractureEffect: 'Po Pęknięciu tysiące sprzecznych rozkazów zbudowały istotę przekonaną, że nadal jest prawowitym królem.',
      silhouette: 'Wysoka królewska figura bez twarzy, w płaszczu z unoszących się tablic i z koroną rozdzieloną na świetliste ostrza.',
      uniqueDetail: 'Gładka maska przybiera na moment twarz każdej osoby, która kiedykolwiek rościła sobie prawo do tronu.',
      description: 'Nie jest królem ani bogiem. Jest wspomnieniem władcy, które odmówiło śmierci.',
      atlasPosition: 8, weaponType: 'SWORD', profile: 'BRUTE',
      signature: {
        key: 'sovereign-memory', name: 'Wola pustego tronu',
        description: 'Echo narzuca polu walki pamięć królewskiego pojedynku i wzmacnia własne ciosy oraz oprawę.',
        counterplay: 'Rozpoznanie fałszywego świadka rozrywa ciągłość królewskiej pamięci.',
        modifiers: { damageDealtMultiplier: 1.1, damageTakenMultiplier: 0.9, criticalChanceModifier: 0.03 },
        counteredBy: { puzzleKeys: ['asterion-witnesses'] },
      },
      visualDirection: { scale: 'monumentalna humanoidalna istota', palette: 'królewska czerń, stare złoto, ametystowa Pustka', materials: 'unoszące się tablice, gładkie srebro, aeterytowe ostrza', composition: 'frontalna figura władcy, korona i miecz tworzą pionową oś' },
    },
  ],
};
