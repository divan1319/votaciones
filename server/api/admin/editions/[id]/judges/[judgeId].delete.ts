import { eq, and } from 'drizzle-orm';
import { db } from '~~/server/db';
import { editions, editionJudges, roundJudges, judgeRoundSubmissions } from '~~/server/db/schema';
import { requireAdmin } from '~~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const editionId = getRouterParam(event, 'id');
  const judgeId = getRouterParam(event, 'judgeId');
  if (!editionId || !judgeId) throw createError({ statusCode: 400, statusMessage: 'Parámetros requeridos' });

  // Verificar si el juez ya envió calificaciones
  const [submission] = await db
    .select()
    .from(judgeRoundSubmissions)
    .where(eq(judgeRoundSubmissions.judgeId, judgeId))
    .limit(1);

  if (submission) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No se puede desvincular a un juez que ya ha enviado calificaciones',
    });
  }

  await db
    .delete(editionJudges)
    .where(and(eq(editionJudges.editionId, editionId), eq(editionJudges.userId, judgeId)));

  return { success: true };
});
