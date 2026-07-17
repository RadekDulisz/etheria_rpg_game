import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createGuild, declareGuildWar, getMyGuild, joinGuild, leaveGuild, listGuilds,
  listMyGuildWars, removeGuildMember, resolveGuildWar, transferGuildLeadership,
} from '../../api/guilds.api';
import { ActionNotice } from '../../components/ui/ActionNotice';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { EmptyState } from '../../components/ui/EmptyState';
import { GamePanel } from '../../components/ui/GamePanel';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { getApiErrorMessage } from '../../lib/api-errors';
import type { Character, GuildDetails, GuildMember, GuildSummary, GuildWar } from '../../types/game';

type GuildDecision =
  | { type: 'leave' }
  | { type: 'kick'; member: GuildMember }
  | { type: 'transfer'; member: GuildMember }
  | { type: 'war'; guild: GuildSummary }
  | { type: 'resolve'; war: GuildWar };

export function GuildView({ character }: { character: Character }) {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState<string | null>(null);
  const [decision, setDecision] = useState<GuildDecision | null>(null);
  const myGuildQuery = useQuery({ queryKey: ['guild', 'mine'], queryFn: getMyGuild, retry: false });
  const guildsQuery = useQuery({ queryKey: ['guilds'], queryFn: listGuilds, retry: false });
  const warsQuery = useQuery({ queryKey: ['guild', 'wars'], queryFn: listMyGuildWars, enabled: Boolean(myGuildQuery.data), retry: false });

  async function refreshGuilds() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['guild', 'mine'] }),
      queryClient.invalidateQueries({ queryKey: ['guilds'] }),
      queryClient.invalidateQueries({ queryKey: ['guild', 'wars'] }),
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] }),
    ]);
  }

  const createMutation = useMutation({ mutationFn: createGuild, onSuccess: async (guild) => { setSuccess(`Założono bractwo ${guild.name}.`); await refreshGuilds(); } });
  const joinMutation = useMutation({ mutationFn: joinGuild, onSuccess: async (guild) => { setSuccess(`Dołączono do bractwa ${guild.name}.`); await refreshGuilds(); } });
  const leaveMutation = useMutation({ mutationFn: leaveGuild, onSuccess: async () => { setDecision(null); setSuccess('Opuszczono bractwo.'); await refreshGuilds(); } });
  const kickMutation = useMutation({ mutationFn: removeGuildMember, onSuccess: async () => { setDecision(null); setSuccess('Bohater został usunięty z bractwa.'); await refreshGuilds(); } });
  const transferMutation = useMutation({ mutationFn: transferGuildLeadership, onSuccess: async (_, characterId) => { setDecision(null); setSuccess(`Przekazano przywództwo bohaterowi ${myGuildQuery.data?.members.find((member) => member.characterId === characterId)?.characterName ?? ''}.`); await refreshGuilds(); } });
  const declareMutation = useMutation({ mutationFn: declareGuildWar, onSuccess: async (war) => { setDecision(null); setSuccess(`Rozpoczęła się wojna z bractwem ${war.defenderGuildName}.`); await refreshGuilds(); } });
  const resolveMutation = useMutation({ mutationFn: resolveGuildWar, onSuccess: async (war) => { setDecision(null); setSuccess(war.summary ?? 'Wojna została rozstrzygnięta.'); await refreshGuilds(); } });
  const mutations = [createMutation, joinMutation, leaveMutation, kickMutation, transferMutation, declareMutation, resolveMutation];
  const error = mutations.find((mutation) => mutation.isError)?.error;
  const pending = mutations.some((mutation) => mutation.isPending);
  const guild = myGuildQuery.data;

  return <div className="view-enter">
    <SectionTitle eyebrow="Bractwo" title={guild ? guild.name : 'Gildie Etherii'} description={guild ? 'Wspólnota bohaterów, kronika członków i wojny o znaczenie w Etherii.' : 'Załóż własne bractwo albo dołącz do istniejącej wspólnoty bohaterów.'} />
    {success ? <ActionNotice tone="success" onDismiss={() => setSuccess(null)}>{success}</ActionNotice> : null}
    {error ? <ActionNotice tone="error" onDismiss={() => mutations.forEach((mutation) => mutation.reset())}>{getApiErrorMessage(error)}</ActionNotice> : null}

    {myGuildQuery.isLoading ? <GamePanel><EmptyState title="Posłańcy sprawdzają księgi">Trwa odczytywanie rejestru bractw.</EmptyState></GamePanel> : guild ? <GuildHall
      character={character}
      guild={guild}
      guilds={guildsQuery.data ?? []}
      wars={warsQuery.data ?? []}
      pending={pending}
      decision={decision}
      onDecision={setDecision}
      onConfirm={() => {
        if (!decision) return;
        if (decision.type === 'leave') leaveMutation.mutate();
        if (decision.type === 'kick') kickMutation.mutate(decision.member.characterId);
        if (decision.type === 'transfer') transferMutation.mutate(decision.member.characterId);
        if (decision.type === 'war') declareMutation.mutate(decision.guild.id);
        if (decision.type === 'resolve') resolveMutation.mutate(decision.war.id);
      }}
    /> : <GuildRegistry guilds={guildsQuery.data ?? []} pending={pending} onCreate={(input) => createMutation.mutate(input)} onJoin={(guildId) => joinMutation.mutate(guildId)} />}
  </div>;
}

function GuildRegistry({ guilds, pending, onCreate, onJoin }: { guilds: GuildSummary[]; pending: boolean; onCreate: (input: { name: string; description?: string }) => void; onJoin: (guildId: string) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    onCreate({ name: name.trim(), description: description.trim() || undefined });
  }
  return <>
    <section className="guild-registry-hero"><img src="/assets/auth-city-etheria.png" alt="Warownia bractw Etherii" /><div /><article><span>Księga chorągwi</span><h2>Samotne ostrze budzi lęk. Bractwo zmienia los krainy.</h2><p>Każde bractwo mieści maksymalnie dwudziestu bohaterów. Dołączenie jest natychmiastowe.</p></article></section>
    <div className="mt-4 grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
      <GamePanel title="Załóż bractwo" eyebrow="Nowa chorągiew">
        <form className="guild-create-form" onSubmit={submit}>
          <label><span>Nazwa bractwa</span><input value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={24} required placeholder="np. Strażnicy Północy" /></label>
          <label><span>Sentencja lub opis</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={120} rows={4} placeholder="Krótka dewiza bractwa…" /></label>
          <small>{description.length} / 120 znaków</small>
          <Button type="submit" fullWidth disabled={pending || name.trim().length < 3}>Wznieś chorągiew</Button>
        </form>
      </GamePanel>
      <GamePanel title="Istniejące bractwa" eyebrow={`${guilds.length} wpisów w księdze`}>
        {guilds.length ? <div className="guild-browser">{guilds.map((guild) => <article key={guild.id}>
          <GuildCrest name={guild.name} />
          <div><span>Lider: {guild.leaderCharacterName}</span><h3>{guild.name}</h3><p>{guild.description ?? 'Bractwo nie zapisało jeszcze swojej dewizy.'}</p><small>{guild.memberCount} / 20 członków</small></div>
          <Button disabled={pending || guild.memberCount >= 20} onClick={() => onJoin(guild.id)}>{guild.memberCount >= 20 ? 'Brak miejsc' : 'Dołącz'}</Button>
        </article>)}</div> : <EmptyState title="Księga jest pusta">Możesz wznieść pierwszą chorągiew w Etherii.</EmptyState>}
      </GamePanel>
    </div>
  </>;
}

function GuildHall({ character, guild, guilds, wars, pending, decision, onDecision, onConfirm }: { character: Character; guild: GuildDetails; guilds: GuildSummary[]; wars: GuildWar[]; pending: boolean; decision: GuildDecision | null; onDecision: (decision: GuildDecision | null) => void; onConfirm: () => void }) {
  const isLeader = guild.leaderCharacterId === character.id;
  const activeWars = wars.filter((war) => war.status === 'ACTIVE');
  const opponents = guilds.filter((entry) => entry.id !== guild.id && !activeWars.some((war) => war.attackerGuildId === entry.id || war.defenderGuildId === entry.id));
  return <>
    <section className="guild-hall-banner">
      <img src="/assets/auth-city-etheria.png" alt="Siedziba bractwa" /><div className="guild-hall-shade" />
      <GuildCrest name={guild.name} large />
      <article><span>{isLeader ? 'Twoja chorągiew' : 'Bractwo bohatera'}</span><h2>{guild.name}</h2><p>{guild.description ?? 'Bractwo nie zapisało jeszcze swojej dewizy.'}</p><small>Założono {formatDate(guild.createdAt)} · {guild.memberCount} / 20 członków</small></article>
    </section>
    <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.82fr]">
      <GamePanel title="Kronika członków" eyebrow={`${guild.members.length} bohaterów`}>
        <div className="guild-roster">{guild.members.map((member, index) => <article key={member.characterId}>
          <span className="guild-roster-index game-number">{String(index + 1).padStart(2, '0')}</span>
          <div><strong>{member.characterName}</strong><small>{member.role === 'LEADER' ? 'Lider bractwa' : `Członek od ${formatDate(member.joinedAt)}`}</small></div>
          <em>LVL <b className="game-number">{member.level}</b></em>
          {isLeader && member.characterId !== character.id ? <div className="guild-member-actions"><button onClick={() => onDecision({ type: 'transfer', member })}>Przekaż dowodzenie</button><button onClick={() => onDecision({ type: 'kick', member })}>Usuń</button></div> : null}
        </article>)}</div>
      </GamePanel>
      <div className="space-y-4">
        <GamePanel title="Dowództwo" eyebrow={isLeader ? 'Komnata lidera' : 'Twoja rola'}>
          <dl className="guild-command-stats"><div><dt>Przywódca</dt><dd>{guild.leaderCharacterName}</dd></div><div><dt>Twoja ranga</dt><dd>{isLeader ? 'Lider' : 'Członek'}</dd></div><div><dt>Aktywne wojny</dt><dd>{activeWars.length}</dd></div></dl>
          <Button className="mt-4" variant="danger" fullWidth disabled={pending || (isLeader && guild.memberCount > 1)} onClick={() => onDecision({ type: 'leave' })}>{isLeader && guild.memberCount === 1 ? 'Rozwiąż bractwo' : 'Opuść bractwo'}</Button>
          {isLeader && guild.memberCount > 1 ? <p className="mt-2 text-center text-[0.62rem] leading-5 text-stone-500">Najpierw przekaż przywództwo innemu członkowi.</p> : null}
        </GamePanel>
        {isLeader ? <GamePanel title="Wypowiedz wojnę" eyebrow="Dostępne chorągwie">
          {opponents.length ? <div className="guild-opponents">{opponents.map((opponent) => <button key={opponent.id} disabled={pending} onClick={() => onDecision({ type: 'war', guild: opponent })}><GuildCrest name={opponent.name} /><span><strong>{opponent.name}</strong><small>{opponent.memberCount} członków · lider {opponent.leaderCharacterName}</small></span><i>›</i></button>)}</div> : <p className="text-sm leading-6 text-stone-500">Brak bractw, którym można obecnie wypowiedzieć wojnę.</p>}
        </GamePanel> : null}
      </div>
    </div>
    <GamePanel className="mt-4" title="Wojny bractwa" eyebrow="Kronika konfliktów">
      {wars.length ? <div className="guild-war-list">{wars.map((war) => <WarCard key={war.id} war={war} guildId={guild.id} canResolve={isLeader} pending={pending} onResolve={() => onDecision({ type: 'resolve', war })} />)}</div> : <EmptyState title="Chorągiew nie poznała jeszcze wojny">Pierwszy konflikt zostanie zapisany w tej kronice.</EmptyState>}
    </GamePanel>
    {decision ? <div className="guild-decision"><ConfirmDialog title={decisionTitle(decision)} pending={pending} onCancel={() => onDecision(null)} onConfirm={onConfirm} confirmLabel={pending ? 'Zapisywanie decyzji…' : decisionConfirmLabel(decision)}>{decisionDescription(decision)}</ConfirmDialog></div> : null}
  </>;
}

function WarCard({ war, guildId, canResolve, pending, onResolve }: { war: GuildWar; guildId: string; canResolve: boolean; pending: boolean; onResolve: () => void }) {
  const won = war.winnerGuildId === guildId;
  return <article className={`guild-war-card guild-war-${war.status.toLowerCase()} ${war.status === 'FINISHED' ? won ? 'guild-war-won' : 'guild-war-lost' : ''}`}>
    <div className="guild-war-status"><span>{war.status === 'ACTIVE' ? 'Wojna trwa' : won ? 'Zwycięstwo' : 'Porażka'}</span><small>{formatDate(war.startedAt)}</small></div>
    <div className="guild-war-sides"><strong>{war.attackerGuildName}</strong><i>przeciw</i><strong>{war.defenderGuildName}</strong></div>
    <p>{war.summary ?? `Konflikt rozpoczął bohater ${war.startedByCharacterName}. O wyniku zdecyduje siła członków i los pola bitwy.`}</p>
    {war.status === 'ACTIVE' && canResolve ? <Button disabled={pending} onClick={onResolve}>Rozstrzygnij starcie</Button> : null}
  </article>;
}

function GuildCrest({ name, large = false }: { name: string; large?: boolean }) {
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return <span className={`guild-crest ${large ? 'guild-crest-large' : ''}`} aria-hidden="true"><i>{initials}</i></span>;
}

function decisionTitle(decision: GuildDecision) {
  if (decision.type === 'leave') return 'Opuścić bractwo?';
  if (decision.type === 'kick') return `Usunąć bohatera ${decision.member.characterName}?`;
  if (decision.type === 'transfer') return 'Przekazać przywództwo?';
  if (decision.type === 'war') return `Wypowiedzieć wojnę ${decision.guild.name}?`;
  return 'Rozstrzygnąć wojnę?';
}
function decisionConfirmLabel(decision: GuildDecision) {
  if (decision.type === 'leave') return 'Potwierdź odejście';
  if (decision.type === 'kick') return 'Usuń członka';
  if (decision.type === 'transfer') return 'Przekaż dowodzenie';
  if (decision.type === 'war') return 'Wypowiedz wojnę';
  return 'Rozstrzygnij';
}
function decisionDescription(decision: GuildDecision) {
  if (decision.type === 'leave') return <>Opuszczenie bractwa usuwa bohatera z kroniki członków. Samotne bractwo lidera zostanie rozwiązane.</>;
  if (decision.type === 'kick') return <>Bohater <strong>{decision.member.characterName}</strong> natychmiast utraci członkostwo.</>;
  if (decision.type === 'transfer') return <>Bohater <strong>{decision.member.characterName}</strong> zostanie nowym liderem, a Ty otrzymasz rangę członka.</>;
  if (decision.type === 'war') return <>Rozpocznie się konflikt z bractwem <strong>{decision.guild.name}</strong>. Łączna siła członków wpłynie na szanse zwycięstwa.</>;
  return <>Serwer porówna poziomy, atrybuty i wyposażenie obu bractw. Silniejsza strona otrzyma przewagę, ale wynik nie jest całkowicie pewny. Zwycięzcy dostaną po <CurrencyAmount value={50} compact />.</>;
}
function formatDate(value: string) { return new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium' }).format(new Date(value)); }
