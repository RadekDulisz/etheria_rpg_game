import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { executeTestTool, type TestToolAction } from '../../api/test-tools.api';
import type { Character } from '../../types/game';
import { Button } from '../ui/Button';

interface TestToolsPanelProps {
  character: Character;
}

interface Command {
  action: TestToolAction;
  value?: number;
}

function errorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const message = (error.response?.data as { message?: string | string[] } | undefined)?.message;
    return Array.isArray(message) ? message.join(', ') : message ?? 'Nie udało się wykonać operacji';
  }
  return 'Nie udało się wykonać operacji';
}

export function TestToolsPanel({ character }: TestToolsPanelProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [gold, setGold] = useState(100_000);
  const [experience, setExperience] = useState(500);
  const [level, setLevel] = useState(character.level);
  const [reputation, setReputation] = useState(character.reputation);
  const [learningPoints, setLearningPoints] = useState(character.stats?.unspentPoints ?? 0);
  const [arenaRating, setArenaRating] = useState(character.arenaRating);
  const [gems, setGems] = useState(100);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const mutation = useMutation({
    mutationFn: ({ action, value }: Command) => executeTestTool(action, value),
    onMutate: () => setNotice(null),
    onSuccess: async ({ character: updated, message }) => {
      queryClient.setQueryData(['character', 'me'], updated);
      setLevel(updated.level);
      setReputation(updated.reputation);
      setLearningPoints(updated.stats?.unspentPoints ?? 0);
      setArenaRating(updated.arenaRating);
      setNotice({ kind: 'success', text: message });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['equipment'] }),
        queryClient.invalidateQueries({ queryKey: ['blacksmith'] }),
        queryClient.invalidateQueries({ queryKey: ['missions'] }),
        queryClient.invalidateQueries({ queryKey: ['property'] }),
        queryClient.invalidateQueries({ queryKey: ['arena'] }),
        queryClient.invalidateQueries({ queryKey: ['tavern'] }),
      ]);
    },
    onError: (error) => setNotice({ kind: 'error', text: errorMessage(error) }),
  });

  const run = (action: TestToolAction, value?: number) => mutation.mutate({ action, value });

  return (
    <aside className={`test-tools-panel ${open ? 'is-open' : ''}`} aria-label="Panel narzędzi testowych">
      <button className="test-tools-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className="test-tools-sigil">T</span>
        <span><small>KONTO TESTOWE</small>Narzędzia mistrza gry</span>
        <b>{open ? 'ZWIŃ' : 'ROZWIŃ'}</b>
      </button>

      <div className="test-tools-body">
        <div className="test-tools-summary">
          <span><small>LVL</small>{character.level}</span>
          <span><small>ZŁOTO</small>{Number(character.gold).toLocaleString('pl-PL')}</span>
          <span><small>HP</small>{character.currentHp}/{character.maxHp}</span>
        </div>

        {notice ? <p className={`test-tools-notice test-tools-notice-${notice.kind}`}>{notice.text}</p> : null}

        <section className="test-tools-section">
          <h3>Rozwój bohatera</h3>
          <label className="test-tools-field">
            <span>Dodaj doświadczenie</span>
            <input type="number" min="0" value={experience} onChange={(event) => setExperience(Number(event.target.value))} />
            <Button onClick={() => run('ADD_EXPERIENCE', experience)} disabled={mutation.isPending}>Dodaj XP</Button>
          </label>
          <label className="test-tools-field">
            <span>Ustaw poziom</span>
            <input type="number" min="1" max="84" value={level} onChange={(event) => setLevel(Number(event.target.value))} />
            <Button onClick={() => run('SET_LEVEL', level)} disabled={mutation.isPending}>Ustaw</Button>
          </label>
          <label className="test-tools-field">
            <span>Punkty nauki</span>
            <input type="number" min="0" value={learningPoints} onChange={(event) => setLearningPoints(Number(event.target.value))} />
            <Button onClick={() => run('SET_LEARNING_POINTS', learningPoints)} disabled={mutation.isPending}>Ustaw</Button>
          </label>
        </section>

        <section className="test-tools-section">
          <h3>Zasoby</h3>
          <label className="test-tools-field">
            <span>Zmień złoto</span>
            <input type="number" value={gold} onChange={(event) => setGold(Number(event.target.value))} />
            <Button onClick={() => run('ADD_GOLD', gold)} disabled={mutation.isPending}>Zastosuj</Button>
          </label>
          <label className="test-tools-field">
            <span>Każdy klejnot</span>
            <input type="number" min="1" max="1000" value={gems} onChange={(event) => setGems(Number(event.target.value))} />
            <Button onClick={() => run('ADD_ALL_GEMS', gems)} disabled={mutation.isPending}>Dodaj</Button>
          </label>
        </section>

        <section className="test-tools-section">
          <h3>Stan postaci</h3>
          <div className="test-tools-presets">
            {[1, 25, 50, 100].map((value) => (
              <button type="button" key={value} onClick={() => run('SET_HEALTH_PERCENT', value)} disabled={mutation.isPending}>
                HP {value}%
              </button>
            ))}
          </div>
          <label className="test-tools-field">
            <span>Reputacja</span>
            <input type="number" min="-10000" max="10000" value={reputation} onChange={(event) => setReputation(Number(event.target.value))} />
            <Button onClick={() => run('SET_REPUTATION', reputation)} disabled={mutation.isPending}>Ustaw</Button>
          </label>
          <div className="test-tools-presets test-tools-presets-three">
            <button type="button" onClick={() => run('SET_REPUTATION', -10_000)} disabled={mutation.isPending}>Nemezis</button>
            <button type="button" onClick={() => run('SET_REPUTATION', 0)} disabled={mutation.isPending}>Neutralny</button>
            <button type="button" onClick={() => run('SET_REPUTATION', 10_000)} disabled={mutation.isPending}>Noblesse</button>
          </div>
        </section>

        <section className="test-tools-section">
          <h3>Arena i biegłość</h3>
          <label className="test-tools-field">
            <span>Ranking areny</span>
            <input type="number" min="0" max="10000" value={arenaRating} onChange={(event) => setArenaRating(Number(event.target.value))} />
            <Button onClick={() => run('SET_ARENA_RATING', arenaRating)} disabled={mutation.isPending}>Ustaw</Button>
          </label>
          <div className="test-tools-pair">
            <Button onClick={() => run('MAX_EXPERTISE')} disabled={mutation.isPending}>Maks. biegłość</Button>
            <Button variant="secondary" onClick={() => run('RESET_EXPERTISE')} disabled={mutation.isPending}>Reset biegłości</Button>
          </div>
        </section>

        <section className="test-tools-section">
          <h3>Scenariusze</h3>
          <Button fullWidth onClick={() => run('GUARANTEE_LEGENDARY_MISSION')} disabled={mutation.isPending}>Następna wyprawa legendarna</Button>
          <Button fullWidth onClick={() => run('REROLL_TAVERN_OFFERS')} disabled={mutation.isPending}>Nowe zlecenia Karczmy</Button>
          <Button fullWidth onClick={() => run('RESET_TAVERN_QUEST')} disabled={mutation.isPending}>Resetuj misję karczmy</Button>
          <Button variant="secondary" fullWidth onClick={() => run('RESET_LIMITS')} disabled={mutation.isPending}>Odblokuj arenę i rytuał</Button>
        </section>

        {mutation.isPending ? <p className="test-tools-working">Zapisywanie zmiany…</p> : null}
      </div>
    </aside>
  );
}
