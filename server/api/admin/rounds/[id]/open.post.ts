import { eq, and } from 'drizzle-orm';
import { db } from '~~/server/db';
import { rounds, editions, roundParticipants, participants } from '~~/server/db/schema';
import { getCriteriaForRound, getJudgesForRound } from '~~/server/services/scoring';
import { requireAdmin } from '~~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  const [round] = await db.select().from(rounds).where(eq(rounds.id, id));
  if (!round) throw createError({ statusCode: 404, statusMessage: 'Ronda no encontrada' });

  if (round.status !== 'pending') {
    throw createError({
      statusCode: 400,
      statusMessage: `No se puede abrir una ronda en estado "${round.status}"`,
    });
  }

  const [edition] = await db.select().from(editions).where(eq(editions.id, round.editionId));
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edición no encontrada' });

  // 1. Validar escala
  if (Number(edition.scaleMax) <= Number(edition.scaleMin)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La escala de calificación no es válida: scale_max debe ser mayor que scale_min',
    });
  }

  // 2. Validar Criterios (suma = 100)
  const roundCriteria = await getCriteriaForRound(
    edition.id,
    round.id,
    edition.criteriaScope as 'edition' | 'round'
  );
  if (roundCriteria.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La ronda no tiene criterios de calificación configurados',
    });
  }

  const totalWeight = roundCriteria.reduce((acc, c) => acc + Number(c.weight), 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    throw createError({
      statusCode: 400,
      statusMessage: `Los criterios deben sumar exactamente 100%. Suma actual: ${totalWeight.toFixed(2)}%`,
    });
  }

  // 3. Validar Jueces
  const roundJudgesList = await getJudgesForRound(
    edition.id,
    round.id,
    edition.judgesScope as 'edition' | 'round'
  );
  if (roundJudgesList.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Debe haber al menos un juez asignado para abrir la ronda',
    });
  }

  // 4. Validar Participantes
  let currentRoundParts = await db
    .select()
    .from(roundParticipants)
    .where(eq(roundParticipants.roundId, round.id));

  if (currentRoundParts.length === 0 && round.position === 1) {
    // Es la primera ronda: copiar todos los participantes activos de la edición
    const editionParts = await db
      .select()
      .from(participants)
      .where(and(eq(participants.editionId, edition.id), eq(participants.status, 'active')));

    for (const ep of editionParts) {
      await db
        .insert(roundParticipants)
        .values({
          roundId: round.id,
          participantId: ep.id,
        })
        .onConflictDoNothing();
    }

    currentRoundParts = await db
      .select()
      .from(roundParticipants)
      .where(eq(roundParticipants.roundId, round.id));
  }

  if (currentRoundParts.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No hay participantes registrados para esta ronda',
    });
  }

  // 5. Abrir la ronda
  const [updatedRound] = await db
    .update(rounds)
    .set({
      status: 'open',
      updatedAt: new Date(),
    })
    .where(eq(rounds.id, id))
    .returning();

  return updatedRound;
});
