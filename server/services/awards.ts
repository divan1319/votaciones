import { eq, and, asc, desc, inArray } from 'drizzle-orm';
import { db } from '../db';
import {
  editions,
  rounds,
  participants,
  criteria,
  scores,
  judgeRoundSubmissions,
  roundResults,
  awards,
  awardCriteria,
  awardMetrics,
  awardWinners,
  user,
} from '../db/schema';
import { normalizeScore } from './scoring';

export interface AwardRankingItem {
  participantId: string;
  name: string;
  code: string;
  score: number;
  rank: number;
  tieFlag: boolean;
  isWinner: boolean;
  decidedBy?: string | null;
}

export interface CalculatedAwardResult {
  award: typeof awards.$inferSelect;
  rankings: AwardRankingItem[];
  winners: Array<{ participantId: string; name: string; code: string; decidedBy?: string | null }>;
  hasTieAtCut: boolean;
}

export async function calculateSpecialAwards(editionId: string): Promise<CalculatedAwardResult[]> {
  const [edition] = await db.select().from(editions).where(eq(editions.id, editionId));
  if (!edition) throw new Error('Edición no encontrada');

  const scaleMin = Number(edition.scaleMin);
  const scaleMax = Number(edition.scaleMax);

  const editionAwards = await db.select().from(awards).where(eq(awards.editionId, editionId));
  const editionParticipants = await db
    .select()
    .from(participants)
    .where(eq(participants.editionId, editionId));

  const existingWinners = await db
    .select()
    .from(awardWinners)
    .where(
      inArray(
        awardWinners.awardId,
        editionAwards.map((a) => a.id).concat(['__dummy__'])
      )
    );

  const results: CalculatedAwardResult[] = [];

  for (const aw of editionAwards) {
    const winnersForAward = existingWinners.filter((w) => w.awardId === aw.id);

    if (aw.type === 'manual') {
      const winnerItems = winnersForAward.map((w) => {
        const p = editionParticipants.find((ep) => ep.id === w.participantId);
        return {
          participantId: w.participantId,
          name: p ? p.name : '',
          code: p ? p.code : '',
          decidedBy: w.decidedBy,
        };
      });

      results.push({
        award: aw,
        rankings: winnerItems.map((w, idx) => ({
          participantId: w.participantId,
          name: w.name,
          code: w.code,
          score: 100,
          rank: idx + 1,
          tieFlag: false,
          isWinner: true,
          decidedBy: w.decidedBy,
        })),
        winners: winnerItems,
        hasTieAtCut: false,
      });
      continue;
    }

    if (aw.type === 'metric') {
      const metrics = await db.select().from(awardMetrics).where(eq(awardMetrics.awardId, aw.id));
      const metricMap = new Map(metrics.map((m) => [m.participantId, Number(m.value)]));

      const items: Array<{ participantId: string; name: string; code: string; score: number }> = [];

      for (const p of editionParticipants) {
        if (metricMap.has(p.id)) {
          items.push({
            participantId: p.id,
            name: p.name,
            code: p.code,
            score: metricMap.get(p.id) || 0,
          });
        }
      }

      items.sort((a, b) => b.score - a.score);

      const scoreCounts = new Map<number, number>();
      for (const item of items) {
        scoreCounts.set(item.score, (scoreCounts.get(item.score) || 0) + 1);
      }

      const winnersCount = aw.winnersCount || 1;
      const rankings: AwardRankingItem[] = [];
      let currentRank = 1;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (i > 0 && item.score < items[i - 1].score) {
          currentRank = i + 1;
        }

        const isWinner = winnersForAward.some((w) => w.participantId === item.participantId) ||
          (winnersForAward.length === 0 && i < winnersCount);

        rankings.push({
          participantId: item.participantId,
          name: item.name,
          code: item.code,
          score: item.score,
          rank: currentRank,
          tieFlag: (scoreCounts.get(item.score) || 0) > 1,
          isWinner,
        });
      }

      const hasTieAtCut =
        items.length > winnersCount &&
        items[winnersCount - 1].score === items[winnersCount].score &&
        winnersForAward.length === 0;

      results.push({
        award: aw,
        rankings,
        winners: rankings
          .filter((r) => r.isWinner)
          .map((r) => ({
            participantId: r.participantId,
            name: r.name,
            code: r.code,
          })),
        hasTieAtCut,
      });
      continue;
    }

    if (aw.type === 'criterion') {
      // 1. Obtener criterios vinculados al premio
      const linkedCriteria = await db
        .select({
          criterionId: awardCriteria.criterionId,
        })
        .from(awardCriteria)
        .where(eq(awardCriteria.awardId, aw.id));

      const linkedCritIds = new Set(linkedCriteria.map((c) => c.criterionId));

      if (linkedCritIds.size === 0) {
        results.push({
          award: aw,
          rankings: [],
          winners: [],
          hasTieAtCut: false,
        });
        continue;
      }

      // 2. Obtener todas las rondas de la edición
      const editionRounds = await db
        .select()
        .from(rounds)
        .where(eq(rounds.editionId, editionId))
        .orderBy(asc(rounds.position));

      // 3. Para cada participante, calcular el promedio de los criterios vinculados
      const participantRoundScores = new Map<string, number[]>();

      for (const r of editionRounds) {
        const roundSubmissions = await db
          .select()
          .from(judgeRoundSubmissions)
          .where(eq(judgeRoundSubmissions.roundId, r.id));

        if (roundSubmissions.length === 0) continue;

        const roundScores = await db
          .select()
          .from(scores)
          .where(eq(scores.roundId, r.id));

        // Filtrar calificaciones que corresponden a los criterios vinculados
        const relevantScores = roundScores.filter((s) => linkedCritIds.has(s.criterionId));
        if (relevantScores.length === 0) continue;

        for (const p of editionParticipants) {
          const judgeAverages: number[] = [];

          for (const sub of roundSubmissions) {
            const judgeScoresForParticipant = relevantScores.filter(
              (s) => s.judgeId === sub.judgeId && s.participantId === p.id
            );

            if (judgeScoresForParticipant.length > 0) {
              const normalizedSum = judgeScoresForParticipant.reduce((acc, s) => {
                return acc + normalizeScore(Number(s.value), scaleMin, scaleMax);
              }, 0);
              const judgeAvg = normalizedSum / judgeScoresForParticipant.length;
              judgeAverages.push(judgeAvg);
            }
          }

          if (judgeAverages.length > 0) {
            // El puntaje del premio en esa ronda es SIEMPRE el promedio entre jueces
            const roundAwardScore = judgeAverages.reduce((a, b) => a + b, 0) / judgeAverages.length;
            if (!participantRoundScores.has(p.id)) {
              participantRoundScores.set(p.id, []);
            }
            participantRoundScores.get(p.id)!.push(roundAwardScore);
          }
        }
      }

      // 4. Calcular el puntaje final del premio como promedio de las rondas jugadas
      const items: Array<{ participantId: string; name: string; code: string; score: number }> = [];

      for (const p of editionParticipants) {
        const roundScoresArr = participantRoundScores.get(p.id);
        if (roundScoresArr && roundScoresArr.length > 0) {
          const finalScore = roundScoresArr.reduce((a, b) => a + b, 0) / roundScoresArr.length;
          items.push({
            participantId: p.id,
            name: p.name,
            code: p.code,
            score: Number(finalScore.toFixed(4)),
          });
        }
      }

      items.sort((a, b) => b.score - a.score);

      const scoreCounts = new Map<number, number>();
      for (const item of items) {
        scoreCounts.set(item.score, (scoreCounts.get(item.score) || 0) + 1);
      }

      const winnersCount = aw.winnersCount || 1;
      const rankings: AwardRankingItem[] = [];
      let currentRank = 1;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (i > 0 && item.score < items[i - 1].score) {
          currentRank = i + 1;
        }

        const isWinner = winnersForAward.some((w) => w.participantId === item.participantId) ||
          (winnersForAward.length === 0 && i < winnersCount);

        rankings.push({
          participantId: item.participantId,
          name: item.name,
          code: item.code,
          score: item.score,
          rank: currentRank,
          tieFlag: (scoreCounts.get(item.score) || 0) > 1,
          isWinner,
        });
      }

      const hasTieAtCut =
        items.length > winnersCount &&
        items[winnersCount - 1].score === items[winnersCount].score &&
        winnersForAward.length === 0;

      results.push({
        award: aw,
        rankings,
        winners: rankings
          .filter((r) => r.isWinner)
          .map((r) => ({
            participantId: r.participantId,
            name: r.name,
            code: r.code,
          })),
        hasTieAtCut,
      });
    }
  }

  return results;
}

export async function setAwardWinner(awardId: string, participantId: string, decidedBy?: string) {
  // Verificar si ya existe
  await db.transaction(async (tx) => {
    await tx.delete(awardWinners).where(and(eq(awardWinners.awardId, awardId), eq(awardWinners.participantId, participantId)));
    await tx.insert(awardWinners).values({
      awardId,
      participantId,
      decidedBy: decidedBy || null,
    });
  });
}
