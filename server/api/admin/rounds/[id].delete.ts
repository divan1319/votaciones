import { eq, and, asc } from 'drizzle-orm';
import { db } from '~~/server/db';
import { rounds, roundParticipants, scores } from '~~/server/db/schema';
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
      statusMessage: 'Solo se pueden eliminar rondas en estado pendiente',
    });
  }

  // Verificar si hay calificaciones
  const [scoreFound] = await db.select().from(scores).where(eq(scores.roundId, id)).limit(1);
  if (scoreFound) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No se puede eliminar una ronda que ya tiene calificaciones registradas',
    });
  }

  await db.transaction(async (tx) => {
    // Eliminar la ronda (en cascada elimina roundParticipants, roundJudges, criteria ligados)
    await tx.delete(rounds).where(eq(rounds.id, id));

    // Renumerar las rondas restantes de la edición
    const remaining = await tx
      .select()
      .from(rounds)
      .where(eq(rounds.editionId, round.editionId))
      .orderBy(asc(rounds.position));

    for (let i = 0; i < remaining.length; i++) {
      await tx
        .update(rounds)
        .set({ position: i + 1 })
        .where(eq(rounds.id, remaining[i].id));
    }
  });

  return { success: true };
});
