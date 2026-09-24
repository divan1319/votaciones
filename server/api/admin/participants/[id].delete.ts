import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { participants, scores } from '~~/server/db/schema';
import { requireAdmin } from '~~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  // Verificar si tiene scores
  const [hasScore] = await db.select().from(scores).where(eq(scores.participantId, id)).limit(1);
  if (hasScore) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No se puede eliminar un participante que ya tiene calificaciones registradas',
    });
  }

  await db.delete(participants).where(eq(participants.id, id));
  return { success: true };
});
