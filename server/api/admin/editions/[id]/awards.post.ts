import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { awards, awardCriteria, editions } from '~~/server/db/schema';
import { requireAdmin } from '~~/server/utils/session';

const schema = z.object({
  name: z.string().min(1, 'El nombre del premio es obligatorio'),
  type: z.enum(['criterion', 'metric', 'manual']),
  metricLabel: z.string().optional().nullable(),
  winnersCount: z.number().int().min(1).default(1),
  criterionIds: z.array(z.string()).optional(),
});

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  const [edition] = await db.select().from(editions).where(eq(editions.id, id));
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edición no encontrada' });

  const body = await readValidatedBody(event, (b) => schema.parse(b));

  const result = await db.transaction(async (tx) => {
    const [newAward] = await tx
      .insert(awards)
      .values({
        editionId: id,
        name: body.name,
        type: body.type,
        metricLabel: body.type === 'metric' ? (body.metricLabel || 'Puntos') : null,
        winnersCount: body.winnersCount,
      })
      .returning();

    if (body.type === 'criterion' && body.criterionIds && body.criterionIds.length > 0) {
      for (const critId of body.criterionIds) {
        await tx
          .insert(awardCriteria)
          .values({
            awardId: newAward.id,
            criterionId: critId,
          })
          .onConflictDoNothing();
      }
    }

    return newAward;
  });

  return result;
});
