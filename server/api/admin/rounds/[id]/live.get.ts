import { calculateRoundResults } from '~~/server/services/scoring';
import { requireAdmin } from '~~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  return await calculateRoundResults(id);
});
