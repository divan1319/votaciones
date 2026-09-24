import { eq, and } from 'drizzle-orm';
import { db } from '~~/server/db';
import { rounds, editions, roundParticipants, scores, judgeRoundSubmissions } from '~~/server/db/schema';
import { getCriteriaForRound } from '~~/server/services/scoring';
import { requireJudge } from '~~/server/utils/session';

export default defineEventHandler(async (event) => {
  const session = await requireJudge(event);
  const judgeId = session.user.id;
  const roundId = getRouterParam(event, 'id');
  if (!roundId) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  // 1. REGLA DE INMUTABILIDAD ESTRICTA: Rechazar si ya fue enviada
  const [existingSubmission] = await db
    .select()
    .from(judgeRoundSubmissions)
    .where(and(eq(judgeRoundSubmissions.roundId, roundId), eq(judgeRoundSubmissions.judgeId, judgeId)))
    .limit(1);

  if (existingSubmission) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Inmutabilidad: Tus calificaciones ya fueron enviadas y están bloqueadas definitivamente.',
    });
  }

  // 2. Verificar estado de la ronda
  const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId));
  if (!round) throw createError({ statusCode: 404, statusMessage: 'Ronda no encontrada' });
  if (round.status !== 'open') {
    throw createError({
      statusCode: 400,
      statusMessage: `No se puede enviar calificaciones: la ronda se encuentra en estado "${round.status}".`,
    });
  }

  const [edition] = await db.select().from(editions).where(eq(editions.id, round.editionId));
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edición no encontrada' });

  // 3. Obtener participantes y criterios requeridos
  const roundParts = await db
    .select({ participantId: roundParticipants.participantId })
    .from(roundParticipants)
    .where(eq(roundParticipants.roundId, roundId));

  const roundCriteria = await getCriteriaForRound(
    edition.id,
    round.id,
    edition.criteriaScope as 'edition' | 'round'
  );

  const totalRequired = roundParts.length * roundCriteria.length;

  // 4. Obtener las calificaciones guardadas por este juez
  const judgeScores = await db
    .select()
    .from(scores)
    .where(and(eq(scores.roundId, roundId), eq(scores.judgeId, judgeId)));

  // 5. REGLA DE EQUIDAD (Fairness Rule):
  // El juez solo puede enviar si calificó a TODOS los participantes en TODOS los criterios.
  const scoreMap = new Set(judgeScores.map((s) => `${s.participantId}_${s.criterionId}`));

  let missingCount = 0;
  for (const part of roundParts) {
    for (const crit of roundCriteria) {
      if (!scoreMap.has(`${part.participantId}_${crit.id}`)) {
        missingCount++;
      }
    }
  }

  if (missingCount > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Equidad en la votación: Faltan ${missingCount} calificaciones por asignar. Para garantizar la justicia en el resultado, debes calificar a todos los participantes en todos los criterios antes de enviar.`,
    });
  }

  // 6. Registrar el envío definitivo
  const [submission] = await db
    .insert(judgeRoundSubmissions)
    .values({
      roundId,
      judgeId,
      submittedAt: new Date(),
    })
    .returning();

  return {
    success: true,
    submittedAt: submission.submittedAt,
    message: 'Tus calificaciones han sido enviadas y aseguradas con éxito.',
  };
});
