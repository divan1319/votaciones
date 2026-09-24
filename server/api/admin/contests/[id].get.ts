import { eq, desc } from 'drizzle-orm';
import { db } from '~~/server/db';
import { contests, editions } from '~~/server/db/schema';
import { requireAdmin } from '~~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  const [contest] = await db.select().from(contests).where(eq(contests.id, id));
  if (!contest) throw createError({ statusCode: 404, statusMessage: 'Concurso no encontrado' });

  const contestEditions = await db
    .select()
    .from(editions)
    .where(eq(editions.contestId, id))
    .orderBy(desc(editions.createdAt));

  return {
    ...contest,
    editions: contestEditions,
  };
});
