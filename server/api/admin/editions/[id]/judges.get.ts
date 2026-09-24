import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { editions, editionJudges, roundJudges, user } from '~~/server/db/schema';
import { requireAdmin } from '~~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  const query = getQuery(event);
  const roundId = query.roundId as string | undefined;

  const [edition] = await db.select().from(editions).where(eq(editions.id, id));
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edición no encontrada' });

  if (roundId && edition.judgesScope === 'round') {
    const list = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      })
      .from(roundJudges)
      .innerJoin(user, eq(roundJudges.userId, user.id))
      .where(eq(roundJudges.roundId, roundId));
    return list;
  }

  const list = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(editionJudges)
    .innerJoin(user, eq(editionJudges.userId, user.id))
    .where(eq(editionJudges.editionId, id));

  return list;
});
