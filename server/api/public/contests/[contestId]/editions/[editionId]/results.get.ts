import { eq, and, desc, asc } from 'drizzle-orm';
import { db } from '~~/server/db';
import { contests, editions, rounds, participants, roundResults } from '~~/server/db/schema';
import { calculateSpecialAwards } from '~~/server/services/awards';

export default defineEventHandler(async (event) => {
  const contestId = getRouterParam(event, 'contestId');
  const editionId = getRouterParam(event, 'editionId');

  if (!contestId || !editionId) {
    throw createError({ statusCode: 400, statusMessage: 'Parámetros inválidos' });
  }

  // 1. Obtener concurso y edición
  const [contest] = await db.select().from(contests).where(eq(contests.id, contestId));
  if (!contest) throw createError({ statusCode: 404, statusMessage: 'Concurso no encontrado' });

  const [edition] = await db
    .select()
    .from(editions)
    .where(and(eq(editions.id, editionId), eq(editions.contestId, contestId)));
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edición no encontrada' });

  // 2. Comprobar permisos de visibilidad pública
  if (edition.status !== 'finished' || !edition.resultsPublic) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Los resultados oficiales de esta edición aún no han sido publicados.',
    });
  }

  // 3. Obtener la ronda final (la última ronda de la edición)
  const [finalRound] = await db
    .select()
    .from(rounds)
    .where(eq(rounds.editionId, editionId))
    .orderBy(desc(rounds.position))
    .limit(1);

  if (!finalRound) {
    throw createError({ statusCode: 404, statusMessage: 'No se encontraron rondas para esta edición' });
  }

  // 4. Obtener resultados de la ronda final
  const finalResults = await db
    .select({
      participantId: roundResults.participantId,
      rank: roundResults.rank,
      name: participants.name,
      code: participants.code,
      status: participants.status,
    })
    .from(roundResults)
    .innerJoin(participants, eq(roundResults.participantId, participants.id))
    .where(eq(roundResults.roundId, finalRound.id))
    .orderBy(asc(roundResults.rank));

  // Ganadora: la participante con rank = 1 (o status = 'winner')
  const winner = finalResults.find((r) => r.rank === 1) || null;
  // Finalistas: los siguientes puestos
  const finalists = finalResults.filter((r) => r.rank > 1 && r.rank <= 5);

  // 5. Premios especiales oficiales
  const awardsData = await calculateSpecialAwards(editionId);
  const specialAwards = awardsData.map((a) => {
    return {
      awardId: a.award.id,
      awardName: a.award.name,
      winners: a.winners.map((w) => ({
        name: w.name,
        code: w.code,
      })),
    };
  });

  // Retornar EXCLUSIVAMENTE campos seguros sin puntajes por juez ni detalles internos
  return {
    contest: {
      id: contest.id,
      name: contest.name,
      description: contest.description,
    },
    edition: {
      id: edition.id,
      name: edition.name,
      finishedAt: edition.finishedAt,
    },
    winner: winner
      ? {
          name: winner.name,
          code: winner.code,
        }
      : null,
    finalists: finalists.map((f) => ({
      rank: f.rank,
      name: f.name,
      code: f.code,
    })),
    specialAwards,
  };
});
