import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { editions } from '~~/server/db/schema';
import { requireAdmin } from '~~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  const [updated] = await db
    .update(editions)
    .set({ status: 'active', updatedAt: new Date() })
    .where(eq(editions.id, id))
    .returning();

  return updated;
});
