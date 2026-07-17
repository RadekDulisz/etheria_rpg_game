export interface MissionTemplate {
  title: string;
  description: string;
  success: string;
  failure: string;
}

export const MISSION_TEMPLATES: Record<number, MissionTemplate[]> = {
  1: [
    { title: 'Wilki pod palisadą', description: 'Pasterze proszą o przepędzenie watahy krążącej przy nocnych ogniskach.', success: 'Świt zastaje szlak bezpieczny, a wdzięczni pasterze dotrzymują słowa.', failure: 'Wataha znika w zaroślach, zostawiając bohatera z pustymi rękami i świeżymi ranami.' },
    { title: 'Zaginiona przesyłka', description: 'Kupiecki kufer przepadł na błotnistym trakcie pomiędzy Etherią a starą przeprawą.', success: 'Kufer wraca nienaruszony, zanim wieść o jego zaginięciu dociera do miasta.', failure: 'Ślady urywają się w rozlewisku. Poszukiwania trzeba przerwać przed zmrokiem.' },
    { title: 'Straż nad traktem', description: 'Karawana potrzebuje miecza do ochrony podczas krótkiej, lecz niespokojnej drogi.', success: 'Bandyci rezygnują z zasadzki, a karawana bezpiecznie przekracza bramę.', failure: 'Zasadzka rozprasza orszak. Bohater osłania odwrót, ale nagroda przepada.' },
  ],
  2: [
    { title: 'Ślady w Popielnym Lesie', description: 'W popiele pojawiły się tropy stworzenia, którego nie opisuje żaden łowiecki bestiariusz.', success: 'Trop prowadzi do leża. Dowód zwycięstwa ucisza szepty mieszkańców.', failure: 'Mgła gęstnieje, a łowca sam staje się zwierzyną. Powrót kosztuje wiele sił.' },
    { title: 'Ruiny Starej Strażnicy', description: 'Z opuszczonej wieży nocami błyska światło, choć garnizon zniknął wiele lat temu.', success: 'W ruinach gaśnie przemytniczy sygnał, a przejęte monety trafiają do sakwy.', failure: 'Spróchniałe schody załamują się podczas starcia. Dalsza droga zostaje odcięta.' },
    { title: 'Szept bagiennej kaplicy', description: 'Rybacy słyszą modlitwy dochodzące spod wody, gdy nad mokradłami wschodzi księżyc.', success: 'Zatopiony dzwon milknie, a bagna po raz pierwszy od tygodni zasypiają.', failure: 'Czarne wody bronią swej tajemnicy. Bohater ledwie odnajduje drogę na brzeg.' },
  ],
  3: [
    { title: 'Katakumby Milczących', description: 'Pod klasztorem otwarto kryptę, której strażnicy nie rzucają cieni.', success: 'Pieczęć zostaje odnowiona, zanim umarli odnajdują schody ku powierzchni.', failure: 'Kamienne wrota zamykają się z hukiem. Wyprawa uchodzi z życiem, lecz bez łupów.' },
    { title: 'Bestia z Czerwonego Wąwozu', description: 'Każdej nocy coś rozrywa żelazne sidła i znika pomiędzy czerwonymi skałami.', success: 'Ryk bestii cichnie w głębi wąwozu, a jej trofeum potwierdza wykonanie zlecenia.', failure: 'Stwór okazuje się sprytniejszy od łowców. Odwrót prowadzi przez ostre rumowisko.' },
    { title: 'Karmazynowy kult', description: 'Zwiadowcy odkryli krąg kultystów odprawiających rytuał przy wygasłym kurhanie.', success: 'Rytuał zostaje przerwany, a złowroga księga płonie przed wypowiedzeniem ostatniego słowa.', failure: 'Krąg staje w ogniu. Bohater ucieka przed zaklęciem, które rozdziera noc.' },
  ],
  4: [
    { title: 'Brama Krwawego Bastionu', description: 'Za żelazną bramą gromadzi się oddział przeklętych rycerzy bez herbów i imion.', success: 'Brama upada, zanim armia bastionu wyrusza ku osadom Etherii.', failure: 'Przeklęta stal nie ustępuje. Bohater musi przebić sobie drogę z oblężonego dziedzińca.' },
    { title: 'Polowanie na smoczego pomiota', description: 'Spalone pola znaczą lot młodej bestii, która urządziła leże w wulkanicznych pieczarach.', success: 'Ogień w pieczarach wygasa, a ocalałe osady zbierają obiecaną zapłatę.', failure: 'Smoczy ogień odcina drogę do leża. Powrót przez dym pozostawia bolesne blizny.' },
    { title: 'Wieża bez świtu', description: 'Nad czarną wieżą noc trwa nawet w południe, a jej zegary odliczają czas wstecz.', success: 'Mechanizm wieży pęka. Pierwszy promień słońca odsłania skarbiec maga.', failure: 'Czas w komnatach zapętla się. Bohater wyrywa się z wieży, zanim traci własne imię.' },
  ],
  5: [
    { title: 'Serce Czarnej Cytadeli', description: 'W samym sercu cytadeli bije kryształ karmiony wspomnieniami poległych królów.', success: 'Kryształ pęka, a echo dawnych władców nareszcie opuszcza mury cytadeli.', failure: 'Serce cytadeli budzi kamiennych strażników. Ucieczka pochłania niemal wszystkie siły.' },
    { title: 'Ołtarz Bezgwiezdnej Nocy', description: 'Kapłani pustki chcą zgasić ostatnią gwiazdę widoczną nad Etherią.', success: 'Ostrze przecina rytualne więzy. Gwiazda rozbłyska, a ciemność cofa się poza horyzont.', failure: 'Rytuał wymyka się spod kontroli. Bohater przerywa go częściowo i uchodzi przed pustką.' },
    { title: 'Tron Popielnego Władcy', description: 'Martwy monarcha powrócił na tron i zwołuje armię z prochu spalonych miast.', success: 'Korona rozpada się pod ciosem, a popielna armia rozsypuje się bez rozkazu.', failure: 'Władca okazuje się zbyt potężny. Bohater przeżywa tylko dzięki zawaleniu sali tronowej.' },
  ],
};

