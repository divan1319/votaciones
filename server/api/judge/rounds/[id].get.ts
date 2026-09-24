import { eq, and, asc } from 'drizzle-orm';
import { db } from '~~/server/db';
import { rounds, editions, contests, roundParticipants, participants, criteria, judgeRoundSubmissions } from '~~/server/db/schema';
import { getCriteriaForRound } from '~~/server/services/scoring';
import { requireJudge } from '~~/server/utils/session';

export default defineEventHandler(async (event) => {
  const session = await requireJudge(event);
  const judgeId = session.user.id;
  const roundId = getRouterParam(event, 'id');
  if (!roundId) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId));
  if (!round) throw createError({ statusCode: 404, statusMessage: 'Ronda no encontrada' });

  const [edition] = await db.select().from(editions).where(eq(editions.id, round.editionId));
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edición no encontrada' });

  const [contest] = await db.select().from(contests).where(eq(contests.id, edition.contestId));

  // Verificar si ya envió calificaciones
  const [submission] = await db
    .select()
    .from(judgeRoundSubmissions)
    .where(and(eq(judgeRoundSubmissions.roundId, roundId), eq(judgeRoundSubmissions.judgeId, judgeId)))
    .limit(1);

  // Obtener criterios de la ronda
  const roundCriteria = await getCriteriaForRound(
    edition.id,
    round.id,
    edition.criteriaScope as 'edition' | 'round'
  );

  // Obtener participantes de la ronda
  const roundParts = await db
    .select({
      id: participants.id,
      name: participants.name,
      code: participants.code,
    })
    .from(roundParticipants)
    .innerJoin(participants, eq(roundParticipants.participantId, participants.id))
    .where(eq(roundParticipants.roundId, roundId))
    .orderBy(asc(participants.code));

  return {
    round: {
      id: round.id,
      name: round.name,
      position: round.position,
      status: round.status,
    },
    edition: {
      id: edition.id,
      name: edition.name,
      scaleMin: Number(edition.scaleMin),
      scaleMax: Number(edition.scaleMax),
      scoringMethod: edition.scoringMethod,
    },
    contest: {
      id: contest.id,
      name: contest.name,
    },
    criteria: roundCriteria.map((c) => ({
      id: c.id,
      name: c.name,
      weight: Number(c.weight),
    })),
    participants: roundParts,
    isSubmitted: !!submission,
    submittedAt: submission ? submission.submittedAt : null,
  };
});
