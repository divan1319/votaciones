import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '~~/server/db';
import { roundResults, rounds } from '~~/server/db/schema';
import { calculateRoundResults } from '~~/server/services/scoring';
import { requireAdmin } from '~~/server/utils/session';

const schema = z.object({
  participantId: z.string(),
  manualAdvance: z.boolean(),
});

export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  const [round] = await db.select().from(rounds).where(eq(rounds.id, id));
  if (!round) throw createError({ statusCode: 404, statusMessage: 'Ronda no encontrada' });

  if (round.status === 'closed') {
    throw createError({
      statusCode: 400,
      statusMessage: 'No se puede modificar una ronda que ya está cerrada',
    });
  }

  const body = await readValidatedBody(event, (b) => schema.parse(b));

  // Obtener cálculo preliminar para tener los scores actuales
  const calc = await calculateRoundResults(id);
  const partResult = calc.results.find((r) => r.participantId === body.participantId);
  if (!partResult) {
    throw createError({ statusCode: 404, statusMessage: 'Participante no encontrado en esta ronda' });
  }

  // Insertar o actualizar en round_results la decisión del admin
  await db
    .insert(roundResults)
    .values({
      roundId: id,
      participantId: body.participantId,
      roundScore: partResult.roundScore.toString(),
      cumulativeScore: partResult.cumulativeScore.toString(),
      rank: partResult.rank,
      tieFlag: partResult.tieFlag,
      advanced: body.manualAdvance,
      manualAdvance: body.manualAdvance,
      decidedBy: session.user.id,
      decidedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [roundResults.roundId, roundResults.participantId],
      set: {
        manualAdvance: body.manualAdvance,
        advanced: body.manualAdvance,
        decidedBy: session.user.id,
        decidedAt: new Date(),
      },
    });

  return await calculateRoundResults(id);
});
