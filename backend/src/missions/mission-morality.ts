import { MissionMorality } from '@prisma/client';

interface MoralRoute {
  title: string;
  description: string;
  success: string;
  failure: string;
}

export const MISSION_MORAL_ROUTES: Record<number, Record<MissionMorality, MoralRoute>> = {
  1: {
    GOOD: { title: 'Obroń bezbronnych', description: 'Bohater stawia bezpieczeństwo mieszkańców ponad własnym zyskiem.', success: 'Oddaje część łupu poszkodowanym, a wieść o tym czynie dociera do Etherii.', failure: 'Choć nie osiąga celu, do końca osłania odwrót niewinnych.', },
    EVIL: { title: 'Wykorzystaj ich strach', description: 'Bohater żąda zapłaty od tych, którzy nie mają innego wyboru.', success: 'Zabiera dodatkową daninę, pozostawiając za sobą strach i gorzką pamięć.', failure: 'Nie zdobywa łupu, lecz brutalnością ucisza wszystkich świadków porażki.', },
  },
  2: {
    GOOD: { title: 'Oczyść szlak', description: 'Bohater przysięga usunąć zagrożenie, zanim pochłonie kolejnych podróżnych.', success: 'Niszczy źródło niebezpieczeństwa i pozostawia bezpieczne znaki dla następnych wędrowców.', failure: 'Wycofuje się dopiero wtedy, gdy ostatni zagrożony mieszkaniec znajduje schronienie.', },
    EVIL: { title: 'Przejmij sekrety', description: 'Bohater zamierza zachować odnalezioną wiedzę i kosztowności wyłącznie dla siebie.', success: 'Ukrywa najcenniejsze znaleziska i sprzedaje innym jedynie wygodną część prawdy.', failure: 'Zaciera własne ślady, skazując następnych wędrowców na to samo zagrożenie.', },
  },
  3: {
    GOOD: { title: 'Złam klątwę', description: 'Bohater ryzykuje, aby uwolnić ofiary mrocznej siły zamiast tylko zgarnąć nagrodę.', success: 'Pieczętuje przeklęte miejsce, a uwięzione dusze odzyskują spokój.', failure: 'Nie pokonuje zła, lecz ratuje tych, których zdoła wyprowadzić z ciemności.', },
    EVIL: { title: 'Przywłaszcz moc', description: 'Bohater chce ujarzmić fragment klątwy i obrócić go na własną korzyść.', success: 'Wyrywa mroczną moc z ruin, nie zważając na cenę, którą zapłacą okoliczne ziemie.', failure: 'Pozostawia klątwę rozbudzoną, by zatrzeć ślady swojej chciwości.', },
  },
  4: {
    GOOD: { title: 'Stań jako tarcza Etherii', description: 'Bohater prowadzi uderzenie tak, aby odciągnąć zagrożenie od bezbronnych osad.', success: 'Łamie natarcie wroga i otwiera drogę ucieczki wszystkim ocalałym.', failure: 'Sam przyjmuje najcięższe ciosy, kupując mieszkańcom czas na ratunek.', },
    EVIL: { title: 'Zajmij miejsce tyrana', description: 'Bohater nie chce zniszczyć potęgi wroga, lecz przejąć jego władzę i skarbiec.', success: 'Przejmuje symbole władzy pokonanego dowódcy i zmusza ocalałych do posłuszeństwa.', failure: 'Podpala drogę odwrotu, pozostawiając sprzymierzeńców na pastwę wroga.', },
  },
  5: {
    GOOD: { title: 'Ocal ostatnie światło', description: 'Bohater wyrzeka się pokusy potęgi, by ochronić całą Etherię przed nadchodzącą ciemnością.', success: 'Niszczy źródło mocy mimo jego niewyobrażalnej wartości, zapisując swój czyn w legendach.', failure: 'Upada, lecz ostatnim uderzeniem osłabia ciemność i daje światu jeszcze trochę czasu.', },
    EVIL: { title: 'Zasiądź na pustym tronie', description: 'Bohater pragnie przejąć zakazaną potęgę i podporządkować sobie tych, którzy przetrwają.', success: 'Przyjmuje moc cytadeli, a jego imię zaczyna być wypowiadane wyłącznie szeptem.', failure: 'Ucieka z odłamkiem zakazanej mocy, pozostawiając za sobą przebudzone zło.', },
  },
};

