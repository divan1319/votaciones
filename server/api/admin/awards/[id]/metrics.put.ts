import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '~~/server/db';
import { awards, awardMetrics } from '~~/server/db/schema';
import { requireAdmin } from '~~/server/utils/session';

const schema = z.object({
  metrics: z.array(
    z.object({
      participantId: z.string(),
      value: z.number(),
    })
  ),
});

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const awardId = getRouterParam(event, 'id');
  if (!awardId) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  const [award] = await db.select().from(awards).where(eq(awards.id, awardId));
  if (!award) throw createError({ statusCode: 404, statusMessage: 'Premio no encontrado' });

  if (award.type !== 'metric') {
    throw createError({ statusCode: 400, statusMessage: 'Solo se pueden cargar métricas en premios de tipo metric' });
  }

  const body = await readValidatedBody(event, (b) => schema.parse(b));

  await db.transaction(async (tx) => {
    for (const item of body.metrics) {
      await tx
        .insert(awardMetrics)
        .values({
          awardId,
          participantId: item.participantId,
          value: item.value.toString(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [awardMetrics.awardId, awardMetrics.participantId],
          set: {
            value: item.value.toString(),
            updatedAt: new Date(),
          },
        });
    }
  });

  return { success: true };
});
