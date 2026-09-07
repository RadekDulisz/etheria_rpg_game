import { PrismaPg } from '@prisma/adapter-pg';
import {
  GemFamily,
  GemTier,
  ItemCategory,
  ItemGrade,
  ItemRarity,
  Prisma,
  PrismaClient,
  SlotGroup,
  WeaponType,
} from '@prisma/client';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the database seed');
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const gemTierNames: Record<GemTier, string> = {
  SHARD: 'Okruch',
  CUT: 'Oszlifowany',
  FLAWLESS: 'Doskonały',
  ROYAL: 'Królewski',
  ANCIENT: 'Pradawny',
};

const gemFamilyNames: Record<GemFamily, string> = {
  RUBY: 'Rubin Żaru',
  AMETHYST: 'Ametyst Mocy',
  EMERALD: 'Szmaragd Łowcy',
  SAPPHIRE: 'Szafir Myśli',
};

const gemTierMinLevels: Record<GemTier, number> = {
  SHARD: 1,
  CUT: 20,
  FLAWLESS: 40,
  ROYAL: 61,
  ANCIENT: 80,
};

/**
 * Autorski katalog inspirowany klasycznym podziałem ekwipunku MMORPG:
 * osobne rodziny broni, części pancerza i biżuteria. Nazwy, opisy,
 * poziomy, ceny oraz statystyki są oryginalne i dopasowane do naszego
 * uproszczonego silnika walki.
 */
const handcraftedItems: Prisma.ItemCreateInput[] = [
  // Bronie — po dwie linie rozwoju dla najważniejszych archetypów.
  {
    name: 'Miecz Pogranicznika',
    description: 'Proste ostrze noszone przez strażników kupieckich traktów.',
    category: ItemCategory.WEAPON,
    slotGroup: SlotGroup.WEAPON,
    weaponType: WeaponType.SWORD,
    price: 60,
    minLevel: 1,
    attackPower: 5,
  },
  {
    name: 'Ostrze Srebrnego Traktu',
    description: 'Hartowany miecz o jasnej klindze, wyważony z myślą o długich pojedynkach.',
    category: ItemCategory.WEAPON,
    slotGroup: SlotGroup.WEAPON,
    weaponType: WeaponType.SWORD,
    price: 520,
    minLevel: 8,
    attackPower: 14,
    strengthBonus: 1,
  },
  {
    name: 'Topór Żelaznego Wilka',
    description: 'Ciężka broń drwali i najemników z północnego pogranicza.',
    category: ItemCategory.WEAPON,
    slotGroup: SlotGroup.WEAPON,
    weaponType: WeaponType.AXE,
    price: 140,
    minLevel: 3,
    attackPower: 8,
  },
  {
    name: 'Topór Burzowego Klanu',
    description: 'Szerokie ostrze naznaczone runami wojowników z gór.',
    category: ItemCategory.WEAPON,
    slotGroup: SlotGroup.WEAPON,
    weaponType: WeaponType.AXE,
    price: 760,
    minLevel: 11,
    attackPower: 18,
    strengthBonus: 2,
  },
  {
    name: 'Sztylet Nocnego Gońca',
    description: 'Lekka broń dla tych, którzy bardziej cenią szybkość niż siłę.',
    category: ItemCategory.WEAPON,
    slotGroup: SlotGroup.WEAPON,
    weaponType: WeaponType.DAGGER,
    price: 110,
    minLevel: 2,
    attackPower: 6,
    agilityBonus: 1,
  },
  {
    name: 'Kieł Zmierzchu',
    description: 'Ciemna klinga wykuta z rudy wydobywanej po zachodzie słońca.',
    category: ItemCategory.WEAPON,
    slotGroup: SlotGroup.WEAPON,
    weaponType: WeaponType.DAGGER,
    price: 610,
    minLevel: 9,
    attackPower: 13,
    agilityBonus: 2,
  },
  {
    name: 'Łuk Jesionowego Strażnika',
    description: 'Sprawdzony łuk myśliwski o sprężystych ramionach.',
    category: ItemCategory.WEAPON,
    slotGroup: SlotGroup.WEAPON,
    weaponType: WeaponType.BOW,
    price: 160,
    minLevel: 3,
    attackPower: 7,
    agilityBonus: 1,
  },
  {
    name: 'Łuk Cichej Kniei',
    description: 'Smukła broń leśnych zwiadowców, niemal bezgłośna podczas strzału.',
    category: ItemCategory.WEAPON,
    slotGroup: SlotGroup.WEAPON,
    weaponType: WeaponType.BOW,
    price: 920,
    minLevel: 13,
    attackPower: 18,
    agilityBonus: 3,
  },
  {
    name: 'Młot Kamiennej Przysięgi',
    description: 'Ciężki obuch używany podczas obrony górskich warowni.',
    category: ItemCategory.WEAPON,
    slotGroup: SlotGroup.WEAPON,
    weaponType: WeaponType.BLUNT,
    price: 230,
    minLevel: 4,
    attackPower: 10,
    enduranceBonus: 1,
  },
  {
    name: 'Gwiezdne Berło Głębin',
    description: 'Berło skupiające energię zimnych, podziemnych źródeł.',
    category: ItemCategory.WEAPON,
    slotGroup: SlotGroup.WEAPON,
    weaponType: WeaponType.STAFF,
    price: 680,
    minLevel: 10,
    attackPower: 13,
    intelligenceBonus: 3,
  },
  {
    name: 'Halabarda Straży Granicznej',
    description: 'Długa broń pozwalająca utrzymać przeciwnika na dystans.',
    category: ItemCategory.WEAPON,
    slotGroup: SlotGroup.WEAPON,
    weaponType: WeaponType.POLEARM,
    price: 310,
    minLevel: 5,
    attackPower: 12,
  },

  // Tarcze i pancerze — każde miejsce wyposażenia ma co najmniej jeden przedmiot.
  {
    name: 'Tarcza Dębowego Bastionu',
    description: 'Dębowe deski wzmocnione żelazną obręczą.',
    category: ItemCategory.SHIELD_SIGIL,
    slotGroup: SlotGroup.SHIELD_SIGIL,
    price: 45,
    minLevel: 1,
    defensePower: 3,
    parryBonus: 5,
  },
  {
    name: 'Sigil Błękitnej Runy',
    description: 'Metalowa pieczęć wzmacniająca skupienie i obronę.',
    category: ItemCategory.SHIELD_SIGIL,
    slotGroup: SlotGroup.SHIELD_SIGIL,
    price: 430,
    minLevel: 8,
    defensePower: 6,
    intelligenceBonus: 2,
    parryBonus: 3,
  },
  {
    name: 'Kaptur Wędrowca',
    description: 'Gruby kaptur chroniący przed deszczem i przypadkowym ciosem.',
    category: ItemCategory.ARMOR,
    slotGroup: SlotGroup.HELM,
    price: 35,
    minLevel: 1,
    defensePower: 2,
  },
  {
    name: 'Hełm Żelaznego Wilka',
    description: 'Zamknięty hełm z wąską osłoną oczu.',
    category: ItemCategory.ARMOR,
    slotGroup: SlotGroup.HELM,
    price: 390,
    minLevel: 8,
    defensePower: 8,
    enduranceBonus: 1,
  },
  {
    name: 'Napierśnik Straży Traktu',
    description: 'Warstwowa skóra wzmocniona metalowymi płytkami.',
    category: ItemCategory.ARMOR,
    slotGroup: SlotGroup.UPPER_BODY,
    price: 90,
    minLevel: 1,
    defensePower: 5,
    enduranceBonus: 1,
  },
  {
    name: 'Napierśnik Czarnego Bastionu',
    description: 'Ciężki pancerz wykuty dla obrońców podziemnej cytadeli.',
    category: ItemCategory.ARMOR,
    slotGroup: SlotGroup.UPPER_BODY,
    price: 880,
    minLevel: 11,
    defensePower: 17,
    enduranceBonus: 3,
  },
  {
    name: 'Nogawice Skórzanego Zwiadowcy',
    description: 'Lekkie nogawice, które nie krępują ruchów podczas marszu.',
    category: ItemCategory.ARMOR,
    slotGroup: SlotGroup.LOWER_BODY,
    price: 55,
    minLevel: 1,
    defensePower: 3,
    agilityBonus: 1,
  },
  {
    name: 'Nogawice Runicznej Kuźni',
    description: 'Stalowe płyty połączone runicznymi nitami.',
    category: ItemCategory.ARMOR,
    slotGroup: SlotGroup.LOWER_BODY,
    price: 560,
    minLevel: 9,
    defensePower: 11,
    enduranceBonus: 2,
  },
  {
    name: 'Rękawice Gościńca',
    description: 'Skórzane rękawice zapewniające pewny chwyt broni.',
    category: ItemCategory.ARMOR,
    slotGroup: SlotGroup.GLOVES,
    price: 30,
    minLevel: 1,
    defensePower: 2,
  },
  {
    name: 'Karwasze Miedzianego Smoka',
    description: 'Łuskowe rękawice chroniące dłonie i przedramiona.',
    category: ItemCategory.ARMOR,
    slotGroup: SlotGroup.GLOVES,
    price: 420,
    minLevel: 8,
    defensePower: 7,
    strengthBonus: 1,
  },
  {
    name: 'Buty Leśnego Traktu',
    description: 'Miękkie buty stworzone z myślą o długich wyprawach.',
    category: ItemCategory.ARMOR,
    slotGroup: SlotGroup.BOOTS,
    price: 30,
    minLevel: 1,
    defensePower: 2,
    agilityBonus: 1,
  },
  {
    name: 'Greawy Popielnego Rycerza',
    description: 'Ciężkie nagolenniki odporne na uderzenia broni obuchowej.',
    category: ItemCategory.ARMOR,
    slotGroup: SlotGroup.BOOTS,
    price: 460,
    minLevel: 8,
    defensePower: 8,
    enduranceBonus: 1,
  },
  {
    name: 'Płaszcz Północnego Wiatru',
    description: 'Ciemny płaszcz, który niemal nie porusza się na wietrze.',
    category: ItemCategory.ARMOR,
    slotGroup: SlotGroup.CLOAK,
    price: 170,
    minLevel: 4,
    defensePower: 2,
    agilityBonus: 1,
  },
  {
    name: 'Brosza Srebrnej Nici',
    description: 'Delikatne srebrne włókna splecione w ochronny znak wędrowców.',
    category: ItemCategory.SPECIAL,
    slotGroup: SlotGroup.BROOCH,
    price: 85,
    minLevel: 2,
    enduranceBonus: 1,
  },

  // Biżuteria i przedmioty specjalne.
  {
    name: 'Naszyjnik Bursztynowego Słońca',
    description: 'Ciepły kamień oprawiony w proste srebro.',
    category: ItemCategory.ACCESSORY,
    slotGroup: SlotGroup.NECKLACE,
    price: 95,
    minLevel: 2,
    enduranceBonus: 1,
  },
  {
    name: 'Naszyjnik Echa Głębin',
    description: 'Błękitny kryształ pomagający zachować jasność myśli.',
    category: ItemCategory.ACCESSORY,
    slotGroup: SlotGroup.NECKLACE,
    price: 540,
    minLevel: 10,
    intelligenceBonus: 3,
  },
  {
    name: 'Pierścień Wędrownej Gwiazdy',
    description: 'Srebrny pierścień z niewielkim znakiem kompasu.',
    category: ItemCategory.ACCESSORY,
    slotGroup: SlotGroup.RING,
    price: 75,
    minLevel: 2,
    agilityBonus: 1,
  },
  {
    name: 'Pierścień Kamiennej Woli',
    description: 'Masywna obrączka wzmacniająca odporność właściciela.',
    category: ItemCategory.ACCESSORY,
    slotGroup: SlotGroup.RING,
    price: 380,
    minLevel: 7,
    enduranceBonus: 2,
  },
  {
    name: 'Kolczyk Iskry',
    description: 'Drobny kryształ migoczący przy każdym gwałtownym ruchu.',
    category: ItemCategory.ACCESSORY,
    slotGroup: SlotGroup.EARRING,
    price: 70,
    minLevel: 2,
    agilityBonus: 1,
  },
  {
    name: 'Kolczyk Szeptu Run',
    description: 'Stara ozdoba pokryta niemal startymi znakami.',
    category: ItemCategory.ACCESSORY,
    slotGroup: SlotGroup.EARRING,
    price: 390,
    minLevel: 7,
    intelligenceBonus: 2,
  },
  {
    name: 'Pas Żelaznej Przysięgi',
    description: 'Szeroki pas podtrzymujący ciężki ekwipunek.',
    category: ItemCategory.SPECIAL,
    slotGroup: SlotGroup.BELT,
    price: 120,
    minLevel: 3,
    strengthBonus: 1,
    enduranceBonus: 1,
  },
  {
    name: 'Bransoleta Sokoła',
    description: 'Lekka bransoleta noszona przez zwiadowców.',
    category: ItemCategory.SPECIAL,
    slotGroup: SlotGroup.BRACELET,
    price: 130,
    minLevel: 3,
    agilityBonus: 2,
  },
  {
    name: 'Brosza Strażniczki Zorzy',
    description: 'Emaliowana brosza wręczana obrońcom wschodnich bram.',
    category: ItemCategory.SPECIAL,
    slotGroup: SlotGroup.BROOCH,
    price: 150,
    minLevel: 4,
    enduranceBonus: 2,
  },
  {
    name: 'Diadem Cichego Nieba',
    description: 'Delikatna ozdoba pomagająca właścicielowi skupić myśli.',
    category: ItemCategory.SPECIAL,
    slotGroup: SlotGroup.HAIR_ACCESSORY,
    price: 180,
    minLevel: 5,
    intelligenceBonus: 2,
  },
];

// Dokładnie jeden autorski relikt na każdą rangę. Relikty mają osobne
// komórki atlasu ikon i stanowią wizualny oraz ekonomiczny szczyt rangi.
const relicItems: Prisma.ItemCreateInput[] = [
  { name: 'Ostrze Pierwszej Przysięgi', description: 'Proste ostrze bohatera, który jako pierwszy powrócił zza Mglistej Bramy.', category: ItemCategory.WEAPON, slotGroup: SlotGroup.WEAPON, weaponType: WeaponType.SWORD, price: 120, minLevel: 15, attackPower: 17, iconUrl: 'relic:novice' },
  { name: 'Topór Krwawego Dębu', description: 'Relikt wykuty z żelaza hartowanego w żywicy pradawnego drzewa.', category: ItemCategory.WEAPON, slotGroup: SlotGroup.WEAPON, weaponType: WeaponType.AXE, price: 420, minLevel: 20, attackPower: 24, iconUrl: 'relic:d' },
  { name: 'Łuk Srebrnego Echa', description: 'Każde napięcie cięciwy pozostawia w powietrzu srebrzysty ślad.', category: ItemCategory.WEAPON, slotGroup: SlotGroup.WEAPON, weaponType: WeaponType.BOW, price: 1100, minLevel: 40, attackPower: 34, iconUrl: 'relic:c' },
  { name: 'Młot Strażnika Otchłani', description: 'Czarny obuch nosi pieczęcie zamkniętych podziemnych wrót.', category: ItemCategory.WEAPON, slotGroup: SlotGroup.WEAPON, weaponType: WeaponType.BLUNT, price: 2400, minLevel: 52, attackPower: 48, iconUrl: 'relic:b' },
  { name: 'Berło Korony Burz', description: 'Błękitne kryształy drżą przed nadejściem każdej nawałnicy.', category: ItemCategory.WEAPON, slotGroup: SlotGroup.WEAPON, weaponType: WeaponType.STAFF, price: 4800, minLevel: 61, attackPower: 62, iconUrl: 'relic:a' },
  { name: 'Glewia Słonecznego Zaćmienia', description: 'Złote ostrze otacza ciemny blask przypominający gasnące słońce.', category: ItemCategory.WEAPON, slotGroup: SlotGroup.WEAPON, weaponType: WeaponType.POLEARM, price: 8200, minLevel: 76, attackPower: 78, iconUrl: 'relic:s' },
  { name: 'Sztylet Szeptu Gwiazd', description: 'Runiczne żyłki klingi układają się w mapę nieznanego nieba.', category: ItemCategory.WEAPON, slotGroup: SlotGroup.WEAPON, weaponType: WeaponType.DAGGER, price: 12000, minLevel: 80, attackPower: 91, iconUrl: 'relic:runic' },
  { name: 'Miecz Ostatniego Smoka', description: 'Pradawna klinga o łuskowym grzbiecie, pamiętająca ogień pierwszych kuźni.', category: ItemCategory.WEAPON, slotGroup: SlotGroup.WEAPON, weaponType: WeaponType.SWORD, price: 18000, minLevel: 84, attackPower: 112, iconUrl: 'relic:ancient' },
];

// Pamiątki fabularne z Karczmy pod Złamanym Gryfem. Cena 0 oznacza,
// że nie trafiają do handlu i nie mogą zostać sprzedane jak zwykły łup.
const tavernStoryRelicItems: Prisma.ItemCreateInput[] = [
  { name: 'Odłamek Ostatniej Warty', description: 'Nosi rysę po krysztale Caeda. Rozgrzewa się, gdy ktoś odmawia bezimiennym prawa do schronienia.', category: ItemCategory.SPECIAL, rarity: ItemRarity.RARE, grade: ItemGrade.NO_GRADE, slotGroup: SlotGroup.BROOCH, price: 0, minLevel: 1, enduranceBonus: 1, iconUrl: 'story-relic:ash-road-lantern' },
  { name: 'Kamień Milczącego Młyna', description: 'Fragment żarna, które obracało się bez wiatru, wody i ludzkiej dłoni.', category: ItemCategory.SPECIAL, rarity: ItemRarity.RARE, grade: ItemGrade.NO_GRADE, slotGroup: SlotGroup.BELT, price: 0, minLevel: 1, maxHpBonus: 8, iconUrl: 'story-relic:mill-below-walls' },
  { name: 'Pieczęć Niedoręczonego Listu', description: 'Wosk pamięta adresatkę, choć wszystkie księgi twierdzą, że umarła przed trzydziestu laty.', category: ItemCategory.SPECIAL, rarity: ItemRarity.RARE, grade: ItemGrade.NO_GRADE, slotGroup: SlotGroup.HAIR_ACCESSORY, price: 0, minLevel: 1, intelligenceBonus: 1, iconUrl: 'story-relic:vael-courier' },
  { name: 'Głos Zatopionej Iglicy', description: 'Wewnątrz kryształu słychać imiona osad wykreślonych z kronik rodu Vaelów.', category: ItemCategory.SPECIAL, rarity: ItemRarity.EPIC, grade: ItemGrade.NO_GRADE, slotGroup: SlotGroup.BRACELET, price: 0, minLevel: 1, strengthBonus: 1, parryBonus: 2, iconUrl: 'story-relic:stone-bridge-voices' },
  { name: 'Serce Pierwszego Stosu', description: 'W czarnym szkle tli się popiół skrybów, których imiona miały odrodzić się wyłącznie na rozkaz Avarrenów.', category: ItemCategory.ACCESSORY, rarity: ItemRarity.EPIC, grade: ItemGrade.NO_GRADE, slotGroup: SlotGroup.NECKLACE, price: 0, minLevel: 1, intelligenceBonus: 2, iconUrl: 'story-relic:ashen-phoenix-order' },
  { name: 'Czarne Pióro Dziesięciny', description: 'Nigdy nie moknie i nie rzuca cienia, nawet w pełnym słońcu.', category: ItemCategory.SPECIAL, rarity: ItemRarity.EPIC, grade: ItemGrade.NO_GRADE, slotGroup: SlotGroup.HAIR_ACCESSORY, price: 0, minLevel: 1, agilityBonus: 2, iconUrl: 'story-relic:raven-tithe' },
  { name: 'Odłamek Trzynastego Dzwonu', description: 'Pod wodą wydaje czysty ton, którego nie słyszy nikt stojący na brzegu.', category: ItemCategory.SPECIAL, rarity: ItemRarity.LEGENDARY, grade: ItemGrade.NO_GRADE, slotGroup: SlotGroup.BROOCH, price: 0, minLevel: 1, enduranceBonus: 2, parryBonus: 2, iconUrl: 'story-relic:drowned-bells' },
  { name: 'Klucz Wygasłej Latarni', description: 'Pasuje do mechanizmu pod Etherią, lecz na jego krawędzi zapisano rozkaz armii Asteriona.', category: ItemCategory.ACCESSORY, rarity: ItemRarity.LEGENDARY, grade: ItemGrade.NO_GRADE, slotGroup: SlotGroup.NECKLACE, price: 0, minLevel: 1, strengthBonus: 2, maxHpBonus: 12, iconUrl: 'story-relic:bone-chimera-heart' },
  { name: 'Odłamek Ostatniej Pieczęci', description: 'Na jego powierzchni widać niebo pełne gwiazd, nawet nad Bezgwiezdnymi Rubieżami.', category: ItemCategory.SPECIAL, rarity: ItemRarity.LEGENDARY, grade: ItemGrade.NO_GRADE, slotGroup: SlotGroup.BROOCH, price: 0, minLevel: 1, strengthBonus: 1, agilityBonus: 1, enduranceBonus: 1, intelligenceBonus: 1, iconUrl: 'story-relic:last-seal-asterion' },
];

type BonusField = 'strengthBonus' | 'agilityBonus' | 'enduranceBonus' | 'intelligenceBonus';

interface ItemTier {
  suffix: string;
  shirtName: string;
  shirtDescription: string;
  minLevel: number;
  priceBase: number;
  power: number;
  bonus: number;
}

const itemTiers: ItemTier[] = [
  { suffix: 'Wędrowca', shirtName: 'Lniana Koszula Wędrowca', shirtDescription: 'Prosta koszula z naturalnego, piaskowego lnu.', minLevel: 1, priceBase: 45, power: 4, bonus: 0 },
  { suffix: 'Żelaznej Straży', shirtName: 'Popielata Koszula Straży', shirtDescription: 'Grubsza, szara tkanina noszona pod kolczugą żelaznej straży.', minLevel: 20, priceBase: 250, power: 12, bonus: 1 },
  { suffix: 'Szarego Wilka', shirtName: 'Zielona Koszula Tropiciela', shirtDescription: 'Zielona koszula z mocnego płótna, barwiona ziołami pogranicza.', minLevel: 40, priceBase: 800, power: 22, bonus: 2 },
  { suffix: 'Księżycowej Kniei', shirtName: 'Purpurowa Koszula Kniei', shirtDescription: 'Purpurowa koszula utkana z lekkich, elastycznych włókien.', minLevel: 52, priceBase: 1800, power: 34, bonus: 3 },
  { suffix: 'Runicznego Bastionu', shirtName: 'Karmazynowa Koszula Runiczna', shirtDescription: 'Karmazynowa tkanina przeszyta niemal niewidoczną runiczną nicią.', minLevel: 61, priceBase: 3600, power: 48, bonus: 4 },
  { suffix: 'Smoczego Pogranicza', shirtName: 'Błękitna Koszula Smocza', shirtDescription: 'Błękitna, chłodna w dotyku koszula przeznaczona dla doświadczonych wojowników.', minLevel: 76, priceBase: 6500, power: 64, bonus: 5 },
  { suffix: 'Gwiezdnej Cytadeli', shirtName: 'Granatowa Koszula Gwiazd', shirtDescription: 'Granatowy materiał połyskujący delikatnie w świetle księżyca.', minLevel: 80, priceBase: 9500, power: 78, bonus: 6 },
  { suffix: 'Korony Burz', shirtName: 'Koszula Nocy Pradawnych', shirtDescription: 'Niemal czarna tkanina ze złotawym splotem, lekka mimo niezwykłej wytrzymałości.', minLevel: 84, priceBase: 14000, power: 94, bonus: 7 },
];

const weaponFamilies: Array<{
  noun: string;
  weaponType: WeaponType;
  powerOffset: number;
  bonusField: BonusField;
}> = [
  { noun: 'Miecz', weaponType: WeaponType.SWORD, powerOffset: 1, bonusField: 'strengthBonus' },
  { noun: 'Topór', weaponType: WeaponType.AXE, powerOffset: 2, bonusField: 'strengthBonus' },
  { noun: 'Sztylet', weaponType: WeaponType.DAGGER, powerOffset: 0, bonusField: 'agilityBonus' },
  { noun: 'Łuk', weaponType: WeaponType.BOW, powerOffset: 1, bonusField: 'agilityBonus' },
  { noun: 'Młot', weaponType: WeaponType.BLUNT, powerOffset: 2, bonusField: 'enduranceBonus' },
  { noun: 'Glewia', weaponType: WeaponType.POLEARM, powerOffset: 2, bonusField: 'strengthBonus' },
  { noun: 'Kostur', weaponType: WeaponType.STAFF, powerOffset: 0, bonusField: 'intelligenceBonus' },
];

const equipmentFamilies: Array<{
  noun: string;
  category: ItemCategory;
  slotGroup: SlotGroup;
  defenseFactor: number;
  priceFactor: number;
  bonusField: BonusField;
}> = [
  { noun: 'Tarcza', category: ItemCategory.SHIELD_SIGIL, slotGroup: SlotGroup.SHIELD_SIGIL, defenseFactor: 0.65, priceFactor: 0.9, bonusField: 'enduranceBonus' },
  { noun: 'Hełm', category: ItemCategory.ARMOR, slotGroup: SlotGroup.HELM, defenseFactor: 0.5, priceFactor: 0.75, bonusField: 'enduranceBonus' },
  { noun: 'Napierśnik', category: ItemCategory.ARMOR, slotGroup: SlotGroup.UPPER_BODY, defenseFactor: 1, priceFactor: 1.35, bonusField: 'enduranceBonus' },
  { noun: 'Nogawice', category: ItemCategory.ARMOR, slotGroup: SlotGroup.LOWER_BODY, defenseFactor: 0.75, priceFactor: 1.05, bonusField: 'enduranceBonus' },
  { noun: 'Rękawice', category: ItemCategory.ARMOR, slotGroup: SlotGroup.GLOVES, defenseFactor: 0.4, priceFactor: 0.65, bonusField: 'strengthBonus' },
  { noun: 'Buty', category: ItemCategory.ARMOR, slotGroup: SlotGroup.BOOTS, defenseFactor: 0.4, priceFactor: 0.65, bonusField: 'agilityBonus' },
  { noun: 'Płaszcz', category: ItemCategory.ARMOR, slotGroup: SlotGroup.CLOAK, defenseFactor: 0.3, priceFactor: 0.8, bonusField: 'agilityBonus' },
  { noun: 'Koszula', category: ItemCategory.ARMOR, slotGroup: SlotGroup.SHIRT, defenseFactor: 0.25, priceFactor: 0.55, bonusField: 'enduranceBonus' },
  { noun: 'Naszyjnik', category: ItemCategory.ACCESSORY, slotGroup: SlotGroup.NECKLACE, defenseFactor: 0.15, priceFactor: 0.8, bonusField: 'intelligenceBonus' },
  { noun: 'Kolczyk', category: ItemCategory.ACCESSORY, slotGroup: SlotGroup.EARRING, defenseFactor: 0.1, priceFactor: 0.65, bonusField: 'intelligenceBonus' },
  { noun: 'Pierścień', category: ItemCategory.ACCESSORY, slotGroup: SlotGroup.RING, defenseFactor: 0.1, priceFactor: 0.65, bonusField: 'agilityBonus' },
  { noun: 'Pas', category: ItemCategory.SPECIAL, slotGroup: SlotGroup.BELT, defenseFactor: 0.2, priceFactor: 0.7, bonusField: 'strengthBonus' },
  { noun: 'Bransoleta', category: ItemCategory.SPECIAL, slotGroup: SlotGroup.BRACELET, defenseFactor: 0.1, priceFactor: 0.7, bonusField: 'agilityBonus' },
  { noun: 'Brosza', category: ItemCategory.SPECIAL, slotGroup: SlotGroup.BROOCH, defenseFactor: 0.1, priceFactor: 0.75, bonusField: 'enduranceBonus' },
  { noun: 'Diadem', category: ItemCategory.SPECIAL, slotGroup: SlotGroup.HAIR_ACCESSORY, defenseFactor: 0.1, priceFactor: 0.85, bonusField: 'intelligenceBonus' },
];

function withBonus(field: BonusField, value: number): Partial<Prisma.ItemCreateInput> {
  return value > 0 ? { [field]: value } : {};
}

const rarityPriceMultiplier: Record<ItemRarity, number> = {
  COMMON: 1,
  UNCOMMON: 1.5,
  RARE: 2.75,
  EPIC: 4.5,
  LEGENDARY: 7.5,
};

function gradeForLevel(level: number): ItemGrade {
  if (level >= 84) return ItemGrade.ANCIENT;
  if (level >= 80) return ItemGrade.RUNIC;
  if (level >= 76) return ItemGrade.S;
  if (level >= 61) return ItemGrade.A;
  if (level >= 52) return ItemGrade.B;
  if (level >= 40) return ItemGrade.C;
  if (level >= 20) return ItemGrade.D;
  return ItemGrade.NO_GRADE;
}

function stableRarity(name: string): ItemRarity {
  const roll = [...name].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) % 100, 7);
  if (roll < 4) return ItemRarity.EPIC;
  if (roll < 16) return ItemRarity.RARE;
  if (roll < 42) return ItemRarity.UNCOMMON;
  return ItemRarity.COMMON;
}

function rarityBonus(rarity: ItemRarity): number {
  if (rarity === ItemRarity.LEGENDARY) return 5;
  if (rarity === ItemRarity.EPIC) return 3;
  if (rarity === ItemRarity.RARE) return 2;
  if (rarity === ItemRarity.UNCOMMON) return 1;
  return 0;
}

function weaponVariance(weaponType: WeaponType | null | undefined): number {
  switch (weaponType) {
    case WeaponType.DAGGER:
      return 0.06;
    case WeaponType.SWORD:
    case WeaponType.STAFF:
      return 0.1;
    case WeaponType.BOW:
    case WeaponType.POLEARM:
      return 0.15;
    case WeaponType.AXE:
    case WeaponType.BLUNT:
      return 0.2;
    default:
      return 0.1;
  }
}

function itemEffectDescription(source: Prisma.ItemCreateInput, rarity: ItemRarity): string {
  const exceptional = rarity === ItemRarity.RARE || rarity === ItemRarity.EPIC || rarity === ItemRarity.LEGENDARY;
  if (source.category === ItemCategory.WEAPON) {
    return exceptional
      ? 'Runy wyryte w metalu wzmacniają jeden z bojowych talentów właściciela.'
      : 'Staranne wyważenie nadaje broni charakterystyczny dla niej zakres obrażeń.';
  }
  if (source.slotGroup === SlotGroup.CLOAK) {
    return 'Lekki splot nie zatrzymuje ciosów, lecz ułatwia zmianę pozycji podczas starcia.';
  }
  if (source.category === ItemCategory.ARMOR || source.category === ItemCategory.SHIELD_SIGIL) {
    return exceptional
      ? 'Wzmocnione łączenia chronią ciało, a runy płatnerskie zwiększają wytrzymałość właściciela.'
      : 'Każda warstwa materiału została ułożona tak, aby zapewnić możliwie najlepszą ochronę przed uderzeniami.';
  }
  switch (source.slotGroup) {
    case SlotGroup.NECKLACE:
      return 'Kamień noszony blisko serca wzmacnia żywotność właściciela.';
    case SlotGroup.EARRING:
      return 'Precyzyjny szlif pomaga dostrzec chwilę dogodną do zadania trafienia krytycznego.';
    case SlotGroup.RING:
      return 'Delikatne runy poprawiają pewność ruchów i zręczność dłoni.';
    case SlotGroup.BELT:
      return 'Usztywniona konstrukcja wspiera siłę korpusu i odporność na trudy walki.';
    case SlotGroup.BRACELET:
      return 'Rytmicznie ułożone ogniwa pomagają prowadzić gardę i odbijać ciosy.';
    case SlotGroup.BROOCH:
      return 'Zaklęcie ochronne wzmacnia wytrzymałość oraz zapas sił życiowych.';
    case SlotGroup.HAIR_ACCESSORY:
      return 'Symbol skupienia wyostrza umysł i ocenę słabych punktów przeciwnika.';
    default:
      return 'Przedmiot przygotowany do użycia podczas dalszych wypraw.';
  }
}

/**
 * Jedno miejsce balansowania całego katalogu. Zwykła broń zapewnia tylko
 * obrażenia, zwykły pancerz tylko obronę, a akcesoria i dodatki
 * zawsze pełnią funkcję użytkową i nie udają kolejnej warstwy pancerza.
 */
function balanceItem(source: Prisma.ItemCreateInput, forcedRarity?: ItemRarity): Prisma.ItemCreateInput {
  const rarity = forcedRarity ?? stableRarity(source.name);
  const minLevel = Number(source.minLevel ?? 1);
  const attackPower = Number(source.attackPower ?? 0);
  const rarityPower = rarityBonus(rarity);
  const utilityScale = 1 + rarityPower + Math.floor(minLevel / 10);
  const rareBonus = rarityPower === 0 ? 0 : rarityPower + Math.floor(minLevel / 14);
  const isWeapon = source.category === ItemCategory.WEAPON;
  const variance = weaponVariance(source.weaponType);
  const isUtility =
    source.category === ItemCategory.ACCESSORY ||
    source.category === ItemCategory.SPECIAL ||
    source.slotGroup === SlotGroup.CLOAK;

  const balanced: Prisma.ItemCreateInput = {
    ...source,
    rarity,
    grade: gradeForLevel(minLevel),
    price: Math.max(1, Math.round(Number(source.price ?? 0) * rarityPriceMultiplier[rarity])),
    damageMin: isWeapon ? Math.max(1, Math.floor(attackPower * (1 - variance))) : 0,
    damageMax: isWeapon ? Math.max(1, Math.ceil(attackPower * (1 + variance))) : 0,
    defensePower: isUtility ? 0 : Number(source.defensePower ?? 0),
    strengthBonus: 0,
    agilityBonus: 0,
    enduranceBonus: 0,
    intelligenceBonus: 0,
    parryBonus: source.slotGroup === SlotGroup.SHIELD_SIGIL ? Number(source.parryBonus ?? 0) : 0,
    maxHpBonus: 0,
    criticalChanceBonus: 0,
  };

  if (isWeapon && rareBonus > 0) {
    const field: BonusField =
      source.weaponType === WeaponType.DAGGER || source.weaponType === WeaponType.BOW
        ? 'agilityBonus'
        : source.weaponType === WeaponType.STAFF
          ? 'intelligenceBonus'
          : source.weaponType === WeaponType.BLUNT
            ? 'enduranceBonus'
            : 'strengthBonus';
    Object.assign(balanced, withBonus(field, rareBonus));
    const specialRoll = [...source.name].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 3;
    if (specialRoll === 0) balanced.criticalChanceBonus = Math.max(1, rarityPower - 1);
    if (specialRoll === 1) balanced.maxHpBonus = rarityPower * 6;
  } else if (!isUtility && rareBonus > 0 && source.category !== ItemCategory.CONSUMABLE) {
    balanced.enduranceBonus = rareBonus;
    if (rarity === ItemRarity.EPIC || rarity === ItemRarity.LEGENDARY) balanced.maxHpBonus = 10 + minLevel;
  }

  if (isUtility) {
    switch (source.slotGroup) {
      case SlotGroup.NECKLACE:
        balanced.maxHpBonus = utilityScale * 8;
        break;
      case SlotGroup.EARRING:
        balanced.criticalChanceBonus = utilityScale;
        break;
      case SlotGroup.RING:
      case SlotGroup.CLOAK:
      case SlotGroup.BRACELET:
        balanced.agilityBonus = utilityScale;
        if (source.slotGroup === SlotGroup.BRACELET) balanced.parryBonus = utilityScale;
        break;
      case SlotGroup.BELT:
        balanced.strengthBonus = utilityScale;
        balanced.maxHpBonus = utilityScale * 4;
        break;
      case SlotGroup.BROOCH:
        balanced.enduranceBonus = utilityScale;
        balanced.maxHpBonus = utilityScale * 6;
        break;
      case SlotGroup.HAIR_ACCESSORY:
        balanced.intelligenceBonus = utilityScale;
        balanced.criticalChanceBonus = Math.max(1, utilityScale - 1);
        break;
      default:
        break;
    }
  }

  balanced.description = `${source.description ?? ''} ${itemEffectDescription(source, rarity)}`.trim();

  return balanced;
}

function generateItemFamilies(): Prisma.ItemCreateInput[] {
  return itemTiers.flatMap((tier) => {
    const weapons = weaponFamilies.map((family) => ({
      name: `${family.noun} ${tier.suffix}`,
      description: `Broń z linii ${tier.suffix}, wykonana zgodnie z tradycją dawnych mistrzów pogranicza.`,
      category: ItemCategory.WEAPON,
      slotGroup: SlotGroup.WEAPON,
      weaponType: family.weaponType,
      price: Math.round(tier.priceBase * 1.2),
      minLevel: tier.minLevel,
      attackPower: tier.power + family.powerOffset,
      ...withBonus(family.bonusField, tier.bonus),
    }));

    const equipment = equipmentFamilies.map((family) => ({
      name: family.slotGroup === SlotGroup.SHIRT ? tier.shirtName : `${family.noun} ${tier.suffix}`,
      description: family.slotGroup === SlotGroup.SHIRT
        ? tier.shirtDescription
        : `Element wyposażenia z linii ${tier.suffix}, stworzony z myślą o wędrowcach przemierzających niebezpieczne trakty.`,
      category: family.category,
      slotGroup: family.slotGroup,
      iconUrl: family.slotGroup === SlotGroup.SHIRT
        ? `shirt:${gradeForLevel(tier.minLevel).toLowerCase()}`
        : undefined,
      price: Math.round(tier.priceBase * family.priceFactor),
      minLevel: tier.minLevel,
      defensePower: Math.max(1, Math.round(tier.power * family.defenseFactor)),
      parryBonus: family.slotGroup === SlotGroup.SHIELD_SIGIL ? 3 + tier.bonus * 2 : 0,
      ...withBonus(family.bonusField, tier.bonus),
    }));

    return [...weapons, ...equipment].map((item) => balanceItem(item));
  });
}

const items: Prisma.ItemCreateInput[] = [
  ...handcraftedItems.map((item) => balanceItem(item)),
  ...generateItemFamilies(),
  ...relicItems.map((item) => balanceItem(item, ItemRarity.LEGENDARY)),
  ...tavernStoryRelicItems,
];

async function seedBots(): Promise<void> {
  const legacyRaider = await prisma.bot.findFirst({ where: { name: 'Orczy Najezdnik' } });
  const currentRaider = await prisma.bot.findFirst({ where: { name: 'Orczy Najeźdźca' } });
  if (legacyRaider && !currentRaider) {
    await prisma.bot.update({ where: { id: legacyRaider.id }, data: { name: 'Orczy Najeźdźca' } });
  }

  const bots = [
    {
      name: 'Goblin Zwiadowca',
      level: 1,
      expReward: 20,
      goldReward: 15,
      stats: { strength: 4, agility: 6, endurance: 3, intelligence: 2 },
    },
    {
      name: 'Orczy Najeźdźca',
      level: 5,
      expReward: 80,
      goldReward: 50,
      stats: { strength: 10, agility: 5, endurance: 8, intelligence: 3 },
    },
  ];

  for (const bot of bots) {
    const existing = await prisma.bot.findFirst({ where: { name: bot.name } });
    if (existing) continue;

    const combatant = await prisma.combatant.create({ data: { type: 'BOT' } });
    await prisma.combatantStats.create({ data: { combatantId: combatant.id, ...bot.stats } });
    await prisma.bot.create({
      data: {
        combatantId: combatant.id,
        name: bot.name,
        level: bot.level,
        expReward: bot.expReward,
        goldReward: bot.goldReward,
      },
    });
  }
}

async function main(): Promise<void> {
  const duplicateNames = items
    .map((item) => item.name)
    .filter((name, index, names) => names.indexOf(name) !== index);

  if (duplicateNames.length > 0) {
    throw new Error(`Powtórzone nazwy przedmiotów w danych początkowych: ${[...new Set(duplicateNames)].join(', ')}`);
  }

  // Przedmioty zużywalne są poza aktualnym zakresem gry. Czyścimy również
  // ich stare wpisy w ofertach i plecakach, aby nie pozostawały w UI.
  const consumables = await prisma.item.findMany({
    where: { category: ItemCategory.CONSUMABLE },
    select: { id: true },
  });
  const consumableIds = consumables.map((item) => item.id);
  if (consumableIds.length > 0) {
    await prisma.shopEntry.deleteMany({ where: { itemId: { in: consumableIds } } });
    await prisma.inventoryItem.deleteMany({ where: { itemId: { in: consumableIds } } });
    await prisma.item.deleteMany({ where: { id: { in: consumableIds } } });
  }

  // Jednorazowe, bezstratne przemianowanie dawnej linii koszul zachowuje
  // istniejace wpisy w plecakach i wyposażeniu graczy.
  const renamedItems = [
    ['Topor Zelaznego Wilka', 'Topór Żelaznego Wilka'],
    ['Topor Burzowego Klanu', 'Topór Burzowego Klanu'],
    ['Sztylet Nocnego Gonca', 'Sztylet Nocnego Gońca'],
    ['Kiel Zmierzchu', 'Kieł Zmierzchu'],
    ['Luk Jesionowego Straznika', 'Łuk Jesionowego Strażnika'],
    ['Luk Ksiezycowej Kniei', 'Łuk Cichej Kniei'],
    ['Mlot Kamiennej Przysiegi', 'Młot Kamiennej Przysięgi'],
    ['Gwiezdne Berlo Glebin', 'Gwiezdne Berło Głębin'],
    ['Halabarda Strazy Granicznej', 'Halabarda Straży Granicznej'],
    ['Tarcza Debowego Bastionu', 'Tarcza Dębowego Bastionu'],
    ['Sigil Blekitnej Runy', 'Sigil Błękitnej Runy'],
    ['Kaptur Wedrowca', 'Kaptur Wędrowca'],
    ['Helm Zelaznego Wilka', 'Hełm Żelaznego Wilka'],
    ['Koszula Srebrnej Nici', 'Brosza Srebrnej Nici'],
    ['Koszula Wędrowca', 'Lniana Koszula Wędrowca'],
    ['Koszula Żelaznej Straży', 'Popielata Koszula Straży'],
    ['Koszula Szarego Wilka', 'Zielona Koszula Tropiciela'],
    ['Koszula Księżycowej Kniei', 'Purpurowa Koszula Kniei'],
    ['Koszula Runicznego Bastionu', 'Karmazynowa Koszula Runiczna'],
    ['Koszula Smoczego Pogranicza', 'Błękitna Koszula Smocza'],
    ['Koszula Gwiezdnej Cytadeli', 'Granatowa Koszula Gwiazd'],
    ['Koszula Korony Burz', 'Koszula Nocy Pradawnych'],
  ] as const;

  for (const [legacyName, currentName] of renamedItems) {
    const legacyItem = await prisma.item.findUnique({ where: { name: legacyName } });
    const currentItem = await prisma.item.findUnique({ where: { name: currentName } });
    if (legacyItem && !currentItem) {
      await prisma.item.update({ where: { id: legacyItem.id }, data: { name: currentName } });
    }
  }

  for (const item of items) {
    await prisma.item.upsert({
      where: { name: item.name },
      update: item,
      create: item,
    });
  }

  for (const family of Object.values(GemFamily)) {
    for (const tier of Object.values(GemTier)) {
      const name = `${gemTierNames[tier]} — ${gemFamilyNames[family]}`;
      await prisma.gemDefinition.upsert({
        where: { family_tier: { family, tier } },
        create: { family, tier, name, minLevel: gemTierMinLevels[tier] },
        update: { name, minLevel: gemTierMinLevels[tier] },
      });
    }
  }

  await seedBots();
  // eslint-disable-next-line no-console
  console.log(`Dodano ${items.length} autorskich przedmiotów i przykładowych przeciwników PvE.`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
