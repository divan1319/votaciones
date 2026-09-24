import { eq, and, isNull } from 'drizzle-orm';
import { db } from '~~/server/db';
import { criteria, editions } from '~~/server/db/schema';
import { requireAdmin } from '~~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  const query = getQuery(event);
  const roundId = query.roundId as string | undefined;

  const [edition] = await db.select().from(editions).where(eq(editions.id, id));
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edición no encontrada' });

  let criteriaList;
  if (roundId) {
    criteriaList = await db.select().from(criteria).where(eq(criteria.roundId, roundId));
  } else if (edition.criteriaScope === 'round') {
    criteriaList = await db.select().from(criteria).where(eq(criteria.editionId, id));
  } else {
    criteriaList = await db
      .select()
      .from(criteria)
      .where(and(eq(criteria.editionId, id), isNull(criteria.roundId)));
  }

  const totalWeight = criteriaList.reduce((acc, c) => acc + Number(c.weight), 0);

  return {
    criteria: criteriaList,
    totalWeight: Number(totalWeight.toFixed(2)),
    isValidSum: Math.abs(totalWeight - 100) < 0.001,
  };
});
