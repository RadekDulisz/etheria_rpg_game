import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fightArena,
  getArenaOpponent,
  getArenaProfile,
  type ArenaTargetAlignment,
} from '../../api/arena.api';
import { ActionNotice } from '../../components/ui/ActionNotice';
import { ActionBubble } from '../../components/ui/ActionBubble';
import { Button } from '../../components/ui/Button';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { getApiErrorMessage } from '../../lib/api-errors';
import type { ArenaOpponent, ArenaProfile, Character } from '../../types/game';
import { ArenaSequence } from './ArenaSequence';

export function ArenaView({ character }: { character: Character }) {
  const queryClient = useQueryClient();
  const [sequenceOpen, setSequenceOpen] = useState(false);
  const [excludedOpponentId, setExcludedOpponentId] = useState<string>();
  const [searchingOpponent, setSearchingOpponent] = useState(true);
  const [entryWarning, setEntryWarning] = useState<string>();
  const [targetAlignment, setTargetAlignment] = useState<ArenaTargetAlignment>(
    () => character.reputation < 0 ? 'GOOD' : 'EVIL',
  );
  const searchStartedAtRef = useRef(Date.now());
  const opponentQuery = useQuery({
    queryKey: ['arena', 'opponent', targetAlignment, excludedOpponentId ?? 'initial'],
    queryFn: () => getArenaOpponent(excludedOpponentId, targetAlignment),
    retry: false,
    refetchOnMount: 'always',
  });
  const profileQuery = useQuery({
    queryKey: ['arena', 'profile'],
    queryFn: getArenaProfile,
  });
  const fightMutation = useMutation({
    mutationFn: fightArena,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['character', 'me'] }),
        queryClient.invalidateQueries({ queryKey: ['arena', 'profile'] }),
      ]);
    },
    onError: () => setSequenceOpen(false),
  });
  const opponent = opponentQuery.data;

  useEffect(() => {
    if (!searchingOpponent || opponentQuery.isFetching || !opponent) return;
    const minimumSearchDuration = 900;
    const remaining = Math.max(0, minimumSearchDuration - (Date.now() - searchStartedAtRef.current));
    const revealTimer = window.setTimeout(() => setSearchingOpponent(false), remaining);
    return () => window.clearTimeout(revealTimer);
  }, [opponent, opponentQuery.isFetching, searchingOpponent]);

  useEffect(() => {
    if (opponentQuery.isError) setSearchingOpponent(false);
  }, [opponentQuery.isError]);

  function beginFight() {
    if (!opponent) return;
    if (!opponent.canFight) {
      setEntryWarning(`Potrzebujesz więcej niż ${profileQuery.data?.minimumHpPercent ?? 25}% HP, aby wejść na arenę. Odpocznij lub ulecz bohatera.`);
      return;
    }
    setEntryWarning(undefined);
    setSequenceOpen(true);
    fightMutation.mutate(opponent.id);
  }

  function closeSequence() {
    setSequenceOpen(false);
    fightMutation.reset();
    searchForNewOpponent();
  }

  function rerollOpponent() {
    searchForNewOpponent();
  }

  function selectTargetAlignment(alignment: ArenaTargetAlignment) {
    if (alignment === targetAlignment) return;
    searchStartedAtRef.current = Date.now();
    setSearchingOpponent(true);
    setExcludedOpponentId(opponent?.id);
    setTargetAlignment(alignment);
  }

  function searchForNewOpponent() {
    if (!opponent) return;
    searchStartedAtRef.current = Date.now();
    setSearchingOpponent(true);
    setExcludedOpponentId(opponent.id);
  }

  return <div className="view-enter">
    <SectionTitle eyebrow="Arena" title="Krąg stali" description="Rywal jest dobierany do siły bohatera z początku obecnego poziomu. Każde starcie zużywa kondycję, a zwycięstwa i porażki zmieniają pozycję w rankingu Koloseum." />

    {opponentQuery.isError ? <ActionNotice tone="error">{getApiErrorMessage(opponentQuery.error)}</ActionNotice> : null}

    <section className="arena-gate">
      <img src="/assets/auth-city-etheria.png" alt="Kamienna arena Etherii" />
      <div className="arena-gate-shade" />
      <div className="arena-gate-copy">
        <p>Heroldowie otwierają żelazne wrota</p>
        <h2>Na piasku nie przemawia tytuł. Przemawia ostrze.</h2>
      </div>
    </section>

    <section className="arena-alignment-choice" aria-label="Wybór reputacji przeciwnika">
      <div>
        <p>Wybierz stronę konfliktu</p>
        <span>Wygrana zmienia reputację o jeden punkt. Porażka i remis nie mają wpływu.</span>
      </div>
      <div className="arena-alignment-actions">
        <button
          type="button"
          className={targetAlignment === 'EVIL' ? 'is-active is-evil' : ''}
          onClick={() => selectTargetAlignment('EVIL')}
        >
          <span>Ścigaj złych</span>
          <small>Za zwycięstwo: <b>+1 REP</b></small>
        </button>
        <button
          type="button"
          className={targetAlignment === 'GOOD' ? 'is-active is-good' : ''}
          onClick={() => selectTargetAlignment('GOOD')}
        >
          <span>Walcz z dobrymi</span>
          <small>Za zwycięstwo: <b>−1 REP</b></small>
        </button>
      </div>
    </section>

    <section className="arena-opponent-stage">
      <div className="arena-opponent-viewport">
        {searchingOpponent || opponentQuery.isLoading ? <ArenaOpponentSearch /> : opponent ? <div className="arena-matchup">
          <CombatantCard side="player" name={character.name} level={character.level} avatar="/assets/hero-portrait.png" arenaFrame={character.arenaRank.frame} rankTitle={character.arenaRank.title} rankColor={character.arenaRank.color} reputation={character.reputation} stats={character.stats ? {
            strength: character.stats.strength,
            agility: character.stats.agility,
            endurance: character.stats.endurance,
            intelligence: character.stats.intelligence,
            attack: character.stats.attackPower,
            attackMin: character.stats.attackMin,
            attackMax: character.stats.attackMax,
            defense: character.stats.defensePower,
          } : undefined} />
          <div className="arena-versus">
            <span>VS</span>
            <small className={`arena-challenge arena-challenge-${opponent.challenge.toLowerCase()}`}>{opponent.challenge}</small>
            <em className="game-number">{opponent.powerRatio}% twojej siły</em>
            <button
              type="button"
              className="arena-reroll-control"
              onClick={rerollOpponent}
              disabled={opponentQuery.isFetching || fightMutation.isPending}
            >
              <span aria-hidden="true">↻</span>
              Losuj innego
            </button>
          </div>
          <CombatantCard side="opponent" name={opponent.name} level={opponent.level} avatar="/assets/hero-portrait-chest-elite.png" arenaFrame={opponent.arenaRank.frame} rankTitle={opponent.arenaRank.title} rankColor={opponent.arenaRank.color} reputation={opponent.reputation} reputationRank={opponent.reputationRank} stats={opponent.stats} />
        </div> : null}
      </div>

      <div className={`arena-entry-command ${searchingOpponent || !opponent ? 'arena-entry-command-searching' : ''}`}>
        <div className="arena-entry-action action-feedback-anchor">
          <Button onClick={beginFight} disabled={!opponent || searchingOpponent || fightMutation.isPending}>
            {fightMutation.isPending ? 'Otwieranie wrót…' : searchingOpponent || !opponent ? 'Herold szuka rywala…' : !opponent.canFight ? 'Brak sił do walki' : 'Wejdź na arenę'}
          </Button>
          {entryWarning || fightMutation.isError ? (
            <ActionBubble onDismiss={() => {
              setEntryWarning(undefined);
              fightMutation.reset();
            }}>
              {entryWarning ?? getApiErrorMessage(fightMutation.error)}
            </ActionBubble>
          ) : null}
        </div>
        {opponent && !searchingOpponent ? <div className="arena-entry-stakes">
          <article className="arena-stake-gold">
            <span>Złoto</span>
            <strong><CurrencyAmount value={opponent.goldReward} compact /></strong>
          </article>
          <article className="arena-stake-xp">
            <span>Doświadczenie</span>
            <strong><b aria-hidden="true">✦</b><span className="game-number">{opponent.expReward}</span> XP</strong>
          </article>
          <article className="arena-stake-hp">
            <span>Koszt kondycji</span>
            <strong className="game-number">−{opponent.entryHpCost} HP</strong>
          </article>
        </div> : <div className="arena-entry-stakes arena-entry-stakes-placeholder" aria-hidden="true" />}
      </div>
    </section>

    {profileQuery.data ? <ArenaProfilePanel profile={profileQuery.data} /> : null}

    {sequenceOpen && opponent ? <ArenaSequence opponent={opponent} result={fightMutation.data ?? null} challenge={opponent.challenge} onComplete={closeSequence} /> : null}
  </div>;
}

function ArenaProfilePanel({ profile }: { profile: ArenaProfile }) {
  const total = profile.wins + profile.losses + profile.draws;
  const winRate = total > 0 ? Math.round(profile.wins / total * 100) : 0;

  const currentThreshold = profile.rank.threshold;
  const nextThreshold = profile.nextRank?.threshold ?? profile.rating;
  const rankProgress = profile.nextRank
    ? Math.max(0, Math.min(100, (profile.rating - currentThreshold) / Math.max(1, nextThreshold - currentThreshold) * 100))
    : 100;

  return <section className={`arena-profile-panel arena-rank-${profile.rank.frame}`}>
    <div className="arena-profile-summary">
      <div className="arena-profile-heading">
        <div>
          <p>Rejestr Koloseum</p>
          <h2 style={{ color: profile.rank.color }}>{profile.rank.title}</h2>
        </div>
        <span className="arena-profile-position"><small>Miejsce</small><b className="game-number">#{profile.position}</b></span>
      </div>
      <div className="arena-profile-rating">
        <strong className="game-number">{profile.rating}</strong>
        <span>punktów areny</span>
      </div>
      <dl>
        <div><dt>Zwycięstwa</dt><dd className="game-number">{profile.wins}</dd></div>
        <div><dt>Porażki</dt><dd className="game-number">{profile.losses}</dd></div>
        <div><dt>Remisy</dt><dd className="game-number">{profile.draws}</dd></div>
        <div><dt>Skuteczność</dt><dd className="game-number">{winRate}%</dd></div>
      </dl>
      <div className="arena-rank-progress">
        <div>
          <span>{profile.nextRank ? `Droga do rangi: ${profile.nextRank.title}` : 'Najwyższa ranga osiągnięta'}</span>
          <b className="game-number">{profile.nextRank ? `${profile.pointsToNextRank} pkt` : 'MAX'}</b>
        </div>
        <i><span style={{ width: `${rankProgress}%` }} /></i>
      </div>
      <small>Każde starcie kosztuje {profile.hpCostPercent}% maksymalnego HP. Brama zamyka się przy {profile.minimumHpPercent}% HP lub mniej.</small>
    </div>
    <div className="arena-leaderboard">
      <div className="arena-leaderboard-heading">
        <p>Ranking bohaterów</p>
        <span>Najwyżej sklasyfikowani wojownicy Etherii</span>
      </div>
      <ol>
        {profile.leaderboard.map((entry) => {
          const battles = entry.arenaWins + entry.arenaLosses + entry.arenaDraws;
          const effectiveness = battles > 0 ? Math.round(entry.arenaWins / battles * 100) : 0;
          return <li
            key={entry.id}
            className={`${entry.position <= 3 ? 'arena-leaderboard-podium' : ''} ${entry.id === profile.characterId ? 'arena-leaderboard-current' : ''}`}
          >
            <span><b className="game-number">{entry.position}</b></span>
            <div className="arena-leaderboard-identity">
              <strong>{entry.name}{entry.id === profile.characterId ? <i>Ty</i> : null}</strong>
              <small style={{ color: entry.rank.color }}>{entry.rank.title}</small>
            </div>
            <div className="arena-leaderboard-record">
              <span><small>Bilans</small><b className="game-number">{entry.arenaWins}–{entry.arenaLosses}–{entry.arenaDraws}</b></span>
              <span><small>Wygrane</small><b className="game-number">{effectiveness}%</b></span>
            </div>
            <em>LVL <b className="game-number">{entry.level}</b></em>
            <b className="game-number">{entry.arenaRating}<small> pkt</small></b>
          </li>;
        })}
      </ol>
    </div>
  </section>;
}

function ArenaOpponentSearch() {
  return <div className="arena-opponent-search" role="status" aria-live="polite">
    <div className="arena-search-sigil" aria-hidden="true">
      <span>VS</span>
    </div>
    <div>
      <span>Herold areny</span>
      <h3>Poszukuje godnego przeciwnika</h3>
      <p>Porównujemy poziom, wyposażenie oraz doświadczenie bojowe.</p>
    </div>
    <div className="arena-search-progress" aria-hidden="true"><span /></div>
  </div>;
}

interface CombatantCardProps {
  side: 'player' | 'opponent';
  name: string;
  level: number;
  avatar: string;
  arenaFrame?: Character['arenaRank']['frame'];
  rankTitle?: string;
  rankColor?: string;
  reputation?: number;
  reputationRank?: ArenaOpponent['reputationRank'];
  stats?: { strength: number; agility: number; endurance: number; intelligence: number; attack: number; attackMin: number; attackMax: number; defense: number };
}

function CombatantCard({ side, name, level, avatar, arenaFrame, rankTitle, rankColor, reputation, reputationRank, stats }: CombatantCardProps) {
  return <article className={`arena-combatant-card arena-combatant-${side} arena-card-rank-${arenaFrame ?? 'ash'}`}>
    <div className="arena-combatant-portrait">
      <img src={avatar} alt="" />
    </div>
    <div className="arena-combatant-copy">
      <span>{side === 'player' ? 'Twój bohater' : 'Pretendent'} · LVL {level}</span>
      <h3>{name}</h3>
      {rankTitle ? <i className="arena-combatant-rank" style={{ color: rankColor }}>{rankTitle}</i> : null}
      {reputationRank && reputation !== undefined ? <p className={`arena-combatant-reputation is-${reputationRank.alignment.toLowerCase()}`} style={{ color: reputationRank.color }}>
        {reputationRank.name} · <b className="game-number">{reputation > 0 ? '+' : ''}{reputation} REP</b>
      </p> : null}
      {stats ? <dl>
        <div><dt>STR</dt><dd>{stats.strength}</dd></div><div><dt>DEX</dt><dd>{stats.agility}</dd></div>
        <div><dt>CON</dt><dd>{stats.endurance}</dd></div><div><dt>INT</dt><dd>{stats.intelligence}</dd></div>
        <div><dt>ATK</dt><dd title={`Średnia: ${stats.attack}`}>{stats.attackMin}–{stats.attackMax}</dd></div><div><dt>DEF</dt><dd>{stats.defense}</dd></div>
      </dl> : null}
    </div>
  </article>;
}
