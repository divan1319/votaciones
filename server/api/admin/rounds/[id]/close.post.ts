import { closeRound } from '~~/server/services/scoring';
import { requireAdmin } from '~~/server/utils/session';

export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  try {
    const result = await closeRound(id, session.user.id);
    return result;
  } catch (err: any) {
    throw createError({
      statusCode: 400,
      statusMessage: err.message || 'Error al cerrar la ronda',
    });
  }
});
