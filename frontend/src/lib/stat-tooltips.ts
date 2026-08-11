export const statTooltips = {
  strength: 'Zwiększa obrażenia mieczy, toporów, młotów i broni drzewcowej. Każde 2 punkty siły zapewniają około 1 punkt Ataku przed obroną celu.',
  agility: 'Zwiększa obrażenia łuków i sztyletów. Każdy punkt przewagi DEX nad przeciwnikiem zmienia szansę trafienia o 1 punkt procentowy i nieznacznie zwiększa szansę na krytyk.',
  endurance: 'Każdy punkt zapewnia 4 HP i zwiększa skuteczność obrony przed obrażeniami.',
  intelligence: 'Zwiększa obrażenia kosturów, lekko poprawia parowanie i zmniejsza szansę przeciwnika na trafienie krytyczne.',
  attack: 'Rzeczywisty zakres normalnego ciosu przed obroną celu. Uwzględnia obrażenia broni, właściwy atrybut oraz biegłość, która daje 1 punkt Ataku za każde 2 poziomy. Obrona celu redukuje tę wartość procentowo.',
  defense: 'Zmniejsza otrzymywane obrażenia procentowo. Uwzględnia ochronę pancerza oraz premię wynikającą z wytrzymałości; kolejne punkty mają malejący zwrot.',
  critical: 'Szansa na zadanie ciosu o sile 150% normalnych obrażeń. Zależy od DEX, biegłości i wyposażenia; nie może przekroczyć 50%. Biegłość może zapewnić maksymalnie 4 punkty procentowe.',
  parry: 'Szansa na całkowite odparcie trafionego ciosu. Zależy od INT i premii z wyposażenia; nie może przekroczyć 30%.',
  points: 'Niewykorzystane punkty zdobywane przy awansie. Można je przeznaczyć na siłę, zręczność, wytrzymałość albo inteligencję.',
} as const;
