import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fightArena, getArenaOpponent } from '../../api/arena.api';
import { ActionNotice } from '../../components/ui/ActionNotice';
import { Button } from '../../components/ui/Button';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { EmptyState } from '../../components/ui/EmptyState';
import { GamePanel } from '../../components/ui/GamePanel';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { getApiErrorMessage } from '../../lib/api-errors';
import type { Character } from '../../types/game';
import { ArenaSequence } from './ArenaSequence';

export function ArenaView({ character }: { character: Character }) {
  const queryClient = useQueryClient();
  const [sequenceOpen, setSequenceOpen] = useState(false);
  const opponentQuery = useQuery({ queryKey: ['arena', 'opponent'], queryFn: getArenaOpponent, retry: false });
  const fightMutation = useMutation({
    mutationFn: fightArena,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
    },
    onError: () => setSequenceOpen(false),
  });
  const opponent = opponentQuery.data;

  function beginFight() {
    if (!opponent) return;
    setSequenceOpen(true);
    fightMutation.mutate(opponent.id);
  }

  function closeSequence() {
    setSequenceOpen(false);
    fightMutation.reset();
    void opponentQuery.refetch();
  }

  return <div className="view-enter">
    <SectionTitle eyebrow="Arena" title="Krąg stali" description="Zmierz się z rywalem o podobnym poziomie i sile. Starcie jest treningowe — nie odbiera trwałego zdrowia ani złota przegranemu." />

    {opponentQuery.isError ? <ActionNotice tone="error">{getApiErrorMessage(opponentQuery.error)}</ActionNotice> : null}
    {fightMutation.isError ? <ActionNotice tone="error" onDismiss={() => fightMutation.reset()}>{getApiErrorMessage(fightMutation.error)}</ActionNotice> : null}

    <section className="arena-gate">
      <img src="/assets/auth-city-etheria.png" alt="Kamienna arena Etherii" />
      <div className="arena-gate-shade" />
      <div className="arena-gate-copy">
        <p>Heroldowie otwierają żelazne wrota</p>
        <h2>Na piasku nie przemawia tytuł. Przemawia ostrze.</h2>
      </div>
    </section>

    <GamePanel className="mt-4" title="Wylosowany rywal" eyebrow="Dobór według poziomu i siły" action={<Button variant="secondary" onClick={() => void opponentQuery.refetch()} disabled={opponentQuery.isFetching || fightMutation.isPending}>Losuj ponownie</Button>}>
      {opponentQuery.isLoading ? <EmptyState title="Herold szuka przeciwnika">Porównujemy poziom, wyposażenie i doświadczenie bojowe.</EmptyState> : opponent ? <div className="arena-matchup">
        <CombatantCard side="player" name={character.name} level={character.level} avatar="/assets/hero-portrait.png" stats={character.stats ? {
          strength: character.stats.strength,
          agility: character.stats.agility,
          endurance: character.stats.endurance,
          intelligence: character.stats.intelligence,
          attack: character.stats.attackPower,
          defense: character.stats.defensePower,
        } : undefined} />
        <div className="arena-versus">
          <span>VS</span>
          <small className={`arena-challenge arena-challenge-${opponent.challenge.toLowerCase()}`}>{opponent.challenge}</small>
          <em className="game-number">{opponent.powerRatio}% twojej siły</em>
        </div>
        <CombatantCard side="opponent" name={opponent.name} level={opponent.level} avatar="/assets/hero-portrait-chest-elite.png" stats={opponent.stats} />
      </div> : null}

      {opponent ? <div className="arena-stakes">
        <div><span>Nagroda za zwycięstwo</span><strong><CurrencyAmount value={opponent.goldReward} compact /> <i>·</i> {opponent.expReward} XP</strong></div>
        <Button onClick={beginFight} disabled={fightMutation.isPending}>
          {fightMutation.isPending ? 'Otwieranie wrót…' : 'Wejdź na arenę'}
        </Button>
      </div> : null}
    </GamePanel>

    {sequenceOpen && opponent ? <ArenaSequence opponent={opponent} result={fightMutation.data ?? null} onComplete={closeSequence} /> : null}
  </div>;
}

interface CombatantCardProps {
  side: 'player' | 'opponent';
  name: string;
  level: number;
  avatar: string;
  stats?: { strength: number; agility: number; endurance: number; intelligence: number; attack: number; defense: number };
}

function CombatantCard({ side, name, level, avatar, stats }: CombatantCardProps) {
  return <article className={`arena-combatant-card arena-combatant-${side}`}>
    <div className="arena-combatant-portrait"><img src={avatar} alt="" /></div>
    <div className="arena-combatant-copy">
      <span>{side === 'player' ? 'Twój bohater' : 'Pretendent'} · LVL {level}</span>
      <h3>{name}</h3>
      {stats ? <dl>
        <div><dt>STR</dt><dd>{stats.strength}</dd></div><div><dt>DEX</dt><dd>{stats.agility}</dd></div>
        <div><dt>CON</dt><dd>{stats.endurance}</dd></div><div><dt>INT</dt><dd>{stats.intelligence}</dd></div>
        <div><dt>ATK</dt><dd>{stats.attack}</dd></div><div><dt>DEF</dt><dd>{stats.defense}</dd></div>
      </dl> : null}
    </div>
  </article>;
}
