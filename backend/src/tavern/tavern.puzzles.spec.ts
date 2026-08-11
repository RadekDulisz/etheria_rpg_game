import { getTavernPuzzle, isPuzzleAnswerCorrect, isTavernPuzzleStage } from './tavern.puzzles';

describe('tavern puzzles', () => {
  it('places exactly one puzzle in every difficulty', () => {
    expect([0, 1, 2].filter((index) => isTavernPuzzleStage('EASY', index))).toEqual([1]);
    expect([0, 1, 2, 3].filter((index) => isTavernPuzzleStage('MEDIUM', index))).toEqual([2]);
    expect([0, 1, 2, 3, 4].filter((index) => isTavernPuzzleStage('HARD', index))).toEqual([2]);
  });

  it('validates ordered sequence without accepting a reordered answer', () => {
    const puzzle = getTavernPuzzle('mill-below-walls');
    expect(isPuzzleAnswerCorrect(puzzle, ['water', 'fire', 'ash'])).toBe(true);
    expect(isPuzzleAnswerCorrect(puzzle, ['fire', 'water', 'ash'])).toBe(false);
  });

  it('keeps solutions out of the generic option identifiers', () => {
    const puzzle = getTavernPuzzle('last-seal-asterion');
    expect(puzzle.kind).toBe('TESTIMONY');
    expect(puzzle.options.some((entry) => entry.id === puzzle.solution[0])).toBe(true);
  });
});
