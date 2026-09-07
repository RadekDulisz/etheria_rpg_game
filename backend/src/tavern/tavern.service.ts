import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TavernProvisionType, TavernQuestStatus } from '@prisma/client';
import { initialSocketState, resolveOwnedItemStats } from '../blacksmith/blacksmith.balance';
import { CharactersService } from '../characters/characters.service';
import { toCharacterResponse } from '../characters/characters.mapper';
import { applyExperienceGain } from '../characters/leveling';
import { getReputationRankDetails, REPUTATION_VISUAL_LIMIT } from '../characters/reputation';
import { PrismaService } from '../prisma/prisma.service';
import { calculatePropertyBonuses } from '../properties/property-bonuses';
import { calculateMaxHp } from '../combat/combat-formulas';
import { buildCombatSnapshot } from '../combat/combat-snapshot.builder';
import { simulateBattle } from '../combat/battle-simulator';
import { ChooseTavernPathDto } from './dto/choose-tavern-path.dto';
import { AcceptTavernOfferDto } from './dto/accept-tavern-offer.dto';
import { PurchaseProvisionDto } from './dto/purchase-provision.dto';
import { UseProvisionDto } from './dto/use-provision.dto';
import { SolveTavernPuzzleDto } from './dto/solve-tavern-puzzle.dto';
import { getTavernStage, tavernChoiceTarget, type TavernAttribute } from './tavern.quest';
import { buildTavernOffers, TAVERN_QUEST_TEMPLATES, tavernRefreshCost } from './tavern.templates';
import { getProvisionDefinition, rollStageWoundPercent, TAVERN_BAG_CAPACITY, TAVERN_PROVISIONS } from './tavern.provisions';
import { buildTavernEnemySnapshot, getTavernEnemy, shouldResolveTavernQuestAfterCombat } from './tavern.encounters';
import { getTavernPuzzle, isPuzzleAnswerCorrect } from './tavern.puzzles';
import { resolveTavernEnding } from './tavern.endings';
import { TAVERN_STORY_RELICS } from './tavern.relics';

const BOARD_LIFETIME_MS = 4 * 60 * 60 * 1000;
const DAILY_REFRESH_LIMIT = 3;
const BOARD_INCLUDE = { offers: true } as const;
const RUN_INCLUDE = {
  decisions: { orderBy: { stageIndex: 'asc' as const } },
  rewardItem: true,
  storyRelicItem: true,
  rewardGemDefinition: true,
  provisions: { orderBy: { type: 'asc' as const } },
  encounters: { orderBy: { stageIndex: 'asc' as const } },
  puzzles: { orderBy: { stageIndex: 'asc' as const } },
} as const;
const DIFFICULTY_ORDER = { EASY: 0, MEDIUM: 1, HARD: 2 } as const;
const BASE_SUCCESS_CHANCE = { EASY: 0.78, MEDIUM: 0.65, HARD: 0.52 } as const;
const TAVERN_ENEMY_ART: Partial<Record<string, string>> = {
  'ash-pack-memory': '/assets/tavern/enemies/ash-pack-memory-v2.png',
  'mill-ghoul': '/assets/tavern/enemies/mill-ghoul-v2.png',
  'marsh-wisp': '/assets/tavern/enemies/marsh-wisp-v4.png',
  'vael-drowned-knight': '/assets/tavern/enemies/vael-drowned-knight.png',
  'vael-spire-warden': '/assets/tavern/enemies/vael-spire-warden-v2.png',
  'phoenix-hunter': '/assets/tavern/enemies/phoenix-hunter-v2.png',
  'phoenix-revenant': '/assets/tavern/enemies/phoenix-revenant-v2.png',
  'raven-harpy': '/assets/tavern/enemies/raven-harpy.png',
  'raven-matriarch': '/assets/tavern/enemies/raven-matriarch.png',
  'bell-drowned': '/assets/tavern/enemies/bell-drowned.png',
  'chapel-warden': '/assets/tavern/enemies/chapel-warden.png',
  'thirteenth-bell': '/assets/tavern/enemies/thirteenth-bell.png',
  'necropolis-custodian': '/assets/tavern/enemies/necropolis-custodian.png',
  'seal-golem': '/assets/tavern/enemies/seal-golem.png',
  'void-cultist': '/assets/tavern/enemies/void-cultist-v2.png',
  'fractured-knight': '/assets/tavern/enemies/fractured-knight-v2.png',
  'asterion-remnant': '/assets/tavern/enemies/asterion-remnant.png',
};

type QuestRun = Prisma.TavernQuestRunGetPayload<{ include: typeof RUN_INCLUDE }>;

function utcDateOnly(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function randomInteger(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function endingRank(key: string | null | undefined): number {
  if (!key || key.endsWith(':failure') || key.endsWith(':abandoned')) return 0;
  if (key.endsWith(':costly')) return 1;
  return 2;
}

@Injectable()
export class TavernService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly charactersService: CharactersService,
  ) {}

  async getTavern(userId: string) {
    const character = await this.charactersService.getByUserId(userId);
    await this.resolveLegacyDefeat(character);
    const [board, activeQuest, provisionStacks, chronicle] = await Promise.all([
      this.ensureBoard(character.id, character.level),
      this.findCurrentQuest(character.id),
      this.prisma.tavernProvisionStack.findMany({ where: { characterId: character.id } }),
      this.prisma.tavernChronicleEntry.findMany({
        where: { characterId: character.id },
        include: { relicItem: true, endings: { orderBy: { firstDiscoveredAt: 'asc' } } },
        orderBy: { lastCompletedAt: 'desc' },
      }),
    ]);
    return this.toResponse(character.gold, character.level, board, activeQuest, provisionStacks, chronicle);
  }

  async refreshBoard(userId: string) {
    const character = await this.charactersService.getByUserId(userId);
    if (await this.findCurrentQuest(character.id)) {
      throw new ConflictException('Najpierw dokończ przyjęte zlecenie');
    }
    const current = await this.ensureBoard(character.id, character.level);
    const today = utcDateOnly();
    const sameDay = current.refreshDate.getTime() === today.getTime();
    const refreshesUsed = sameDay ? current.refreshCount : 0;
    if (refreshesUsed >= DAILY_REFRESH_LIMIT) {
      throw new ConflictException('Borwin nie ma dziś więcej nowych zleceń');
    }

    const cost = tavernRefreshCost(character.level, refreshesUsed);
    const nextOffers = buildTavernOffers(character.level, current.offers.map((offer) => offer.templateKey));
    const expiresAt = new Date(Date.now() + BOARD_LIFETIME_MS);

    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.character.updateMany({
        where: { id: character.id, gold: { gte: BigInt(cost) } },
        data: { gold: { decrement: BigInt(cost) } },
      });
      if (payment.count !== 1) throw new ConflictException('Masz za mało złota na odświeżenie tablicy');
      await tx.tavernOffer.deleteMany({ where: { boardId: current.id } });
      await tx.tavernBoard.update({
        where: { id: current.id },
        data: { expiresAt, generatedAt: new Date(), refreshDate: today, refreshCount: refreshesUsed + 1, offers: { create: nextOffers } },
      });
      const updated = await tx.character.findUniqueOrThrow({ where: { id: character.id }, select: { gold: true } });
      await tx.transaction.create({
        data: {
          characterId: character.id, type: 'TAVERN_REFRESH', amount: -BigInt(cost), balanceAfter: updated.gold,
          referenceId: current.id, description: `Nowe zlecenia Borwina ${refreshesUsed + 1}/${DAILY_REFRESH_LIMIT}`,
        },
      });
    });
    return this.getTavern(userId);
  }

  async rerollBoardForTesting(userId: string) {
    const character = await this.charactersService.getByUserId(userId);
    if (await this.findCurrentQuest(character.id)) {
      throw new ConflictException('Najpierw dokończ lub porzuć przyjęte zlecenie');
    }

    const current = await this.ensureBoard(character.id, character.level);
    const nextOffers = buildTavernOffers(
      character.level,
      current.offers.map((offer) => offer.templateKey),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.tavernOffer.deleteMany({ where: { boardId: current.id } });
      await tx.tavernBoard.update({
        where: { id: current.id },
        data: {
          expiresAt: new Date(Date.now() + BOARD_LIFETIME_MS),
          generatedAt: new Date(),
          offers: { create: nextOffers },
        },
      });
    });

    return this.getTavern(userId);
  }

  async purchaseProvision(userId: string, type: TavernProvisionType, dto: PurchaseProvisionDto) {
    const character = await this.charactersService.getByUserId(userId);
    const definition = getProvisionDefinition(type);
    const cost = definition.price(character.level) * dto.quantity;
    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.character.updateMany({
        where: { id: character.id, gold: { gte: BigInt(cost) } },
        data: { gold: { decrement: BigInt(cost) } },
      });
      if (payment.count !== 1) throw new ConflictException('W sakwie brakuje złota na ten prowiant');
      await tx.tavernProvisionStack.upsert({
        where: { characterId_type: { characterId: character.id, type } },
        create: { characterId: character.id, type, quantity: dto.quantity },
        update: { quantity: { increment: dto.quantity } },
      });
      const updated = await tx.character.findUniqueOrThrow({ where: { id: character.id }, select: { gold: true } });
      await tx.transaction.create({
        data: {
          characterId: character.id,
          type: 'TAVERN_PROVISION_PURCHASE',
          amount: -BigInt(cost),
          balanceAfter: updated.gold,
          referenceId: type,
          description: `${definition.name} × ${dto.quantity}`,
        },
      });
    });
    return this.getTavern(userId);
  }

  async acceptOffer(userId: string, offerId: string, dto: AcceptTavernOfferDto) {
    const character = await this.charactersService.getByUserId(userId);
    if (await this.findCurrentQuest(character.id)) throw new ConflictException('Bohater prowadzi już jedno zlecenie');
    const health = toCharacterResponse(character);
    if (health.currentHp <= health.maxHp * 0.5) {
      throw new ConflictException('Zlecenie wymaga więcej niż 50% zdrowia bohatera');
    }
    const offer = await this.prisma.tavernOffer.findFirst({
      where: { id: offerId, board: { characterId: character.id } },
    });
    if (!offer) throw new NotFoundException('To zlecenie nie jest już dostępne');

    const uniqueTypes = new Set(dto.provisions.map((entry) => entry.type));
    const totalProvisions = dto.provisions.reduce((total, entry) => total + entry.quantity, 0);
    if (uniqueTypes.size !== dto.provisions.length) throw new ConflictException('Każdy rodzaj prowiantu może wystąpić w sakwie tylko raz');
    if (totalProvisions > TAVERN_BAG_CAPACITY) throw new ConflictException('Sakwa wyprawowa mieści tylko trzy sztuki prowiantu');
    for (const entry of dto.provisions) {
      if (entry.quantity > getProvisionDefinition(entry.type).maxPerQuest) {
        throw new ConflictException(`Przekroczono limit: ${getProvisionDefinition(entry.type).name}`);
      }
    }

    const run = await this.prisma.$transaction(async (tx) => {
      const stillActive = await tx.tavernQuestRun.findFirst({
        where: { characterId: character.id, status: { in: ['ACTIVE', 'RESOLVED'] } }, select: { id: true },
      });
      if (stillActive) throw new ConflictException('Bohater prowadzi już jedno zlecenie');
      for (const entry of dto.provisions) {
        const reserved = await tx.tavernProvisionStack.updateMany({
          where: { characterId: character.id, type: entry.type, quantity: { gte: entry.quantity } },
          data: { quantity: { decrement: entry.quantity } },
        });
        if (reserved.count !== 1) throw new ConflictException(`Brakuje zapasu: ${getProvisionDefinition(entry.type).name}`);
      }
      const created = await tx.tavernQuestRun.create({
        data: {
          characterId: character.id, templateKey: offer.templateKey, difficulty: offer.difficulty,
          title: offer.title, region: offer.region, summary: offer.summary, stageCount: offer.stageCount,
          goldMin: offer.goldMin, goldMax: offer.goldMax, experienceMin: offer.experienceMin,
          experienceMax: offer.experienceMax, itemChance: offer.itemChance, gemChance: offer.gemChance,
          hpRiskMinPercent: offer.hpRiskMinPercent, hpRiskMaxPercent: offer.hpRiskMaxPercent,
          startingHp: health.currentHp,
          journeyHp: health.currentHp,
          maxHpSnapshot: health.maxHp,
          provisions: {
            create: dto.provisions.map((entry) => ({
              type: entry.type,
              initialQuantity: entry.quantity,
              remaining: entry.quantity,
            })),
          },
        },
        include: RUN_INCLUDE,
      });
      await tx.tavernOffer.delete({ where: { id: offer.id } });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return this.serializeQuest(run);
  }

  async choosePath(userId: string, dto: ChooseTavernPathDto) {
    const character = await this.charactersService.getByUserId(userId);
    const run = await this.prisma.tavernQuestRun.findFirst({
      where: { characterId: character.id, status: 'ACTIVE' }, include: RUN_INCLUDE,
    });
    if (!run) throw new NotFoundException('Nie masz aktywnego zlecenia');
    const stage = getTavernStage(run);
    if (!stage) throw new ConflictException('Zlecenie oczekuje już na rozstrzygnięcie');
    if (stage.type !== 'CHOICE') throw new ConflictException('Ten etap wymaga stoczenia walki');
    const choice = stage.choices.find((entry) => entry.id === dto.choiceId);
    if (!choice) throw new ConflictException('Ta decyzja nie należy do bieżącego etapu');

    const response = toCharacterResponse(character);
    const attributeValue = this.attributeValue(response.stats, choice.attribute);
    const roll = randomInteger(1, 20) + Math.floor(Math.sqrt(Math.max(0, attributeValue)));
    const target = tavernChoiceTarget(run.difficulty, run.stageIndex, choice.riskModifier);
    const succeeded = roll >= target;
    const scoreDelta = succeeded ? 2 : -1;
    const scoreAfter = run.score + scoreDelta;
    const woundPercent = rollStageWoundPercent(run.difficulty, succeeded);
    const wound = Math.min(Math.max(0, run.journeyHp - 1), Math.max(1, Math.ceil(run.maxHpSnapshot * woundPercent / 100)));
    const journeyHpAfter = Math.max(1, run.journeyHp - wound);
    const hpLostAfter = Math.max(0, run.startingHp - journeyHpAfter);
    const isFinalStage = run.stageIndex + 1 >= run.stageCount;
    const resolution = isFinalStage
      ? await this.rollResolution(character, run, scoreAfter, choice.reputationDelta, journeyHpAfter, hpLostAfter)
      : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.tavernQuestDecision.create({
        data: {
          runId: run.id, stageIndex: run.stageIndex, choiceId: choice.id, choiceTitle: choice.title,
          alignment: choice.alignment, attribute: choice.attribute, roll, target, succeeded, scoreDelta,
          reputationDelta: choice.reputationDelta, outcomeText: succeeded ? choice.successText : choice.failureText,
        },
      });
      const updated = await tx.tavernQuestRun.updateMany({
        where: { id: run.id, status: 'ACTIVE', stageIndex: run.stageIndex },
        data: resolution ?? {
          stageIndex: { increment: 1 },
          score: { increment: scoreDelta },
          journeyHp: journeyHpAfter,
          hpLost: hpLostAfter,
        },
      });
      if (updated.count !== 1) throw new ConflictException('Ten etap został już rozstrzygnięty');
    });
    return this.getCurrentQuest(userId);
  }

  async fightEncounter(userId: string, rng: () => number = Math.random) {
    const character = await this.charactersService.getByUserId(userId);
    const run = await this.prisma.tavernQuestRun.findFirst({
      where: { characterId: character.id, status: 'ACTIVE' }, include: RUN_INCLUDE,
    });
    if (!run) throw new NotFoundException('Nie masz aktywnego zlecenia');
    const stage = getTavernStage(run);
    if (!stage || stage.type !== 'COMBAT') throw new ConflictException('Na tym etapie nie ma przeciwnika');
    if (!character.combatant.stats) throw new NotFoundException('Brak statystyk bohatera');
    if (run.encounters.some((entry) => entry.stageIndex === run.stageIndex)) {
      throw new ConflictException('To starcie zostało już rozstrzygnięte');
    }

    const playerSnapshot = buildCombatSnapshot(
      character.combatantId,
      character.combatant.stats,
      character.combatant.equippedItems,
      character.combatant.weaponExpertise,
    );
    const enemy = getTavernEnemy(run);
    const enemyCombat = buildTavernEnemySnapshot(
      enemy,
      run.difficulty,
      character.level,
      run.score,
      {
        successfulChoiceIds: run.decisions
          .filter((decision) => decision.succeeded)
          .map((decision) => decision.choiceId),
        solvedPuzzleKeys: run.puzzles
          .filter((puzzle) => puzzle.solved)
          .map((puzzle) => puzzle.puzzleKey),
      },
    );
    const simulation = simulateBattle(
      playerSnapshot,
      character.level,
      enemyCombat.snapshot,
      enemyCombat.level,
      rng,
      { attacker: run.journeyHp, defender: enemyCombat.maxHp },
    );
    const attackerWon = simulation.result === 'ATTACKER_WIN';
    const lastRound = simulation.rounds[simulation.rounds.length - 1];
    const playerHpAfter = Math.max(1, lastRound
      ? lastRound.actorId === character.combatantId ? lastRound.actorHpAfter : lastRound.targetHpAfter
      : run.journeyHp);
    const enemyHpAfter = Math.max(0, lastRound
      ? lastRound.actorId === enemyCombat.snapshot.combatantId ? lastRound.actorHpAfter : lastRound.targetHpAfter
      : enemyCombat.maxHp);
    const scoreDelta = attackerWon ? 3 : -2;
    const scoreAfter = run.score + scoreDelta;
    const hpLostAfter = Math.max(0, run.startingHp - playerHpAfter);
    const isFinalStage = run.stageIndex + 1 >= run.stageCount;
    const resolution = shouldResolveTavernQuestAfterCombat(attackerWon, isFinalStage)
      ? await this.rollResolution(character, run, scoreAfter, 0, playerHpAfter, hpLostAfter, attackerWon)
      : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.tavernQuestEncounter.create({
        data: {
          runId: run.id,
          stageIndex: run.stageIndex,
          enemyKey: enemy.key,
          enemyName: enemy.name,
          enemyTitle: enemy.title,
          enemyKind: enemy.familyLabel,
          enemyLevel: enemyCombat.level,
          enemyIllustrationUrl: TAVERN_ENEMY_ART[enemy.key] ?? '/assets/tavern/tavern-bestiary-atlas.png',
          enemyMaxHp: enemyCombat.maxHp,
          playerHpBefore: run.journeyHp,
          playerHpAfter,
          enemyHpAfter,
          result: simulation.result,
          scoreDelta,
          rounds: simulation.rounds as unknown as Prisma.InputJsonValue,
        },
      });
      const updated = await tx.tavernQuestRun.updateMany({
        where: { id: run.id, status: 'ACTIVE', stageIndex: run.stageIndex },
        data: resolution ?? {
          stageIndex: { increment: 1 },
          score: { increment: scoreDelta },
          journeyHp: playerHpAfter,
          hpLost: hpLostAfter,
        },
      });
      if (updated.count !== 1) throw new ConflictException('To starcie zostało już rozstrzygnięte');
    });
    return this.getCurrentQuest(userId);
  }

  async solvePuzzle(userId: string, dto: SolveTavernPuzzleDto) {
    const character = await this.charactersService.getByUserId(userId);
    const run = await this.prisma.tavernQuestRun.findFirst({
      where: { characterId: character.id, status: 'ACTIVE' }, include: RUN_INCLUDE,
    });
    if (!run) throw new NotFoundException('Nie masz aktywnego zlecenia');
    const stage = getTavernStage(run);
    if (!stage || stage.type !== 'PUZZLE') throw new ConflictException('Na tym etapie nie ma zagadki');
    const existing = run.puzzles.find((entry) => entry.stageIndex === run.stageIndex);
    if (existing?.solved !== null && existing?.solved !== undefined) {
      throw new ConflictException('Ta zagadka została już rozstrzygnięta');
    }

    const definition = getTavernPuzzle(run.templateKey);
    const allowed = new Set(definition.options.map((entry) => entry.id));
    if (new Set(dto.answer).size !== dto.answer.length || dto.answer.some((entry) => !allowed.has(entry))) {
      throw new ConflictException('Odpowiedź zawiera nieprawidłowe symbole');
    }
    const attemptsAfter = (existing?.attempts ?? 0) + 1;
    const maxAttempts = existing?.maxAttempts ?? 2;
    const solved = isPuzzleAnswerCorrect(definition, dto.answer);
    const terminal = solved || attemptsAfter >= maxAttempts;
    const scoreDelta = solved ? (attemptsAfter === 1 ? 2 : 1) : terminal ? -2 : 0;
    const outcomeText = solved
      ? definition.successText
      : terminal
        ? definition.failureText
        : `Wybrana odpowiedź nie uruchamia mechanizmu. ${definition.hint}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.tavernQuestPuzzle.upsert({
        where: { runId_stageIndex: { runId: run.id, stageIndex: run.stageIndex } },
        create: {
          runId: run.id,
          stageIndex: run.stageIndex,
          puzzleKey: definition.key,
          attempts: attemptsAfter,
          maxAttempts,
          solved: terminal ? solved : null,
          selectedAnswer: dto.answer,
          scoreDelta,
          outcomeText,
          resolvedAt: terminal ? new Date() : null,
        },
        update: {
          attempts: attemptsAfter,
          solved: terminal ? solved : null,
          selectedAnswer: dto.answer,
          scoreDelta,
          outcomeText,
          resolvedAt: terminal ? new Date() : null,
        },
      });
      if (terminal) {
        const updated = await tx.tavernQuestRun.updateMany({
          where: { id: run.id, status: 'ACTIVE', stageIndex: run.stageIndex },
          data: { stageIndex: { increment: 1 }, score: { increment: scoreDelta } },
        });
        if (updated.count !== 1) throw new ConflictException('Ta zagadka została już rozstrzygnięta');
      }
    });
    return this.getCurrentQuest(userId);
  }

  async getCurrentQuest(userId: string) {
    const character = await this.charactersService.getByUserId(userId);
    await this.resolveLegacyDefeat(character);
    const run = await this.findCurrentQuest(character.id);
    return run ? this.serializeQuest(run) : null;
  }

  async useProvision(userId: string, dto: UseProvisionDto) {
    const character = await this.charactersService.getByUserId(userId);
    const run = await this.prisma.tavernQuestRun.findFirst({
      where: { characterId: character.id, status: 'ACTIVE' },
      include: RUN_INCLUDE,
    });
    if (!run) throw new NotFoundException('Nie masz aktywnego zlecenia');
    if (run.stageIndex >= run.stageCount) {
      throw new ConflictException('Ta wyprawa została już rozstrzygnięta');
    }
    const provision = run.provisions.find((entry) => entry.type === dto.type);
    if (!provision || provision.remaining <= 0) throw new ConflictException('Tego prowiantu nie ma już w sakwie');
    const definition = getProvisionDefinition(dto.type);
    let journeyHp = run.journeyHp;
    let score = run.score;
    if (dto.type === 'VAEL_ANTIDOTE') {
      if (!run.decisions.some((decision) => !decision.succeeded) || run.score >= run.decisions.filter((decision) => decision.succeeded).length * 2) {
        throw new ConflictException('Bohater nie cierpi obecnie na osłabienie po nieudanej próbie');
      }
      score += 1;
    } else {
      if (run.journeyHp >= run.maxHpSnapshot) throw new ConflictException('Bohater ma już pełne zdrowie');
      journeyHp = Math.min(run.maxHpSnapshot, run.journeyHp + Math.ceil(run.maxHpSnapshot * definition.healPercent / 100));
    }
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.tavernQuestProvision.updateMany({
        where: { runId: run.id, type: dto.type, remaining: { gt: 0 } },
        data: { remaining: { decrement: 1 }, used: { increment: 1 } },
      });
      if (consumed.count !== 1) throw new ConflictException('Ten zapas został już wykorzystany');
      await tx.tavernQuestRun.update({
        where: { id: run.id },
        data: { journeyHp, hpLost: Math.max(0, run.startingHp - journeyHp), score },
      });
    });
    return this.getCurrentQuest(userId);
  }

  async claimQuest(userId: string) {
    const character = await this.charactersService.getByUserId(userId);
    const run = await this.prisma.tavernQuestRun.findFirst({
      where: { characterId: character.id, status: 'RESOLVED' }, include: RUN_INCLUDE,
    });
    if (!run || !run.result) throw new NotFoundException('Brak rozstrzygniętego zlecenia');
    if (!character.combatant.stats) throw new NotFoundException('Brak statystyk bohatera');

    const characterState = toCharacterResponse(character);
    const progress = applyExperienceGain(character.level, character.experience, run.experienceReward);
    const leveledUp = progress.level > character.level;
    const enduranceAfterEquipment = character.combatant.stats.endurance
      + character.combatant.equippedItems.reduce((total, equipped) => total + resolveOwnedItemStats(equipped.ownedItem).enduranceBonus, 0);
    const maxHpBonus = character.combatant.equippedItems.reduce((total, equipped) => total + resolveOwnedItemStats(equipped.ownedItem).maxHpBonus, 0);
    const maxHpAfter = calculateMaxHp(enduranceAfterEquipment, progress.level, maxHpBonus);
    const hpAfter = leveledUp ? maxHpAfter : Math.max(1, Math.min(maxHpAfter, run.journeyHp));
    const reputationAfter = Math.max(-REPUTATION_VISUAL_LIMIT, Math.min(REPUTATION_VISUAL_LIMIT, character.reputation + run.reputationChange));
    const balanceAfter = character.gold + run.goldReward;

    let storyRelicAwarded = false;
    await this.prisma.$transaction(async (tx) => {
      const chronicle = await tx.tavernChronicleEntry.findUnique({
        where: { characterId_templateKey: { characterId: character.id, templateKey: run.templateKey } },
      });
      storyRelicAwarded = run.result === 'SUCCESS' && Boolean(run.storyRelicItem) && !chronicle?.relicClaimed;
      const claimed = await tx.tavernQuestRun.updateMany({
        where: { id: run.id, status: 'RESOLVED' }, data: { status: 'CLAIMED', claimedAt: new Date(), storyRelicAwarded },
      });
      if (claimed.count !== 1) throw new ConflictException('Nagroda została już odebrana');
      await tx.character.update({
        where: { id: character.id },
        data: { gold: { increment: run.goldReward }, level: progress.level, experience: progress.experience, currentHp: hpAfter, healthUpdatedAt: new Date(), reputation: reputationAfter },
      });
      if (progress.unspentPointsGained > 0) {
        await tx.combatantStats.update({
          where: { combatantId: character.combatantId }, data: { unspentPoints: { increment: progress.unspentPointsGained } },
        });
      }
      if (run.result === 'SUCCESS' && run.rewardItem) {
        await tx.ownedItem.create({ data: { combatantId: character.combatantId, itemId: run.rewardItem.id, ...initialSocketState(run.rewardItem) } });
      }
      if (run.result === 'SUCCESS' && run.rewardGemDefinition) {
        await tx.gemStack.upsert({
          where: { combatantId_gemDefinitionId: { combatantId: character.combatantId, gemDefinitionId: run.rewardGemDefinition.id } },
          create: { combatantId: character.combatantId, gemDefinitionId: run.rewardGemDefinition.id, quantity: 1 },
          update: { quantity: { increment: 1 } },
        });
      }
      if (storyRelicAwarded && run.storyRelicItem) {
        await tx.ownedItem.create({
          data: { combatantId: character.combatantId, itemId: run.storyRelicItem.id, ...initialSocketState(run.storyRelicItem) },
        });
      }
      const currentEndingRank = endingRank(chronicle?.bestEndingKey);
      const runEndingRank = endingRank(run.endingKey);
      const bestChanged = !chronicle || runEndingRank > currentEndingRank
        || (runEndingRank === currentEndingRank && run.score > chronicle.bestScore);
      let chronicleEntryId: string;
      if (!chronicle) {
        const createdChronicle = await tx.tavernChronicleEntry.create({
          data: {
            characterId: character.id,
            templateKey: run.templateKey,
            title: run.title,
            region: run.region,
            completions: 1,
            successes: run.result === 'SUCCESS' ? 1 : 0,
            failures: run.result === 'FAILURE' ? 1 : 0,
            bestScore: run.score,
            bestEndingKey: run.endingKey,
            bestEndingTitle: run.endingTitle,
            relicClaimed: storyRelicAwarded,
            relicItemId: storyRelicAwarded ? run.storyRelicItemId : null,
          },
        });
        chronicleEntryId = createdChronicle.id;
      } else {
        await tx.tavernChronicleEntry.update({
          where: { id: chronicle.id },
          data: {
            completions: { increment: 1 },
            successes: run.result === 'SUCCESS' ? { increment: 1 } : undefined,
            failures: run.result === 'FAILURE' ? { increment: 1 } : undefined,
            bestScore: bestChanged ? run.score : undefined,
            bestEndingKey: bestChanged ? run.endingKey : undefined,
            bestEndingTitle: bestChanged ? run.endingTitle : undefined,
            relicClaimed: chronicle.relicClaimed || storyRelicAwarded,
            relicItemId: storyRelicAwarded ? run.storyRelicItemId : undefined,
            lastCompletedAt: new Date(),
          },
        });
        chronicleEntryId = chronicle.id;
      }
      if (run.endingKey && run.endingTitle) {
        const knownEnding = await tx.tavernChronicleEnding.findUnique({
          where: { chronicleEntryId_endingKey: { chronicleEntryId, endingKey: run.endingKey } },
        });
        if (knownEnding) {
          await tx.tavernChronicleEnding.update({
            where: { id: knownEnding.id },
            data: { timesReached: { increment: 1 }, bestScore: Math.max(knownEnding.bestScore, run.score), lastReachedAt: new Date() },
          });
        } else {
          await tx.tavernChronicleEnding.create({
            data: { chronicleEntryId, endingKey: run.endingKey, endingTitle: run.endingTitle, bestScore: run.score },
          });
        }
      }
      for (const provision of run.provisions.filter((entry) => entry.remaining > 0)) {
        await tx.tavernProvisionStack.upsert({
          where: { characterId_type: { characterId: character.id, type: provision.type } },
          create: { characterId: character.id, type: provision.type, quantity: provision.remaining },
          update: { quantity: { increment: provision.remaining } },
        });
      }
      if (run.goldReward > 0) {
        await tx.transaction.create({
          data: { characterId: character.id, type: 'QUEST_REWARD', amount: run.goldReward, balanceAfter, referenceId: run.id, description: `Nagroda za zlecenie: ${run.title}` },
        });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return {
      ...this.serializeQuest({ ...run, status: 'CLAIMED', claimedAt: new Date(), storyRelicAwarded }),
      claimed: true,
      level: progress.level,
      levelBefore: character.level,
      balanceAfter: balanceAfter.toString(),
      health: { current: hpAfter, max: maxHpAfter },
      reputationAfter,
      reputationRank: getReputationRankDetails(reputationAfter),
    };
  }

  async abandonQuest(userId: string) {
    const character = await this.charactersService.getByUserId(userId);
    const run = await this.prisma.tavernQuestRun.findFirst({
      where: { characterId: character.id, status: 'ACTIVE' },
      include: RUN_INCLUDE,
      orderBy: { startedAt: 'desc' },
    });
    if (!run) throw new NotFoundException('Nie masz aktywnego zlecenia, z którego można się wycofać');

    const reputationChange = run.decisions.reduce(
      (total, decision) => total + decision.reputationDelta,
      0,
    );
    const resolvedAt = new Date();
    const updated = await this.prisma.tavernQuestRun.updateMany({
      where: { id: run.id, status: 'ACTIVE' },
      data: {
        stageIndex: run.stageCount,
        status: TavernQuestStatus.RESOLVED,
        result: 'FAILURE',
        goldReward: 0n,
        experienceReward: 0n,
        reputationChange,
        rewardItemId: null,
        rewardGemDefinitionId: null,
        storyRelicItemId: null,
        storyRelicAwarded: false,
        endingKey: `${run.templateKey}:abandoned`,
        endingTitle: 'Odwrót ze szlaku',
        endingText: 'Bohater zawraca, zanim szlak odbierze mu życie. Zlecenie pozostaje niewykonane, lecz rozsądny odwrót pozwala zachować siły na kolejną wyprawę.',
        resolvedAt,
      },
    });
    if (updated.count !== 1) throw new ConflictException('Los tego zlecenia został już rozstrzygnięty');

    return this.serializeQuest({
      ...run,
      stageIndex: run.stageCount,
      status: TavernQuestStatus.RESOLVED,
      result: 'FAILURE',
      goldReward: 0n,
      experienceReward: 0n,
      reputationChange,
      rewardItemId: null,
      rewardItem: null,
      rewardGemDefinitionId: null,
      rewardGemDefinition: null,
      storyRelicItemId: null,
      storyRelicItem: null,
      storyRelicAwarded: false,
      endingKey: `${run.templateKey}:abandoned`,
      endingTitle: 'Odwrót ze szlaku',
      endingText: 'Bohater zawraca, zanim szlak odbierze mu życie. Zlecenie pozostaje niewykonane, lecz rozsądny odwrót pozwala zachować siły na kolejną wyprawę.',
      resolvedAt,
    });
  }

  private async rollResolution(
    character: Awaited<ReturnType<CharactersService['getByUserId']>>,
    run: QuestRun,
    scoreAfter: number,
    currentReputationDelta: number,
    journeyHpAfter: number,
    hpLostAfter: number,
    forcedSuccess?: boolean,
  ) {
    const bonuses = calculatePropertyBonuses(character.property?.level, character.reputation);
    const chance = Math.max(0.25, Math.min(0.95, BASE_SUCCESS_CHANCE[run.difficulty] + scoreAfter * 0.035 + bonuses.missionSuccessBonus));
    const success = forcedSuccess ?? Math.random() < chance;
    const reputationChange = run.decisions.reduce((total, decision) => total + decision.reputationDelta, 0) + currentReputationDelta;
    const goldReward = success ? BigInt(Math.round(randomInteger(run.goldMin, run.goldMax) * bonuses.missionGoldMultiplier)) : 0n;
    const experienceReward = success ? BigInt(randomInteger(Number(run.experienceMin), Number(run.experienceMax))) : 0n;
    const rewardItem = success && Math.random() < run.itemChance / 100 + bonuses.itemRewardChanceBonus
      ? await this.randomRewardItem(character.level)
      : null;
    const rewardGem = success && Math.random() < run.gemChance / 100
      ? await this.randomRewardGem(character.level)
      : null;
    const result = success ? 'SUCCESS' as const : 'FAILURE' as const;
    const ending = resolveTavernEnding({
      templateKey: run.templateKey,
      title: run.title,
      region: run.region,
      result,
      score: scoreAfter,
      firstChoiceId: run.decisions[0]?.choiceId,
      choiceIds: run.decisions.map((decision) => decision.choiceId),
    });
    const relicDefinition = success ? TAVERN_STORY_RELICS[run.templateKey] : null;
    const storyRelic = relicDefinition
      ? await this.prisma.item.findUnique({ where: { name: relicDefinition.name } })
      : null;
    return {
      stageIndex: run.stageCount,
      score: scoreAfter,
      status: TavernQuestStatus.RESOLVED,
      result,
      goldReward,
      experienceReward,
      reputationChange,
      journeyHp: journeyHpAfter,
      hpLost: hpLostAfter,
      rewardItemId: rewardItem?.id ?? null,
      rewardGemDefinitionId: rewardGem?.id ?? null,
      storyRelicItemId: storyRelic?.id ?? null,
      endingKey: ending.key,
      endingTitle: ending.title,
      endingText: ending.text,
      resolvedAt: new Date(),
    };
  }

  private async randomRewardItem(level: number) {
    const where = { minLevel: { lte: level }, category: { not: 'CONSUMABLE' as const }, price: { gt: 0 } };
    const count = await this.prisma.item.count({ where });
    return count ? this.prisma.item.findFirst({ where, orderBy: { id: 'asc' }, skip: randomInteger(0, count - 1) }) : null;
  }

  private async randomRewardGem(level: number) {
    const gems = await this.prisma.gemDefinition.findMany({ where: { minLevel: { lte: level } }, orderBy: [{ tier: 'asc' }, { family: 'asc' }] });
    return gems.length ? gems[Math.floor(Math.pow(Math.random(), 2) * gems.length)] : null;
  }

  private attributeValue(stats: ReturnType<typeof toCharacterResponse>['stats'], attribute: TavernAttribute): number {
    if (!stats) return 0;
    return attribute === 'STR' ? stats.strength : attribute === 'DEX' ? stats.agility : attribute === 'CON' ? stats.endurance : stats.intelligence;
  }

  private async resolveLegacyDefeat(character: Awaited<ReturnType<CharactersService['getByUserId']>>) {
    const run = await this.prisma.tavernQuestRun.findFirst({
      where: {
        characterId: character.id,
        status: 'ACTIVE',
        encounters: { some: { result: { not: 'ATTACKER_WIN' } } },
      },
      include: RUN_INCLUDE,
      orderBy: { startedAt: 'desc' },
    });
    if (!run) return;

    const resolution = await this.rollResolution(
      character,
      run,
      run.score,
      0,
      run.journeyHp,
      run.hpLost,
      false,
    );
    await this.prisma.tavernQuestRun.updateMany({
      where: { id: run.id, status: 'ACTIVE' },
      data: resolution,
    });
  }

  private findCurrentQuest(characterId: string) {
    return this.prisma.tavernQuestRun.findFirst({
      where: { characterId, status: { in: ['ACTIVE', 'RESOLVED'] } }, include: RUN_INCLUDE, orderBy: { startedAt: 'desc' },
    });
  }

  private serializeQuest(run: QuestRun) {
    const stage = run.status === 'ACTIVE' ? getTavernStage(run) : null;
    return {
      ...run,
      goldMin: run.goldMin,
      goldMax: run.goldMax,
      experienceMin: run.experienceMin.toString(),
      experienceMax: run.experienceMax.toString(),
      goldReward: run.goldReward.toString(),
      experienceReward: run.experienceReward.toString(),
      health: { current: run.journeyHp, max: run.maxHpSnapshot },
      provisions: run.provisions.map((entry) => ({
        type: entry.type,
        initialQuantity: entry.initialQuantity,
        remaining: entry.remaining,
        used: entry.used,
        name: getProvisionDefinition(entry.type).name,
        description: getProvisionDefinition(entry.type).description,
        effectLabel: getProvisionDefinition(entry.type).effectLabel,
        maxPerQuest: getProvisionDefinition(entry.type).maxPerQuest,
        healPercent: getProvisionDefinition(entry.type).healPercent,
      })),
      encounters: run.encounters.map((entry) => ({
        ...entry,
        rounds: entry.rounds,
        won: entry.result === 'ATTACKER_WIN',
      })),
      puzzles: run.puzzles.map((entry) => ({
        id: entry.id,
        stageIndex: entry.stageIndex,
        puzzleKey: entry.puzzleKey,
        attempts: entry.attempts,
        maxAttempts: entry.maxAttempts,
        solved: entry.solved,
        scoreDelta: entry.scoreDelta,
        outcomeText: entry.outcomeText,
        createdAt: entry.createdAt,
        resolvedAt: entry.resolvedAt,
      })),
      currentStage: stage,
    };
  }

  private async ensureBoard(characterId: string, level: number) {
    const current = await this.prisma.tavernBoard.findUnique({ where: { characterId }, include: BOARD_INCLUDE });
    if (current && current.expiresAt.getTime() > Date.now()) return current;
    const today = utcDateOnly();
    const sameDay = current?.refreshDate.getTime() === today.getTime();
    const offers = buildTavernOffers(level, current?.offers.map((offer) => offer.templateKey) ?? []);
    const boardData = { expiresAt: new Date(Date.now() + BOARD_LIFETIME_MS), refreshDate: today, refreshCount: sameDay ? current.refreshCount : 0, generatedAt: new Date() };
    if (!current) return this.prisma.tavernBoard.create({ data: { characterId, ...boardData, offers: { create: offers } }, include: BOARD_INCLUDE });
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.tavernOffer.deleteMany({ where: { boardId: current.id } });
      return tx.tavernBoard.update({ where: { id: current.id }, data: { ...boardData, offers: { create: offers } }, include: BOARD_INCLUDE });
    });
  }

  private toResponse(
    gold: bigint,
    level: number,
    board: Awaited<ReturnType<TavernService['ensureBoard']>>,
    activeQuest: QuestRun | null,
    provisionStacks: Array<{ type: TavernProvisionType; quantity: number }>,
    chronicle: Array<Prisma.TavernChronicleEntryGetPayload<{
      include: { relicItem: true; endings: { orderBy: { firstDiscoveredAt: 'asc' } } };
    }>>,
  ) {
    const refreshesUsed = board.refreshDate.getTime() === utcDateOnly().getTime() ? board.refreshCount : 0;
    return {
      inn: { name: 'Karczma pod Złamanym Gryfem', innkeeper: 'Borwin', server: 'Mira', illustrationUrl: '/assets/tavern/tavern-broken-griffin.png' },
      gold: gold.toString(),
      activeQuest: activeQuest ? this.serializeQuest(activeQuest) : null,
      provisions: {
        bagCapacity: TAVERN_BAG_CAPACITY,
        catalog: TAVERN_PROVISIONS.map((entry) => ({
          type: entry.type,
          name: entry.name,
          description: entry.description,
          effectLabel: entry.effectLabel,
          maxPerQuest: entry.maxPerQuest,
          price: entry.price(level).toString(),
          owned: provisionStacks.find((stack) => stack.type === entry.type)?.quantity ?? 0,
        })),
      },
      chronicle: {
        discovered: chronicle.length,
        total: TAVERN_QUEST_TEMPLATES.length,
        entries: TAVERN_QUEST_TEMPLATES.map((template) => {
          const entry = chronicle.find((record) => record.templateKey === template.key);
          return entry ? { ...entry, discovered: true } : {
            templateKey: template.key,
            title: template.title,
            region: template.region,
            discovered: false,
          };
        }),
      },
      board: {
        id: board.id, generatedAt: board.generatedAt, expiresAt: board.expiresAt, refreshesUsed,
        refreshesRemaining: Math.max(0, DAILY_REFRESH_LIMIT - refreshesUsed),
        nextRefreshCost: refreshesUsed < DAILY_REFRESH_LIMIT ? tavernRefreshCost(level, refreshesUsed).toString() : null,
        offers: [...board.offers]
          .sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty])
          .map((offer) => {
            // Treść szablonu jest kanoniczna również dla już wygenerowanych tablic.
            const template = TAVERN_QUEST_TEMPLATES.find((entry) => entry.key === offer.templateKey);
            return {
              ...offer,
              title: template?.title ?? offer.title,
              region: template?.region ?? offer.region,
              summary: template?.summary ?? offer.summary,
              encounterSummary: template?.encounterSummary ?? offer.encounterSummary,
              experienceMin: offer.experienceMin.toString(),
              experienceMax: offer.experienceMax.toString(),
            };
          }),
      },
    };
  }
}
