import { eq, asc } from 'drizzle-orm';
import { db } from '~~/server/db';
import { participants } from '~~/server/db/schema';
import { requireAdmin } from '~~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  return await db
    .select()
    .from(participants)
    .where(eq(participants.editionId, id))
    .orderBy(asc(participants.code));
});
