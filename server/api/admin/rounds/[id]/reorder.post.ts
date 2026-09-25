import { z } from 'zod';
import { eq, and, asc } from 'drizzle-orm';
import { db } from '~~/server/db';
import { rounds, editions } from '~~/server/db/schema';
import { requireAdmin } from '~~/server/utils/session';

const schema = z.object({
  direction: z.enum(['up', 'down']),
});

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  const [currentRound] = await db.select().from(rounds).where(eq(rounds.id, id));
  if (!currentRound) throw createError({ statusCode: 404, statusMessage: 'Ronda no encontrada' });

  if (currentRound.status !== 'pending') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Solo se puede reordenar rondas en estado pendiente',
    });
  }

  const body = await readValidatedBody(event, (b) => schema.parse(b));

  const allRounds = await db
    .select()
    .from(rounds)
    .where(eq(rounds.editionId, currentRound.editionId))
    .orderBy(asc(rounds.position));

  const currentIndex = allRounds.findIndex((r) => r.id === id);
  if (currentIndex === -1) throw createError({ statusCode: 404, statusMessage: 'Ronda no encontrada' });

  const targetIndex = body.direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= allRounds.length) {
    return { success: true, message: 'La ronda ya está en el extremo' };
  }

  const targetRound = allRounds[targetIndex];
  if (!targetRound) {
    return { success: true, message: 'La ronda ya está en el extremo' };
  }
  if (targetRound.status !== 'pending') {
    throw createError({
      statusCode: 400,
      statusMessage: 'No se puede intercambiar con una ronda que ya fue iniciada o cerrada',
    });
  }

  // Intercambiar posiciones
  await db.transaction(async (tx) => {
    // Usar una posición temporal negativa para evitar cualquier conflicto potencial
    await tx.update(rounds).set({ position: -999 }).where(eq(rounds.id, currentRound.id));
    await tx.update(rounds).set({ position: currentRound.position }).where(eq(rounds.id, targetRound.id));
    await tx.update(rounds).set({ position: targetRound.position }).where(eq(rounds.id, currentRound.id));
  });

  return { success: true };
});
