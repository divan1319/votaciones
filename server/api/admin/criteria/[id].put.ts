import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { criteria, scores } from '~~/server/db/schema';
import { requireAdmin } from '~~/server/utils/session';

const schema = z.object({
  name: z.string().min(1, 'El nombre del criterio es obligatorio').optional(),
  weight: z.number().min(0.01, 'El peso debe ser mayor a 0').max(100, 'El peso no puede exceder 100').optional(),
  roundId: z.string().nullable().optional(),
});

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  const [existingCriterion] = await db.select().from(criteria).where(eq(criteria.id, id));
  if (!existingCriterion) throw createError({ statusCode: 404, statusMessage: 'Criterio no encontrado' });

  // Verificar si hay calificaciones que dependan de este criterio
  const [scoreFound] = await db.select().from(scores).where(eq(scores.criterionId, id)).limit(1);
  if (scoreFound) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No se puede modificar un criterio que ya tiene calificaciones registradas',
    });
  }

  const body = await readValidatedBody(event, (b) => schema.parse(b));

  const [updated] = await db
    .update(criteria)
    .set({
      name: body.name ?? existingCriterion.name,
      weight: body.weight !== undefined ? body.weight.toString() : existingCriterion.weight,
      roundId: body.roundId !== undefined ? body.roundId : existingCriterion.roundId,
      updatedAt: new Date(),
    })
    .where(eq(criteria.id, id))
    .returning();

  return updated;
});
