import { eq, and, asc, desc, inArray, isNull } from 'drizzle-orm';
import { db } from '../db';
import {
  editions,
  rounds,
  participants,
  roundParticipants,
  editionJudges,
  roundJudges,
  criteria,
  scores,
  judgeRoundSubmissions,
  roundResults,
  user,
} from '../db/schema';

export interface CalculatedParticipantResult {
  participantId: string;
  name: string;
  code: string;
  roundScore: number;
  cumulativeScore: number;
  rank: number;
  tieFlag: boolean;
  advanced: boolean;
  manualAdvance?: boolean | null;
  decidedBy?: string | null;
  decidedAt?: Date | null;
  judgeScoresBreakdown?: Record<string, number>; // judgeId -> normalized weighted score (0-100)
}

export interface RoundLiveCalculation {
  round: typeof rounds.$inferSelect;
  edition: typeof editions.$inferSelect;
  totalParticipants: number;
  assignedJudges: Array<{ id: string; name: string; email: string; submitted: boolean; submittedAt?: Date | null }>;
  submittedJudgesCount: number;
  missingJudgesCount: number;
  results: CalculatedParticipantResult[];
  hasCriticalTie: boolean;
  criticalTieMessage?: string;
  canClose: boolean;
}

/**
 * Normaliza un valor numérico a escala 0 - 100 basándose en [scaleMin, scaleMax]
 */
export function normalizeScore(value: number, scaleMin: number, scaleMax: number): number {
  if (scaleMax <= scaleMin) return 0;
  const clamped = Math.max(scaleMin, Math.min(scaleMax, value));
  return ((clamped - scaleMin) / (scaleMax - scaleMin)) * 100;
}

/**
 * Obtiene los criterios activos para una ronda (específicos de ronda o generales de la edición)
 */
export async function getCriteriaForRound(editionId: string, roundId: string, criteriaScope: 'edition' | 'round') {
  if (criteriaScope === 'round') {
    return await db.select().from(criteria).where(eq(criteria.roundId, roundId));
  }
  return await db.select().from(criteria).where(and(eq(criteria.editionId, editionId), isNull(criteria.roundId)));
}

/**
 * Obtiene los jueces asignados a una ronda (específicos de ronda o generales de la edición)
 */
export async function getJudgesForRound(editionId: string, roundId: string, judgesScope: 'edition' | 'round') {
  if (judgesScope === 'round') {
    const rj = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(roundJudges)
      .innerJoin(user, eq(roundJudges.userId, user.id))
      .where(eq(roundJudges.roundId, roundId));
    return rj;
  }

  const ej = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
    })
    .from(editionJudges)
    .innerJoin(user, eq(editionJudges.userId, user.id))
    .where(eq(editionJudges.editionId, editionId));
  return ej;
}

/**
 * Calcula en tiempo real o para cierre los puntajes de la ronda
 */
export async function calculateRoundResults(roundId: string): Promise<RoundLiveCalculation> {
  const [currentRound] = await db.select().from(rounds).where(eq(rounds.id, roundId));
  if (!currentRound) {
    throw new Error(`Ronda con id ${roundId} no encontrada`);
  }

  const [currentEdition] = await db.select().from(editions).where(eq(editions.id, currentRound.editionId));
  if (!currentEdition) {
    throw new Error(`Edición con id ${currentRound.editionId} no encontrada`);
  }

  const scaleMin = Number(currentEdition.scaleMin);
  const scaleMax = Number(currentEdition.scaleMax);
  const advanceValue = Number(currentRound.advanceValue);

  // 1. Obtener criterios de la ronda
  const roundCriteriaList = await getCriteriaForRound(
    currentEdition.id,
    currentRound.id,
    currentEdition.criteriaScope as 'edition' | 'round'
  );

  // 2. Obtener participantes de la ronda
  const roundParticipantsList = await db
    .select({
      id: participants.id,
      name: participants.name,
      code: participants.code,
      status: participants.status,
    })
    .from(roundParticipants)
    .innerJoin(participants, eq(roundParticipants.participantId, participants.id))
    .where(eq(roundParticipants.roundId, roundId));

  // 3. Obtener jueces asignados
  const assignedJudgesList = await getJudgesForRound(
    currentEdition.id,
    currentRound.id,
    currentEdition.judgesScope as 'edition' | 'round'
  );

  // 4. Obtener envíos registrados
  const submissions = await db
    .select()
    .from(judgeRoundSubmissions)
    .where(eq(judgeRoundSubmissions.roundId, roundId));

  const submittedJudgeIds = new Set(submissions.map((s) => s.judgeId));

  const assignedJudgesStatus = assignedJudgesList.map((j) => {
    const sub = submissions.find((s) => s.judgeId === j.id);
    return {
      id: j.id,
      name: j.name,
      email: j.email,
      submitted: submittedJudgeIds.has(j.id),
      submittedAt: sub ? sub.submittedAt : null,
    };
  });

  const submittedJudges = assignedJudgesStatus.filter((j) => j.submitted);
  const missingJudges = assignedJudgesStatus.filter((j) => !j.submitted);

  // Si la ronda ya está cerrada, retornar la foto fija de round_results
  if (currentRound.status === 'closed') {
    const savedResults = await db
      .select({
        participantId: roundResults.participantId,
        roundScore: roundResults.roundScore,
        cumulativeScore: roundResults.cumulativeScore,
        rank: roundResults.rank,
        tieFlag: roundResults.tieFlag,
        advanced: roundResults.advanced,
        manualAdvance: roundResults.manualAdvance,
        decidedBy: roundResults.decidedBy,
        decidedAt: roundResults.decidedAt,
        name: participants.name,
        code: participants.code,
      })
      .from(roundResults)
      .innerJoin(participants, eq(roundResults.participantId, participants.id))
      .where(eq(roundResults.roundId, roundId))
      .orderBy(asc(roundResults.rank));

    return {
      round: currentRound,
      edition: currentEdition,
      totalParticipants: roundParticipantsList.length,
      assignedJudges: assignedJudgesStatus,
      submittedJudgesCount: submittedJudges.length,
      missingJudgesCount: missingJudges.length,
      results: savedResults.map((r) => ({
        participantId: r.participantId,
        name: r.name,
        code: r.code,
        roundScore: Number(r.roundScore),
        cumulativeScore: Number(r.cumulativeScore),
        rank: r.rank,
        tieFlag: r.tieFlag,
        advanced: r.advanced,
        manualAdvance: r.manualAdvance,
        decidedBy: r.decidedBy,
        decidedAt: r.decidedAt,
      })),
      hasCriticalTie: false,
      canClose: false,
    };
  }

  // 5. Obtener calificaciones de la ronda
  const roundScores = await db.select().from(scores).where(eq(scores.roundId, roundId));

  // 6. Consultar decisiones manuales existentes para esta ronda si las hubiera
  const existingResults = await db
    .select()
    .from(roundResults)
    .where(eq(roundResults.roundId, roundId));
  const manualDecisions = new Map(existingResults.map((r) => [r.participantId, r]));

  // 7. Si hay acumulado, obtener resultados de rondas anteriores cerradas
  const previousRounds = await db
    .select()
    .from(rounds)
    .where(and(eq(rounds.editionId, currentEdition.id), eq(rounds.status, 'closed')))
    .orderBy(asc(rounds.position));

  const previousRoundScoresMap = new Map<string, number[]>(); // participantId -> array of previous roundScores
  if (currentEdition.accumulateRounds && previousRounds.length > 0) {
    const prevRoundIds = previousRounds.map((r) => r.id);
    const prevResults = await db
      .select()
      .from(roundResults)
      .where(inArray(roundResults.roundId, prevRoundIds));

    for (const pr of prevResults) {
      if (!previousRoundScoresMap.has(pr.participantId)) {
        previousRoundScoresMap.set(pr.participantId, []);
      }
      previousRoundScoresMap.get(pr.participantId)!.push(Number(pr.roundScore));
    }
  }

  // 8. Calcular el puntaje para cada participante en la ronda actual
  const computedList: Array<{
    participantId: string;
    name: string;
    code: string;
    roundScore: number;
    cumulativeScore: number;
    manualAdvance?: boolean | null;
    decidedBy?: string | null;
    decidedAt?: Date | null;
    judgeScoresBreakdown: Record<string, number>;
  }> = [];

  for (const part of roundParticipantsList) {
    const judgeScoresBreakdown: Record<string, number> = {};
    const judgeFinalScores: number[] = [];

    for (const judge of submittedJudges) {
      // Sumar criterios ponderados del juez para este participante
      let weightedSum = 0;
      let criteriaWeightSum = 0;

      for (const crit of roundCriteriaList) {
        const critWeight = Number(crit.weight);
        const scoreRow = roundScores.find(
          (s) => s.judgeId === judge.id && s.participantId === part.id && s.criterionId === crit.id
        );

        if (scoreRow) {
          const rawVal = Number(scoreRow.value);
          const normVal = normalizeScore(rawVal, scaleMin, scaleMax);
          weightedSum += normVal * (critWeight / 100);
          criteriaWeightSum += critWeight;
        }
      }

      // Si los criterios suman 100, weightedSum está en escala 0-100
      const finalJudgeScore = criteriaWeightSum > 0 ? (weightedSum / (criteriaWeightSum / 100)) : 0;
      judgeScoresBreakdown[judge.id] = Number(finalJudgeScore.toFixed(4));
      judgeFinalScores.push(finalJudgeScore);
    }

    // Puntaje de ronda según scoringMethod
    let roundScore = 0;
    if (judgeFinalScores.length > 0) {
      if (currentEdition.scoringMethod === 'sum') {
        roundScore = judgeFinalScores.reduce((acc, val) => acc + val, 0);
      } else {
        // default: 'average'
        roundScore = judgeFinalScores.reduce((acc, val) => acc + val, 0) / judgeFinalScores.length;
      }
    }

    // Puntaje acumulado
    let cumulativeScore = roundScore;
    if (currentEdition.accumulateRounds) {
      const prevScores = previousRoundScoresMap.get(part.id) || [];
      const allRoundScores = [...prevScores, roundScore];
      cumulativeScore = allRoundScores.reduce((acc, val) => acc + val, 0) / allRoundScores.length;
    }

    const existingDecision = manualDecisions.get(part.id);

    computedList.push({
      participantId: part.id,
      name: part.name,
      code: part.code,
      roundScore: Number(roundScore.toFixed(4)),
      cumulativeScore: Number(cumulativeScore.toFixed(4)),
      manualAdvance: existingDecision ? existingDecision.manualAdvance : null,
      decidedBy: existingDecision ? existingDecision.decidedBy : null,
      decidedAt: existingDecision ? existingDecision.decidedAt : null,
      judgeScoresBreakdown,
    });
  }

  // 9. Ordenar descendentemente por cumulativeScore
  computedList.sort((a, b) => b.cumulativeScore - a.cumulativeScore);

  // 10. Asignar Ranks y flags de empate
  const finalResults: CalculatedParticipantResult[] = [];
  const scoreCounts = new Map<number, number>();

  for (const item of computedList) {
    scoreCounts.set(item.cumulativeScore, (scoreCounts.get(item.cumulativeScore) || 0) + 1);
  }

  let currentRank = 1;
  for (let i = 0; i < computedList.length; i++) {
    const item = computedList[i];
    if (i > 0 && item.cumulativeScore < computedList[i - 1].cumulativeScore) {
      currentRank = i + 1;
    }

    const hasTie = (scoreCounts.get(item.cumulativeScore) || 0) > 1;

    finalResults.push({
      participantId: item.participantId,
      name: item.name,
      code: item.code,
      roundScore: item.roundScore,
      cumulativeScore: item.cumulativeScore,
      rank: currentRank,
      tieFlag: hasTie,
      advanced: false, // se calcula en el paso siguiente
      manualAdvance: item.manualAdvance,
      decidedBy: item.decidedBy,
      decidedAt: item.decidedAt,
      judgeScoresBreakdown: item.judgeScoresBreakdown,
    });
  }

  // 11. Determinar avance según advanceMode
  let hasCriticalTie = false;
  let criticalTieMessage: string | undefined;

  // Comprobar si es la última ronda de la edición
  const allEditionRounds = await db
    .select()
    .from(rounds)
    .where(eq(rounds.editionId, currentEdition.id))
    .orderBy(asc(rounds.position));
  const isFinalRound = allEditionRounds.length > 0 && allEditionRounds[allEditionRounds.length - 1].id === currentRound.id;

  if (currentRound.advanceMode === 'top_n') {
    const n = Math.floor(advanceValue);

    // Si hay empate en la frontera de corte (ej. puesto n y n+1 tienen el mismo score)
    if (finalResults.length > n && n > 0) {
      const cutScore = finalResults[n - 1].cumulativeScore;
      const nextScore = finalResults[n].cumulativeScore;

      if (cutScore === nextScore) {
        // Los participantes con cutScore están involucrados en un empate en la frontera de corte
        const tiedAtCut = finalResults.filter((r) => r.cumulativeScore === cutScore);
        const resolvedCount = tiedAtCut.filter((r) => r.manualAdvance === true).length;
        const strictlyAboveCut = finalResults.filter((r) => r.cumulativeScore > cutScore).length;

        // Si el total que avanza (estrictamente arriba + resueltos manualmente) no es exactamente n
        if (strictlyAboveCut + resolvedCount !== n) {
          hasCriticalTie = true;
          criticalTieMessage = `Existe un empate crítico en el puesto de corte (${n}). Se requiere selección manual para desempatar quién avanza.`;
        }
      }
    }

    // Asignar campo advanced
    for (let i = 0; i < finalResults.length; i++) {
      const r = finalResults[i];
      if (r.manualAdvance !== null && r.manualAdvance !== undefined) {
        r.advanced = r.manualAdvance;
      } else {
        r.advanced = i < n;
      }
    }
  } else {
    // advanceMode === 'min_score'
    for (const r of finalResults) {
      if (r.manualAdvance !== null && r.manualAdvance !== undefined) {
        r.advanced = r.manualAdvance;
      } else {
        r.advanced = r.cumulativeScore >= advanceValue;
      }
    }
  }

  // Si es la ronda final, verificar empate en el 1er lugar
  if (isFinalRound && finalResults.length > 1) {
    const firstScore = finalResults[0].cumulativeScore;
    const tiedForFirst = finalResults.filter((r) => r.cumulativeScore === firstScore);

    if (tiedForFirst.length > 1) {
      const winnerDecided = tiedForFirst.some((r) => r.manualAdvance === true);
      if (!winnerDecided) {
        hasCriticalTie = true;
        criticalTieMessage = `Existe un empate crítico en el 1.º lugar de la Ronda Final. El administrador debe elegir manualmente a la ganadora.`;
      }
    }
  }

  const canClose = !hasCriticalTie && (submittedJudges.length > 0 || assignedJudgesList.length === 0);

  return {
    round: currentRound,
    edition: currentEdition,
    totalParticipants: roundParticipantsList.length,
    assignedJudges: assignedJudgesStatus,
    submittedJudgesCount: submittedJudges.length,
    missingJudgesCount: missingJudges.length,
    results: finalResults,
    hasCriticalTie,
    criticalTieMessage,
    canClose,
  };
}

/**
 * Cierra formalmente la ronda, congela los resultados en round_results,
 * avanza participantes a la siguiente ronda o declara ganadores.
 */
export async function closeRound(roundId: string, adminUserId?: string) {
  const calc = await calculateRoundResults(roundId);

  if (calc.hasCriticalTie) {
    throw new Error(calc.criticalTieMessage || 'No se puede cerrar la ronda: existe un empate crítico sin resolver.');
  }

  if (calc.round.status === 'closed') {
    throw new Error('La ronda ya se encuentra cerrada.');
  }

  // 1. Guardar resultados congelados en round_results
  await db.transaction(async (tx) => {
    // Eliminar previos borradores si hubiera
    await tx.delete(roundResults).where(eq(roundResults.roundId, roundId));

    for (const res of calc.results) {
      await tx.insert(roundResults).values({
        roundId,
        participantId: res.participantId,
        roundScore: res.roundScore.toString(),
        cumulativeScore: res.cumulativeScore.toString(),
        rank: res.rank,
        tieFlag: res.tieFlag,
        advanced: res.advanced,
        manualAdvance: res.manualAdvance,
        decidedBy: res.decidedBy || (res.manualAdvance !== null ? adminUserId : null),
        decidedAt: res.decidedAt || (res.manualAdvance !== null ? new Date() : null),
      });
    }

    // 2. Actualizar estado de la ronda
    await tx
      .update(rounds)
      .set({
        status: 'closed',
        closedAt: new Date(),
        closedWithMissingJudges: calc.missingJudgesCount > 0,
        updatedAt: new Date(),
      })
      .where(eq(rounds.id, roundId));

    // 3. Buscar si existe una siguiente ronda
    const allRounds = await tx
      .select()
      .from(rounds)
      .where(eq(rounds.editionId, calc.edition.id))
      .orderBy(asc(rounds.position));

    const currentIndex = allRounds.findIndex((r) => r.id === roundId);
    const nextRound = currentIndex >= 0 && currentIndex < allRounds.length - 1 ? allRounds[currentIndex + 1] : null;

    if (nextRound) {
      // Insertar participantes clasificados en la siguiente ronda
      const advancingParticipantIds = calc.results.filter((r) => r.advanced).map((r) => r.participantId);

      for (const partId of advancingParticipantIds) {
        await tx
          .insert(roundParticipants)
          .values({
            roundId: nextRound.id,
            participantId: partId,
          })
          .onConflictDoNothing();
      }

      // Marcar eliminados en la tabla de participantes
      const eliminatedIds = calc.results.filter((r) => !r.advanced).map((r) => r.participantId);
      if (eliminatedIds.length > 0) {
        await tx
          .update(participants)
          .set({ status: 'eliminated', updatedAt: new Date() })
          .where(and(eq(participants.editionId, calc.edition.id), inArray(participants.id, eliminatedIds)));
      }
    } else {
      // Era la última ronda: determinar ganadores
      for (const res of calc.results) {
        const isWinner = res.rank === 1 && (res.manualAdvance === true || !calc.hasCriticalTie);
        await tx
          .update(participants)
          .set({
            status: isWinner ? 'winner' : 'eliminated',
            updatedAt: new Date(),
          })
          .where(eq(participants.id, res.participantId));
      }
    }
  });

  return await calculateRoundResults(roundId);
}
