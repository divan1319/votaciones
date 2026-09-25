import { z } from 'zod';
import { eq, inArray } from 'drizzle-orm';
import { db } from '~~/server/db';
import { criteria, editions, rounds, scores } from '~~/server/db/schema';
import { requireAdmin } from '~~/server/utils/session';

const schema = z.object({
  name: z.string().min(1, 'El nombre del criterio es obligatorio'),
  weight: z.number().min(0.01, 'El peso debe ser mayor a 0').max(100, 'El peso no puede exceder 100'),
  roundId: z.string().optional().nullable(),
});

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  const [edition] = await db.select().from(editions).where(eq(editions.id, id));
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edición no encontrada' });

  // Verificar si hay calificaciones registradas en rondas involucradas
  const editionRounds = await db.select({ id: rounds.id }).from(rounds).where(eq(rounds.editionId, id));
  const roundIds = editionRounds.map((r) => r.id);
  if (roundIds.length > 0) {
    const [scoreFound] = await db.select().from(scores).where(inArray(scores.roundId, roundIds)).limit(1);
    if (scoreFound) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No se pueden modificar criterios una vez que existen calificaciones registradas',
      });
    }
  }

  const body = await readValidatedBody(event, (b) => schema.parse(b));

  if (edition.criteriaScope === 'round' && !body.roundId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El certamen está configurado con criterios por ronda. Debe seleccionar a qué ronda pertenece este criterio.',
    });
  }

  const [newCrit] = await db
    .insert(criteria)
    .values({
      editionId: id,
      roundId: edition.criteriaScope === 'round' ? body.roundId : null,
      name: body.name,
      weight: body.weight.toString(),
    })
    .returning();

  return newCrit;
});
