import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { criteria, scores } from '~~/server/db/schema';
import { requireAdmin } from '~~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  const [hasScores] = await db.select().from(scores).where(eq(scores.criterionId, id)).limit(1);
  if (hasScores) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No se puede eliminar un criterio que ya tiene calificaciones registradas',
    });
  }

  await db.delete(criteria).where(eq(criteria.id, id));
  return { success: true };
});
