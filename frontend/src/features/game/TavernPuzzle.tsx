import { useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { solveTavernPuzzle } from '../../api/tavern.api';
import { getApiErrorMessage } from '../../lib/api-errors';
import type { TavernQuestPuzzleStage, TavernQuestRun } from '../../types/game';

interface TavernPuzzleProps {
  stage: TavernQuestPuzzleStage;
  onRetry: (quest: TavernQuestRun) => void;
  onAdvance: (quest: TavernQuestRun) => void;
  journeyContent?: ReactNode;
}

export function TavernPuzzle({ stage, onRetry, onAdvance, journeyContent }: TavernPuzzleProps) {
  const [selection, setSelection] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<{ solved: boolean; text: string } | null>(null);
  const mutation = useMutation({
    mutationFn: solveTavernPuzzle,
    onSuccess: (nextQuest) => {
      const progress = nextQuest.puzzles[nextQuest.puzzles.length - 1];
      if (nextQuest.currentStage?.type === 'PUZZLE' && nextQuest.currentStage.index === stage.index) {
        setSelection([]);
        onRetry(nextQuest);
        return;
      }
      setOutcome({ solved: Boolean(progress?.solved), text: progress?.outcomeText ?? 'Mechanizm zamilkł.' });
      window.setTimeout(() => onAdvance(nextQuest), 850);
    },
  });

  function select(id: string) {
    if (mutation.isPending || outcome) return;
    if (stage.kind !== 'SEQUENCE') {
      setSelection([id]);
      return;
    }
    setSelection((current) => {
      if (current.includes(id)) return current.filter((entry) => entry !== id);
      if (current.length >= stage.requiredSelections) return current;
      return [...current, id];
    });
  }

  const canSubmit = selection.length === stage.requiredSelections && !mutation.isPending && !outcome;

  return <section className={`tavern-puzzle is-${stage.kind.toLowerCase()} ${outcome ? outcome.solved ? 'is-solved' : 'is-failed' : ''}`}>
    <div className="tavern-puzzle-heading">
      <p className="tavern-stage-kicker">{stage.kicker}</p>
      <h1>{stage.title}</h1>
      <p>{stage.narrative}</p>
    </div>

    {journeyContent}

    <div className="tavern-puzzle-table">
      <header>
        <span>{stage.kind === 'SEQUENCE' ? 'Mechanizm starej pieczęci' : stage.kind === 'TESTIMONY' ? 'Zeznania na szlaku' : 'Ślady i poszlaki'}</span>
        <strong>Próba {Math.min(stage.attempts + 1, stage.maxAttempts)} z {stage.maxAttempts}</strong>
      </header>
      <blockquote>{stage.prompt}</blockquote>
      <p className="tavern-puzzle-instruction">{stage.instruction}</p>

      {stage.kind === 'SEQUENCE' ? <div className="tavern-puzzle-sequence" aria-label="Wybrana kolejność">
        {Array.from({ length: stage.requiredSelections }, (_, index) => {
          const option = stage.options.find((entry) => entry.id === selection[index]);
          return <button type="button" key={index} className={option ? 'filled' : ''} onClick={() => option ? select(option.id) : undefined}>
            <small>{index + 1}</small><strong>{option?.symbol ?? '—'}</strong><span>{option?.label ?? 'Wybierz znak'}</span>
          </button>;
        })}
      </div> : null}

      <div className="tavern-puzzle-options">
        {stage.options.map((option) => {
          const order = selection.indexOf(option.id);
          return <button type="button" key={option.id} className={order >= 0 ? 'selected' : ''} onClick={() => select(option.id)} disabled={mutation.isPending || Boolean(outcome)}>
            <i>{order >= 0 ? stage.kind === 'SEQUENCE' ? order + 1 : '✓' : option.symbol ?? '?'}</i>
            <span><strong>{option.label}</strong><small>{option.detail}</small></span>
          </button>;
        })}
      </div>

      {stage.feedback ? <div className="tavern-puzzle-feedback"><strong>Pierwsza próba nie otworzyła drogi</strong><p>{stage.feedback}</p></div> : null}
      {stage.hint ? <p className="tavern-puzzle-hint"><span>Wskazówka Miry</span>{stage.hint}</p> : null}
      {outcome ? <div className="tavern-puzzle-outcome"><strong>{outcome.solved ? 'WZÓR ODKRYTY' : 'PIECZĘĆ ODRZUCA ODPOWIEDŹ'}</strong><p>{outcome.text}</p></div> : null}

      <footer>
        {stage.kind === 'SEQUENCE' && selection.length ? <button type="button" className="secondary" onClick={() => setSelection([])} disabled={mutation.isPending || Boolean(outcome)}>Wyczyść układ</button> : <span />}
        <button type="button" disabled={!canSubmit} onClick={() => mutation.mutate(selection)}>{mutation.isPending ? 'Pieczęć odpowiada…' : 'Potwierdź odpowiedź'}</button>
      </footer>
      {mutation.error ? <p className="tavern-quest-error">{getApiErrorMessage(mutation.error)}</p> : null}
    </div>
  </section>;
}
